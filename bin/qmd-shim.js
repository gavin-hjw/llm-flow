#!/usr/bin/env node
/**
 * Global `qmd` shim → vendored @tobilu/qmd inside this package.
 * Installed alongside `llmflow` via package.json bin.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distCli = path.join(root, 'vendor', 'qmd', 'node_modules', '@tobilu', 'qmd', 'dist', 'cli', 'qmd.js');
const qmdBin = fs.existsSync(distCli)
  ? distCli
  : path.join(root, 'vendor', 'qmd', 'node_modules', '@tobilu', 'qmd', 'bin', 'qmd');

if (!fs.existsSync(qmdBin)) {
  console.error('');
  console.error('[llmflow] ✖ qmd 离线包缺失，无法启动');
  console.error('[llmflow] ────────────────────────────────────────');
  console.error(`[llmflow] 仓库：${root}`);
  console.error('[llmflow] 请单独修复后，重新执行你刚才的命令（如 llmflow init / qmd …）');
  console.error('[llmflow]   1) cd 到 llm-flow 仓库');
  console.error('[llmflow]   2) npm run vendor:fetch');
  console.error('[llmflow]   3) 或：npm install -g @tobilu/qmd@2.5.3');
  console.error('[llmflow]   4) 确认：qmd --version');
  console.error('[llmflow]   5) npm run build && npm link');
  console.error('[llmflow] ────────────────────────────────────────');
  process.exit(1);
}

const env = { ...process.env };
const nodeDir = path.dirname(process.execPath);
const bunWin = path.join(root, 'vendor', 'bun', 'win-x64', 'bun.exe');
const pathPre = [nodeDir];
if (fs.existsSync(bunWin)) pathPre.push(path.dirname(bunWin));
env.PATH = `${pathPre.join(path.delimiter)}${path.delimiter}${env.PATH || ''}`;

const r = spawnSync(process.execPath, [qmdBin, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env,
});
process.exit(r.status ?? 1);
