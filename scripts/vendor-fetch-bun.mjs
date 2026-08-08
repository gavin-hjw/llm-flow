#!/usr/bin/env node
/**
 * Download bun binary into vendor/bun/<platform>/ (online maintainer step).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { fileURLToPath } from 'node:url';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const TARGETS = [
  {
    dir: 'win-x64',
    url: 'https://github.com/oven-sh/bun/releases/latest/download/bun-windows-x64.zip',
    exe: 'bun.exe',
  },
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'llmflow-vendor' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          download(res.headers.location, dest).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        pipeline(res, createWriteStream(dest)).then(resolve, reject);
      })
      .on('error', reject);
  });
}

async function main() {
  for (const t of TARGETS) {
    const outDir = path.join(root, 'vendor', 'bun', t.dir);
    fs.mkdirSync(outDir, { recursive: true });
    const zip = path.join(outDir, 'bun.zip');
    console.log('Downloading', t.url);
    await download(t.url, zip);
    const extract = path.join(outDir, '_extract');
    fs.rmSync(extract, { recursive: true, force: true });
    fs.mkdirSync(extract, { recursive: true });
    const unzip = spawnSync('powershell', ['-NoProfile', '-Command', `Expand-Archive -Path '${zip}' -DestinationPath '${extract}' -Force`], {
      stdio: 'inherit',
    });
    if (unzip.status !== 0) process.exit(unzip.status ?? 1);
    const found = [];
    function walk(d) {
      for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, ent.name);
        if (ent.isDirectory()) walk(p);
        else if (ent.name === t.exe || ent.name === 'bun') found.push(p);
      }
    }
    walk(extract);
    if (!found.length) {
      console.error('bun binary not found in zip');
      process.exit(1);
    }
    fs.copyFileSync(found[0], path.join(outDir, t.exe));
    fs.rmSync(zip, { force: true });
    fs.rmSync(extract, { recursive: true, force: true });
    console.log('OK', path.join(outDir, t.exe));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
