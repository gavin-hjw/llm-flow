import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SCAFFOLD_EMPTY_DIRS, UPDATE_ALWAYS, UPDATE_SCAFFOLD } from './constants.js';
import { ensureDir, fileExists } from '../utils/shell.js';
import { logger } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCAFFOLD_DIR = path.resolve(__dirname, '..', '..', 'templates', 'scaffold');

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function shouldSkipScaffoldFile(rel: string): boolean {
  const base = path.basename(rel);
  return base === '.gitkeep' || base === '.gitkeep.txt';
}

/** First-time init: copy scaffold files + ensure empty dirs (no .gitkeep) */
export function deployScaffold(cwd: string): void {
  if (!fs.existsSync(SCAFFOLD_DIR)) {
    throw new Error(`Missing templates/scaffold at ${SCAFFOLD_DIR}`);
  }
  for (const abs of walk(SCAFFOLD_DIR)) {
    const rel = path.relative(SCAFFOLD_DIR, abs);
    if (shouldSkipScaffoldFile(rel)) continue;
    const dest = path.join(cwd, rel);
    if (fileExists(dest)) {
      logger.step(`  skip existing ${rel}`);
      continue;
    }
    ensureDir(path.dirname(dest));
    fs.copyFileSync(abs, dest);
    logger.step(`  ${rel}`);
  }
  for (const rel of SCAFFOLD_EMPTY_DIRS) {
    const dest = path.join(cwd, rel);
    if (!fs.existsSync(dest)) {
      ensureDir(dest);
      logger.step(`  ${rel}/`);
    }
  }
}

/** update: refresh whitelist; withScaffold adds UPDATE_SCAFFOLD */
export function refreshScaffoldFiles(cwd: string, withScaffold: boolean): void {
  const list = withScaffold
    ? [...UPDATE_ALWAYS, ...UPDATE_SCAFFOLD]
    : [...UPDATE_ALWAYS];
  for (const rel of list) {
    const src = path.join(SCAFFOLD_DIR, rel);
    if (!fileExists(src)) {
      logger.warn(`  missing template: ${rel}`);
      continue;
    }
    const dest = path.join(cwd, rel);
    ensureDir(path.dirname(dest));
    fs.copyFileSync(src, dest);
    logger.step(`  refreshed ${rel}`);
  }
}
