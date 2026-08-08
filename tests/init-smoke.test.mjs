import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bin = path.join(root, 'bin', 'llmflow.js');

test('llmflow init scaffolds wiki and skills', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'llmflow-'));
  execFileSync(process.execPath, [bin, 'init', '--tools', 'cursor', '--skip-embed'], {
    cwd: tmp,
    stdio: 'pipe',
    timeout: 60_000,
  });
  assert.ok(fs.existsSync(path.join(tmp, 'wiki', 'index.md')));
  assert.ok(fs.existsSync(path.join(tmp, 'scripts', 'lint.mjs')));
  assert.ok(fs.existsSync(path.join(tmp, 'CLAUDE.md')));
  assert.ok(fs.existsSync(path.join(tmp, '.cursor', 'skills', 'llmflow', 'SKILL.md')));
  assert.ok(fs.existsSync(path.join(tmp, '.cursor', 'skills', 'llm-ingest', 'SKILL.md')));
  assert.ok(fs.existsSync(path.join(tmp, '.cursor', 'skills', 'llmflow', 'references', 'ingest.md')));
  assert.ok(fs.existsSync(path.join(tmp, '.llmflow', 'state.json')));
  assert.ok(fs.existsSync(path.join(tmp, 'raw', 'images')));
  assert.ok(fs.existsSync(path.join(tmp, 'wiki', 'sources')));
  assert.ok(fs.existsSync(path.join(tmp, 'wiki', 'concepts')));
  // empty dirs must not be filled with .gitkeep placeholders
  const gitkeeps = [];
  const walkKeep = (dir) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) walkKeep(full);
      else if (ent.name === '.gitkeep') gitkeeps.push(full);
    }
  };
  walkKeep(tmp);
  assert.deepEqual(gitkeeps, []);
  const state = JSON.parse(fs.readFileSync(path.join(tmp, '.llmflow', 'state.json'), 'utf-8'));
  assert.equal(state.embedCompleted, false);
  assert.equal('python' in state, false);
  // main skill should have disable-model-invocation after Task 7
  const skill = fs.readFileSync(
    path.join(tmp, '.cursor', 'skills', 'llmflow', 'SKILL.md'),
    'utf-8',
  );
  assert.match(skill, /disable-model-invocation:\s*true/);
});
