#!/usr/bin/env node
/**
 * LLM Wiki health checks (Node port of former lint.py).
 * 9 checks → wiki/outputs/lint-YYYY-MM-DD.md
 * No Python required.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const BASE_DIR = path.resolve(path.dirname(__filename), '..');
const WIKI_DIR = path.join(BASE_DIR, 'wiki');
const OUTPUTS_DIR = path.join(WIKI_DIR, 'outputs');
const SYSTEM_FILES = new Set(['log.md', 'index.md', 'overview.md', 'QUESTIONS.md']);
const STALENESS = { high: 90, medium: 180, low: 365 };
const JACCARD_MIN_LEN = 3;

function sha256Hex(filepath) {
  const h = crypto.createHash('sha256');
  h.update(fs.readFileSync(filepath));
  return h.digest('hex');
}

/** Minimal YAML-ish frontmatter parse for simple wiki pages */
function parseFrontmatter(filepath) {
  let content;
  try {
    content = fs.readFileSync(filepath, 'utf8');
  } catch {
    return null;
  }
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const fm = {};
  const lines = m[1].split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!kv) {
      i++;
      continue;
    }
    const key = kv[1];
    let val = kv[2].trim();
    if (val === '' || val === '|' || val === '>') {
      const arr = [];
      i++;
      while (i < lines.length && /^\s+-\s+/.test(lines[i])) {
        arr.push(lines[i].replace(/^\s+-\s+/, '').trim().replace(/^["']|["']$/g, ''));
        i++;
      }
      fm[key] = arr.length ? arr : val;
      continue;
    }
    if (val.startsWith('[') && val.endsWith(']')) {
      fm[key] = val
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
    } else {
      fm[key] = val.replace(/^["']|["']$/g, '');
    }
    i++;
  }
  return fm;
}

function getBodyLength(filepath) {
  let content;
  try {
    content = fs.readFileSync(filepath, 'utf8');
  } catch {
    return 0;
  }
  return content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '').trim().length;
}

/** Merge redirect stubs: frontmatter `redirect:` or short body `redirect: [[...]]`. */
function isRedirectFile(filepath) {
  const fm = parseFrontmatter(filepath);
  if (fm && 'redirect' in fm) return true;
  try {
    const content = fs.readFileSync(filepath, 'utf8');
    const body = content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').trim();
    const lines = body.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0 || lines.length > 2) return false;
    return lines.every((l) => /^redirect:\s*\[\[.+\]\]\s*$/i.test(l));
  } catch {
    return false;
  }
}

function updateOverviewLastLint(dateStr) {
  const overviewPath = path.join(WIKI_DIR, 'overview.md');
  if (!fs.existsSync(overviewPath)) return false;
  const content = fs.readFileSync(overviewPath, 'utf8');
  if (!/\|\s*上次 LINT\s*\|/i.test(content)) return false;
  const next = content.replace(/(\|\s*上次 LINT\s*\|)\s*([^|\n]*)/, `$1 ${dateStr} `);
  if (next === content) return false;
  fs.writeFileSync(overviewPath, next, 'utf8');
  return true;
}

function collectWikiFiles() {
  const files = [];
  if (!fs.existsSync(WIKI_DIR)) return files;
  for (const name of fs.readdirSync(WIKI_DIR)) {
    const p = path.join(WIKI_DIR, name);
    if (fs.statSync(p).isFile() && name.endsWith('.md')) files.push(p);
  }
  for (const sub of ['sources', 'concepts', 'entities', 'synthesis', 'templates']) {
    const d = path.join(WIKI_DIR, sub);
    if (!fs.existsSync(d)) continue;
    for (const name of fs.readdirSync(d)) {
      if (name.endsWith('.md')) files.push(path.join(d, name));
    }
  }
  return files;
}

function extractWikilinks(filepath) {
  try {
    const content = fs.readFileSync(filepath, 'utf8');
    return [...content.matchAll(/\[\[([^\]]+)\]\]/g)].map((m) => m[1]);
  } catch {
    return [];
  }
}

