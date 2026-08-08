#!/usr/bin/env node
/**
 * Maintainer helper: refresh vendor/qmd from the registry (online).
 * Usage: node scripts/vendor-fetch.mjs
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vendorQmd = path.join(root, 'vendor', 'qmd');

fs.mkdirSync(vendorQmd, { recursive: true });
fs.writeFileSync(
  path.join(vendorQmd, 'package.json'),
  JSON.stringify(
    {
      name: 'llmflow-vendor-qmd',
      private: true,
      dependencies: { '@tobilu/qmd': '2.5.3' },
    },
    null,
    2,
  ) + '\n',
);

console.log('Installing @tobilu/qmd@2.5.3 into vendor/qmd ...');
const r = spawnSync('npm', ['install', '--prefix', vendorQmd], {
  stdio: 'inherit',
  shell: true,
});
if (r.status !== 0) process.exit(r.status ?? 1);

// Drop huge optional GPU binaries (CPU win-x64 is enough for default offline bundle)
const llama = path.join(vendorQmd, 'node_modules', '@node-llama-cpp');
if (fs.existsSync(llama)) {
  for (const name of fs.readdirSync(llama)) {
    if (name.includes('cuda') || name.includes('vulkan') || name.includes('linux') || name.includes('mac') || name.includes('darwin') || name.includes('arm64')) {
      fs.rmSync(path.join(llama, name), { recursive: true, force: true });
      console.log('pruned', name);
    }
  }
}

const bin = path.join(vendorQmd, 'node_modules', '@tobilu', 'qmd', 'bin', 'qmd');
if (!fs.existsSync(bin)) {
  console.error('vendor fetch failed: qmd bin missing');
  process.exit(1);
}
console.log('vendor/qmd ready');
