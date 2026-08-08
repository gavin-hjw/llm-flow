import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import {
  hasVendoredQmd,
  listVendorGgufModels,
  userQmdModelsDir,
  vendorBunBin,
  vendorModelsDir,
  vendorQmdBin,
} from './paths.js';
import { logger } from '../utils/logger.js';

export interface QmdRunResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  status: number | null;
  timedOut?: boolean;
}

export interface QmdRunOptions {
  /** Kill the process after this many ms (spawnSync timeout). */
  timeout?: number;
}

/** Default timeout for `qmd embed` during init (model load can be slow). */
export const QMD_EMBED_TIMEOUT_MS = 10 * 60 * 1000;

/** Resolve qmd launcher: prefer vendored copy, else PATH */
export function resolveQmdCommand(): { command: string; argsPrefix: string[] } | null {
  if (hasVendoredQmd()) {
    return { command: process.execPath, argsPrefix: [vendorQmdBin()] };
  }
  const probe = spawnSync('qmd', ['--version'], {
    encoding: 'utf-8',
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (probe.status === 0) {
    return { command: 'qmd', argsPrefix: [] };
  }
  return null;
}

function qmdEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  const pathParts: string[] = [];
  // Ensure `node` resolves when qmd / native tools spawn children
  pathParts.push(path.dirname(process.execPath));
  const bun = vendorBunBin();
  if (bun) {
    pathParts.push(path.dirname(bun));
    env.BUN_INSTALL = path.resolve(path.dirname(bun), '..', '..');
  }
  env.PATH = `${pathParts.join(path.delimiter)}${path.delimiter}${env.PATH || ''}`;
  return env;
}

export function runQmd(args: string[], cwd?: string, options: QmdRunOptions = {}): QmdRunResult {
  const resolved = resolveQmdCommand();
  if (!resolved) {
    return { ok: false, stdout: '', stderr: 'qmd not found (vendor missing and not on PATH)', status: null };
  }
  const r = spawnSync(resolved.command, [...resolved.argsPrefix, ...args], {
    cwd,
    encoding: 'utf-8',
    shell: resolved.command === 'qmd',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: qmdEnv(),
    timeout: options.timeout,
    killSignal: 'SIGTERM',
  });
  if (r.error && (r.error as NodeJS.ErrnoException).code === 'ETIMEDOUT') {
    return {
      ok: false,
      stdout: (r.stdout || '').toString(),
      stderr: `qmd timed out after ${options.timeout}ms`,
      status: r.status,
      timedOut: true,
    };
  }
  return {
    ok: r.status === 0,
    stdout: (r.stdout || '').toString(),
    stderr: (r.stderr || '').toString(),
    status: r.status,
    timedOut: Boolean(r.signal === 'SIGTERM' && options.timeout && r.status !== 0),
  };
}

export function qmdVersion(): string | null {
  const r = runQmd(['--version']);
  if (!r.ok) return null;
  const line = (r.stdout || r.stderr).trim().split('\n')[0] || '';
  return line.replace(/^qmd\s+/i, '').trim() || line;
}

export function bunVersion(): string | null {
  const bun = vendorBunBin();
  if (!bun) return null;
  const r = spawnSync(bun, ['--version'], { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (r.status !== 0) return null;
  return (r.stdout || '').toString().trim() || null;
}

/**
 * Copy vendor/models/*.gguf → ~/.cache/qmd/models so qmd/node-llama-cpp
 * uses offline files instead of downloading from HuggingFace.
 */
export function syncVendorModelsToCache(): { synced: number; total: number } {
  const models = listVendorGgufModels();
  const destDir = userQmdModelsDir();
  fs.mkdirSync(destDir, { recursive: true });
  let synced = 0;
  for (const name of models) {
    const src = path.join(vendorModelsDir(), name);
    const dest = path.join(destDir, name);
    try {
      if (fs.existsSync(dest) && fs.statSync(dest).size === fs.statSync(src).size) {
        continue;
      }
      fs.copyFileSync(src, dest);
      synced++;
      logger.step(`  model → cache: ${name}`);
    } catch (e) {
      logger.warn(`  failed to sync ${name}: ${(e as Error).message}`);
    }
  }
  return { synced, total: models.length };
}

/**
 * Ensure wiki collection exists for the target project.
 */
export function ensureWikiCollection(cwd: string): boolean {
  const wiki = path.join(cwd, 'wiki');
  if (!fs.existsSync(wiki)) {
    logger.warn('wiki/ missing — skip qmd collection');
    return false;
  }

  const list = runQmd(['collection', 'list'], cwd);
  if (list.ok && /(?:^|\s)wiki(?:\s|$)/i.test(list.stdout + list.stderr)) {
    logger.success('qmd collection "wiki" already registered');
    return true;
  }

  logger.step('Registering qmd collection wiki/ ...');
  const add = runQmd(['collection', 'add', 'wiki/', '--name', 'wiki', '--mask', '**/*.md'], cwd);
  if (!add.ok) {
    const add2 = runQmd(['collection', 'add', 'wiki/', '--name', 'wiki'], cwd);
    if (!add2.ok) {
      const detail = (add2.stderr || add.stderr || add.stdout || add2.stdout || '').trim().slice(0, 300);
      logger.warn(`qmd collection add failed${detail ? `: ${detail}` : ''}`);
      return false;
    }
  }
  logger.success('qmd collection "wiki" ready');
  return true;
}

/**
 * Sync offline models then optionally run qmd embed (no network if models present).
 */
export function initEmbeddings(
  cwd: string,
  runEmbed: boolean,
): {
  modelsMissing: boolean;
  embedFailed: boolean;
  embedCompleted: boolean;
  embedDetail?: string;
} {
  const { total, synced } = syncVendorModelsToCache();
  if (total === 0) {
    logger.warn('vendor/models has no .gguf');
    return { modelsMissing: true, embedFailed: false, embedCompleted: false };
  }
  logger.success(`Offline models ready (${total} gguf${synced ? `, ${synced} newly synced` : ''})`);

  if (!runEmbed) {
    logger.info('Skip qmd embed (--skip-embed)');
    return { modelsMissing: false, embedFailed: false, embedCompleted: false };
  }

  logger.step(
    `Running qmd embed (timeout ${Math.round(QMD_EMBED_TIMEOUT_MS / 60000)}m, uses local cache models when present) ...`,
  );
  const emb = runQmd(['embed'], cwd, { timeout: QMD_EMBED_TIMEOUT_MS });
  if (!emb.ok) {
    const detail = (emb.stderr || emb.stdout || 'unknown error').trim().slice(0, 400);
    if (emb.timedOut) {
      logger.warn(`qmd embed timed out after ${QMD_EMBED_TIMEOUT_MS}ms`);
    } else {
      logger.warn(`qmd embed failed`);
    }
    return { modelsMissing: false, embedFailed: true, embedCompleted: false, embedDetail: detail };
  }
  logger.success('qmd embed finished');
  return { modelsMissing: false, embedFailed: false, embedCompleted: true };
}
