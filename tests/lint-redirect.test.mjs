import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lintSrc = path.join(root, 'templates', 'scaffold', 'scripts', 'lint.mjs');

function setupWiki() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'llmflow-lint-'));
  const wiki = path.join(tmp, 'wiki');
  fs.mkdirSync(path.join(wiki, 'concepts'), { recursive: true });
  fs.mkdirSync(path.join(wiki, 'outputs'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'scripts'), { recursive: true });
  fs.copyFileSync(lintSrc, path.join(tmp, 'scripts', 'lint.mjs'));

  for (const name of ['index.md', 'log.md', 'overview.md', 'QUESTIONS.md']) {
    const src = path.join(root, 'templates', 'scaffold', 'wiki', name);
    fs.copyFileSync(src, path.join(wiki, name));
  }

  fs.writeFileSync(
    path.join(wiki, 'concepts', 'main-topic.md'),
    `---
type: concept
date: 2026-08-06
---

# Main Topic

This page has enough body text to not be considered a stub page by the lint checker.
`,
  );

  fs.writeFileSync(
    path.join(wiki, 'concepts', 'old-topic.md'),
    `---
type: concept
date: 2026-08-06
redirect: "[[main-topic]]"
---

redirect: [[wiki/concepts/main-topic]]
`,
  );

  return tmp;
}

test('lint skips redirect pages for stub and wikilink noise', () => {
  const tmp = setupWiki();
  let stdout = '';
  try {
    stdout = execFileSync(process.execPath, [path.join(tmp, 'scripts', 'lint.mjs')], {
      cwd: tmp,
      encoding: 'utf-8',
      timeout: 30_000,
    });
  } catch (e) {
    stdout = `${e.stdout || ''}${e.stderr || ''}`;
  }

  assert.doesNotMatch(stdout, /Stub 页面.*old-topic/);
  assert.doesNotMatch(stdout, /Broken wikilink：wiki[/\\]concepts[/\\]old-topic/);
  assert.doesNotMatch(stdout, /Wikilink.*old-topic/);

  const overview = fs.readFileSync(path.join(tmp, 'wiki', 'overview.md'), 'utf-8');
  const today = new Date().toISOString().slice(0, 10);
  assert.match(overview, new RegExp(`上次 LINT\\s*\\|\\s*${today}`));
});
