#!/usr/bin/env node
/**
 * postinstall: ensure offline vendor assets (qmd, bun, models) and sync models to user cache.
 * On failure, print clear recovery steps (do not silently succeed).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import os from 'node:os';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const qmdPkg = path.join(root, 'vendor', 'qmd', 'node_modules', '@tobilu', 'qmd', 'package.json');

function guide(title, steps) {
  console.error('');
  console.error(`[llmflow] ✖ ${title}`);
  console.error('[llmflow] ────────────────────────────────────────');
  for (const s of steps) console.error(`[llmflow] ${s}`);
  console.error('[llmflow] ────────────────────────────────────────');
  console.error('');
}

function syncModels() {
  const srcDir = path.join(root, 'vendor', 'models');
  const destDir = path.join(process.env.USERPROFILE || process.env.HOME || os.homedir(), '.cache', 'qmd', 'models');
  if (!fs.existsSync(srcDir)) return { count: 0, synced: 0, error: null };
  const files = fs.readdirSync(srcDir).filter((f) => f.endsWith('.gguf'));
  if (!files.length) return { count: 0, synced: 0, error: null };
  try {
    fs.mkdirSync(destDir, { recursive: true });
  } catch (e) {
    return { count: files.length, synced: 0, error: e.message };
  }
  let n = 0;
  for (const name of files) {
    const src = path.join(srcDir, name);
    const dest = path.join(destDir, name);
    try {
      if (fs.existsSync(dest) && fs.statSync(dest).size === fs.statSync(src).size) continue;
      fs.copyFileSync(src, dest);
      n++;
    } catch (e) {
      return { count: files.length, synced: n, error: `${name}: ${e.message}` };
    }
  }
  console.log(`[llmflow] synced ${n}/${files.length} offline models → ${destDir}`);
  return { count: files.length, synced: n, error: null };
}

let failed = false;

if (!fs.existsSync(qmdPkg)) {
  console.warn('[llmflow] vendor/qmd missing — attempting online vendor-fetch ...');
  const r = spawnSync(process.execPath, [path.join(root, 'scripts', 'vendor-fetch.mjs')], { stdio: 'inherit' });
  if (r.status !== 0 || !fs.existsSync(qmdPkg)) {
    failed = true;
    guide('qmd 离线依赖安装失败', [
      `仓库：${root}`,
      '请单独修复后，重新执行：npm install',
      '  1) 可联网：npm run vendor:fetch',
      '  2) 或：npm install -g @tobilu/qmd@2.5.3',
      '  3) 确认：qmd --version',
      '  4) 再：npm install && npm run build && npm link',
    ]);
  }
} else {
  console.log('[llmflow] vendor/qmd OK');
}

const bunWin = path.join(root, 'vendor', 'bun', 'win-x64', 'bun.exe');
if (process.platform === 'win32' && !fs.existsSync(bunWin)) {
  failed = true;
  guide('bun 离线包缺失', [
    `仓库：${root}`,
    '请单独修复后，重新执行：npm install',
    '  1) 可联网：npm run vendor:fetch-bun',
    '  2) 或安装 https://bun.sh 并将 bun 加入 PATH',
    '  3) 确认：bun --version',
  ]);
} else if (fs.existsSync(bunWin)) {
  console.log('[llmflow] vendor/bun OK');
} else if (process.platform !== 'win32') {
  console.warn('[llmflow] vendor/bun: non-windows — ensure vendor/bun/<platform>/ exists or install bun yourself');
}

const models = syncModels();
if (models.error) {
  failed = true;
  guide('embedding 模型同步到用户缓存失败', [
    `详情：${models.error}`,
    '请单独修复后，重新执行：npm install',
    '  1) 检查磁盘空间与 ~/.cache/qmd/models 写权限',
    '  2) 手动复制 vendor/models/*.gguf → ~/.cache/qmd/models/',
    '  3) 或：npm run vendor:fetch-models',
  ]);
} else if (!models.count) {
  failed = true;
  guide('embedding 模型离线包缺失（vendor/models 无 .gguf）', [
    `仓库：${root}`,
    '请单独修复后，重新执行：npm install',
    '  1) 若本机已有缓存：npm run vendor:fetch-models',
    '  2) 若无：先联网 qmd embed，再 npm run vendor:fetch-models',
    '  3) 或手动将 GGUF 放入 vendor/models/',
    '说明：缺少模型时仍可用 BM25；语义检索需模型。后续可用 llmflow init --skip-embed 跳过向量。',
  ]);
}

if (failed) {
  console.error('[llmflow] postinstall 未完全成功。请按上方指引单独安装缺失项后，重新执行：npm install');
  // Non-zero so CI/users notice; npm still finishes install of JS deps.
  process.exitCode = 1;
} else {
  console.log('[llmflow] offline dependencies ready');
}