function jaccard(s1, s2) {
  if (s1.length < JACCARD_MIN_LEN || s2.length < JACCARD_MIN_LEN) return 0;
  const n = 2;
  const a = new Set();
  const b = new Set();
  for (let i = 0; i <= s1.length - n; i++) a.add(s1.slice(i, i + n));
  for (let i = 0; i <= s2.length - n; i++) b.add(s2.slice(i, i + n));
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union ? inter / union : 0;
}

function resolveWikilink(target) {
  target = target.split('#')[0].trim();
  if (target.endsWith('.md')) target = target.slice(0, -3);
  const candidates = [
    path.join(BASE_DIR, `${target}.md`),
    path.join(WIKI_DIR, 'concepts', `${target}.md`),
    path.join(WIKI_DIR, 'entities', `${target}.md`),
    path.join(WIKI_DIR, 'sources', `${target}.md`),
    path.join(WIKI_DIR, 'synthesis', `${target}.md`),
  ];
  const base = path.basename(target);
  for (const sub of ['concepts', 'entities', 'sources', 'synthesis']) {
    candidates.push(path.join(WIKI_DIR, sub, `${base}.md`));
  }
  return candidates.find((c) => fs.existsSync(c)) || null;
}

function rel(p) {
  return path.relative(BASE_DIR, p);
}

function check1() {
  const issues = [];
  for (const f of collectWikiFiles()) {
    if (path.basename(path.dirname(f)) === 'templates') continue;
    if (isRedirectFile(f)) continue;
    const fm = parseFrontmatter(f);
    if (!fm) issues.push(`❌ 缺少 YAML frontmatter：${rel(f)}`);
    else {
      if (!('type' in fm)) issues.push(`❌ frontmatter 缺少 type 字段：${rel(f)}`);
      if (!('date' in fm)) issues.push(`❌ frontmatter 缺少 date 字段：${rel(f)}`);
    }
  }
  return issues;
}

function check2() {
  const issues = [];
  const stems = new Map();
  for (const f of collectWikiFiles()) stems.set(path.basename(f, '.md'), f);
  const outDir = path.join(WIKI_DIR, 'outputs');
  if (fs.existsSync(outDir)) {
    for (const name of fs.readdirSync(outDir)) {
      if (name.endsWith('.md')) stems.set(path.basename(name, '.md'), path.join(outDir, name));
    }
  }
  const forbidden = new Set([...SYSTEM_FILES].map((s) => s.replace(/\.md$/, '')).concat(['QUESTIONS']));
  const ops = new Set(['ingest', 'query', 'reflect', 'lint', 'merge', 'add-question']);
  for (const f of collectWikiFiles()) {
    if (path.basename(path.dirname(f)) === 'templates') continue;
    if (isRedirectFile(f)) continue;
    for (const link of extractWikilinks(f)) {
      let clean = link.split('#')[0].split('|')[0].trim();
      if (clean.endsWith('.md')) clean = clean.slice(0, -3);
      if (forbidden.has(clean) || ops.has(clean)) {
        issues.push(`⚠ 禁止引用系统文件/操作名：${rel(f)} → [[${link}]]`);
        continue;
      }
      if (!stems.has(clean) && !resolveWikilink(clean)) {
        issues.push(`⚠ Broken wikilink：${rel(f)} → [[${link}]]（目标不存在）`);
      }
    }
  }
  return issues;
}

function check3() {
  const issues = [];
  const indexFile = path.join(WIKI_DIR, 'index.md');
  if (!fs.existsSync(indexFile)) {
    issues.push('❌ wiki/index.md 不存在');
    return issues;
  }
  for (const link of extractWikilinks(indexFile)) {
    let clean = link.split('#')[0].split('|')[0].trim();
    if (clean.endsWith('.md')) clean = clean.slice(0, -3);
    if (['—', 'concept-slug', 'entity-slug'].includes(clean)) continue;
    if (!resolveWikilink(clean)) issues.push(`⚠ Index 引用不存在：index.md → [[${link}]]`);
  }
  return issues;
}

