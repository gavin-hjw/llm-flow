#!/usr/bin/env node
/**
 * Global `bun` shim → vendor/bun/<platform>/bun[.exe]
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function resolveBun() {
  const plat = process.platform;
  const arch = process.arch;
  const candidates = [];
  if (plat === 'win32' && arch === 'x64') candidates.push(path.join(root, 'vendor', 'bun', 'win-x64', 'bun.exe'));
  if (plat === 'win32' && arch === 'arm64') candidates.push(path.join(root, 'vendor', 'bun', 'win-arm64', 'bun.exe'));
  if (plat === 'darwin' && arch === 'arm64') candidates.push(path.join(root, 'vendor', 'bun', 'darwin-aarch64', 'bun'));
  if (plat === 'darwin' && arch === 'x64') candidates.push(path.join(root, 'vendor', 'bun', 'darwin-x64', 'bun'));
  if (plat === 'linux' && arch === 'x64') candidates.push(path.join(root, 'vendor', 'bun', 'linux-x64', 'bun'));
  if (plat === 'linux' && arch === 'arm64') candidates.push(path.join(root, 'vendor', 'bun', 'linux-aarch64', 'bun'));
  return candidates.find((p) => fs.existsSync(p)) || null;
}

const bun = resolveBun();
if (!bun) {
  console.error('');
  console.error('[llmflow] ✖ bun 离线包缺失，无法启动');
  console.error('[llmflow] ────────────────────────────────────────');
  console.error(`[llmflow] 仓库：${root}`);
  console.error('[llmflow] 请单独修复后，重新执行你刚才的命令');
  console.error('[llmflow]   1) cd 到 llm-flow 仓库');
  console.error('[llmflow]   2) npm run vendor:fetch-bun');
  console.error('[llmflow]   3) 或安装 https://bun.sh 并加入 PATH');
  console.error('[llmflow]   4) 确认：bun --version');
  console.error('[llmflow]   5) npm link');
  console.error('[llmflow] ────────────────────────────────────────');
  process.exit(1);
}

const r = spawnSync(bun, process.argv.slice(2), { stdio: 'inherit', env: process.env });
process.exit(r.status ?? 1);
