import path from 'path';
import { CONFIG_FILE, DEFAULT_CONFIG, STATE_DIR, STATE_FILE } from './constants.js';
import { ensureDir, fileExists, readText, writeText } from '../utils/shell.js';
import { hasVendoredQmd } from './paths.js';
import { qmdVersion } from './qmd.js';

export interface DepStatus {
  node: { installed: boolean; version?: string };
  qmd: { installed: boolean; version?: string; source?: 'vendor' | 'path' };
}

export interface LlmflowState {
  createdAt: string;
  updatedAt: string;
  tools: string[];
  version: string;
  /** Whether qmd binary is available (vendor or PATH). */
  qmd: boolean;
  /** Whether `qmd embed` completed successfully during init (false if skipped/failed). */
  embedCompleted: boolean;
}

export function checkDependencies(): DepStatus {
  const ver = qmdVersion();
  return {
    node: {
      installed: true,
      version: process.version.replace(/^v/, ''),
    },
    qmd: {
      installed: Boolean(ver),
      version: ver || undefined,
      source: hasVendoredQmd() ? 'vendor' : ver ? 'path' : undefined,
    },
  };
}

export function statePath(cwd: string): string {
  return path.join(cwd, STATE_DIR, STATE_FILE);
}

export function configPath(cwd: string): string {
  return path.join(cwd, STATE_DIR, CONFIG_FILE);
}

export function readState(cwd: string): LlmflowState | null {
  const p = statePath(cwd);
  if (!fileExists(p)) return null;
  return JSON.parse(readText(p)) as LlmflowState;
}

export function writeState(cwd: string, state: LlmflowState): void {
  ensureDir(path.join(cwd, STATE_DIR));
  writeText(statePath(cwd), JSON.stringify(state, null, 2) + '\n');
}

export function writeConfig(cwd: string): void {
  ensureDir(path.join(cwd, STATE_DIR));
  writeText(configPath(cwd), JSON.stringify(DEFAULT_CONFIG, null, 2) + '\n');
}

export function checkScaffoldIntegrity(cwd: string): Array<{ path: string; ok: boolean }> {
  const required = [
    'raw',
    'wiki',
    'wiki/templates',
    'scripts/lint.mjs',
    'CLAUDE.md',
    'wiki/index.md',
    'wiki/log.md',
    'wiki/overview.md',
    'wiki/QUESTIONS.md',
  ];
  return required.map((rel) => ({
    path: rel,
    ok: fileExists(path.join(cwd, rel)),
  }));
}