function check4() {
  const issues = [];
  for (const f of collectWikiFiles()) {
    if (path.basename(path.dirname(f)) === 'templates') continue;
    const stem = path.basename(f);
    if (SYSTEM_FILES.has(stem)) continue;
    if (path.basename(path.dirname(f)) === 'outputs' && stem.startsWith('lint-')) continue;
    if (isRedirectFile(f)) continue;
    const n = getBodyLength(f);
    if (n < 100) issues.push(`⚠ Stub 页面（${n} 字）：${rel(f)}`);
  }
  return issues;
}

function check5() {
  const issues = [];
  const d = path.join(WIKI_DIR, 'concepts');
  if (!fs.existsSync(d)) return issues;
  const slugs = fs
    .readdirSync(d)
    .filter((n) => n.endsWith('.md'))
    .filter((n) => !isRedirectFile(path.join(d, n)))
    .map((n) => path.basename(n, '.md'));
  for (let i = 0; i < slugs.length; i++) {
    for (let j = i + 1; j < slugs.length; j++) {
      const sim = jaccard(slugs[i], slugs[j]);
      if (sim > 0.7) issues.push(`⚠ 近重复概念（Jaccard=${sim.toFixed(2)}）：[[${slugs[i]}]] ↔ [[${slugs[j]}]]`);
    }
  }
  return issues;
}

function check6() {
  const issues = [];
  const d = path.join(WIKI_DIR, 'sources');
  if (!fs.existsSync(d)) return issues;
  for (const name of fs.readdirSync(d)) {
    if (!name.endsWith('.md')) continue;
    const f = path.join(d, name);
    const fm = parseFrontmatter(f);
    if (!fm?.raw_file || !fm?.raw_sha256) continue;
    const rawPath = path.join(BASE_DIR, fm.raw_file);
    if (!fs.existsSync(rawPath)) {
      issues.push(`⚠ 原始文件缺失：${fm.raw_file}（引用自 ${rel(f)}）`);
      continue;
    }
    const cur = sha256Hex(rawPath);
    if (cur !== fm.raw_sha256) {
      issues.push(
        `⚠ SOURCE MODIFIED：${fm.raw_file} 哈希变更（${fm.raw_sha256.slice(0, 8)}... → ${cur.slice(0, 8)}...），请重新摄入（${rel(f)}）`,
      );
    }
  }
  return issues;
}

function check7() {
  const issues = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  function checkDir(subdir) {
    const d = path.join(WIKI_DIR, subdir);
    if (!fs.existsSync(d)) return;
    for (const name of fs.readdirSync(d)) {
      if (!name.endsWith('.md')) continue;
      const f = path.join(d, name);
      if (isRedirectFile(f)) continue;
      const fm = parseFrontmatter(f);
      if (!fm) continue;
      const vol = fm.domain_volatility || 'medium';
      if (!(vol in STALENESS)) continue;
      const review = fm.last_reviewed || fm.date;
      if (!review) continue;
      const m = String(review).match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (!m) continue;
      const reviewDate = new Date(+m[1], +m[2] - 1, +m[3]);
      const days = Math.floor((today - reviewDate) / 86400000);
      if (days > STALENESS[vol]) {
        issues.push(`⚠ Stale 页面（${days} 天未更新，阈值 ${STALENESS[vol]} 天）：${rel(f)}（domain_volatility=${vol}）`);
      }
    }
  }
  checkDir('concepts');
  checkDir('entities');
  checkDir('synthesis');
  return issues;
}

