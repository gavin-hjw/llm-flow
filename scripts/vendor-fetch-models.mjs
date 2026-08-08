#!/usr/bin/env node
/**
 * Populate vendor/models from local qmd cache (or instruct to run qmd embed once online).
 * Usage: node scripts/vendor-fetch-models.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dest = path.join(root, 'vendor', 'models');
const src = path.join(process.env.USERPROFILE || process.env.HOME || os.homedir(), '.cache', 'qmd', 'models');

const REQUIRED = [
  'hf_ggml-org_embeddinggemma-300M-Q8_0.gguf',
  'hf_ggml-org_qwen3-reranker-0.6b-q8_0.gguf',
  'hf_tobil_qmd-query-expansion-1.7B-q4_k_m.gguf',
];

fs.mkdirSync(dest, { recursive: true });

if (!fs.existsSync(src)) {
  console.error(`Missing ${src}`);
  console.error('Run once online: qmd embed  (downloads models into ~/.cache/qmd/models)');
  console.error('Then re-run: npm run vendor:fetch-models');
  process.exit(1);
}

let copied = 0;
for (const name of REQUIRED) {
  const from = path.join(src, name);
  const to = path.join(dest, name);
  if (!fs.existsSync(from)) {
    console.warn('missing in cache:', name);
    continue;
  }
  if (fs.existsSync(to) && fs.statSync(to).size === fs.statSync(from).size) {
    console.log('skip (exists)', name);
    continue;
  }
  console.log('copy', name);
  fs.copyFileSync(from, to);
  copied++;
}

const have = REQUIRED.filter((n) => fs.existsSync(path.join(dest, n)));
console.log(`vendor/models: ${have.length}/${REQUIRED.length} models ready (${copied} copied)`);
if (have.length < REQUIRED.length) process.exit(1);