function check8() {
  const issues = [];
  const sourcesDir = path.join(WIKI_DIR, 'sources');
  if (fs.existsSync(sourcesDir)) {
    const urls = [];
    for (const name of fs.readdirSync(sourcesDir)) {
      if (!name.endsWith('.md')) continue;
      const f = path.join(sourcesDir, name);
      const fm = parseFrontmatter(f);
      if (fm?.source_url) urls.push([rel(f), fm.source_url]);
    }
    const norm = (u) => u.replace(/^https?:\/\//, '').split('?')[0].replace(/\/$/, '');
    for (let i = 0; i < urls.length; i++) {
      for (let j = i + 1; j < urls.length; j++) {
        if (norm(urls[i][1]) === norm(urls[j][1])) {
          issues.push(`⚠ 跨语言重复 URL：${urls[i][0]} ↔ ${urls[j][0]}（相同 URL：${urls[i][1]}）`);
        }
      }
    }
  }
  const conceptsDir = path.join(WIKI_DIR, 'concepts');
  if (fs.existsSync(conceptsDir)) {
    const map = [];
    for (const name of fs.readdirSync(conceptsDir)) {
      if (!name.endsWith('.md')) continue;
      const f = path.join(conceptsDir, name);
      const fm = parseFrontmatter(f);
      if (!fm?.aliases) continue;
      const aliases = Array.isArray(fm.aliases) ? fm.aliases : [fm.aliases];
      map.push([rel(f), new Set(aliases.map((a) => String(a).toLowerCase()))]);
    }
    for (let i = 0; i < map.length; i++) {
      for (let j = i + 1; j < map.length; j++) {
        const overlap = [...map[i][1]].filter((a) => map[j][1].has(a));
        if (overlap.length) {
          issues.push(`⚠ 跨语言 aliases 重叠：${map[i][0]} ↔ ${map[j][0]}（共同别名：${overlap.sort().join(', ')}）`);
        }
      }
    }
  }
  return issues;
}

function check9() {
  const issues = [];
  for (const f of collectWikiFiles()) {
    if (path.basename(path.dirname(f)) === 'templates') continue;
    if (isRedirectFile(f)) continue;
    for (const link of extractWikilinks(f)) {
      const clean = link.split('#')[0].split('|')[0].trim();
      if (/[\u4e00-\u9fff]/.test(clean)) {
        issues.push(`⚠ Wikilink 含中文：${rel(f)} → [[${link}]]（应使用英文小写连字符 slug）`);
      } else if (/[A-Z]/.test(clean)) {
        issues.push(`⚠ Wikilink 含大写：${rel(f)} → [[${link}]]（应使用英文小写连字符）`);
      } else if (clean.includes('_')) {
        issues.push(`⚠ Wikilink 含下划线：${rel(f)} → [[${link}]]（应使用连字符）`);
      }
    }
  }
  return issues;
}

function main() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toISOString().replace('T', ' ').slice(0, 19);
  console.log('='.repeat(60));
  console.log('LLM Wiki 知识库健康检查');
  console.log(`检查日期：${dateStr}`);
  console.log('='.repeat(60));

  const all = {
    '1. YAML frontmatter 合法性': check1(),
    '2. Broken Wikilinks': check2(),
    '3. Index 一致性': check3(),
    '4. Stub 页面': check4(),
    '5. 近重复概念名称': check5(),
    '6. SHA-256 完整性': check6(),
    '7. Stale 页面': check7(),
    '8. 跨语言重复': check8(),
    '9. Wikilink 格式规范': check9(),
  };

  let total = 0;
  const report = [`# Lint 报告 — ${dateStr}`, '', `> 检查时间：${timeStr}`, ''];
  for (const [name, issues] of Object.entries(all)) {
    total += issues.length;
    const status = issues.length === 0 ? '✅ 通过' : `❌ ${issues.length} 个问题`;
    console.log(`\n${name}：${status}`);
    report.push(`## ${name}`, `**状态**：${status}`, '');
    if (issues.length) {
      for (const issue of issues) {
        console.log(`  ${issue}`);
        report.push(`- ${issue}`);
      }
    } else report.push('- 无问题');
    report.push('');
  }
  console.log(`\n${'='.repeat(60)}`);
  console.log(`总计：${total} 个问题`);
  console.log('='.repeat(60));
  report.push('---', `**总计：${total} 个问题**`);

  fs.mkdirSync(OUTPUTS_DIR, { recursive: true });
  const reportPath = path.join(OUTPUTS_DIR, `lint-${dateStr}.md`);
  fs.writeFileSync(
    reportPath,
    `---\ntype: lint-report\ngraph-excluded: true\ndate: ${dateStr}\n---\n\n${report.join('\n')}\n`,
    'utf8',
  );
  console.log(`\n报告已写入：${path.relative(BASE_DIR, reportPath)}`);
  if (updateOverviewLastLint(dateStr)) {
    console.log(`已更新 wiki/overview.md「上次 LINT」→ ${dateStr}`);
  }
  return total;
}

process.exit(main() > 0 ? 1 : 0);
