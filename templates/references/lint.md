---
phase: lint
---

# /llm-lint — 健康检查

**触发词**：`lint`、`检查`、`健康检查`

> 全局铁律（wikilink 格式、confidence 规则、系统文件隔离、禁止行为）见主 `SKILL.md`，此处不重复。

## 执行步骤

1. 运行 `node scripts/lint.mjs`（包含 9 项检查，纯 Node，无需 Python）。
2. 将报告写入 `wiki/outputs/lint-YYYY-MM-DD.md`（frontmatter 含 `graph-excluded: true`）。
3. 执行 `qmd status`，对比索引文件数与 `wiki/` 实际 `.md` 文件数（排除系统文件）；若索引落后则执行 `qmd update`（重新索引所有 collection），在报告中记录。
4. 更新 `wiki/overview.md` Health Dashboard 的「上次 LINT」字段为当天日期（`lint.mjs` 已自动写入；若脚本版本过旧则手工更新）。
5. 向用户展示摘要并询问是否修复。

> **Redirect 文件**：merge 产生的重定向页（frontmatter `redirect:` 或正文仅为 `redirect: [[...]]`）不参与 stub / broken-wikilink / 格式检查，避免 merge→lint 噪声。

## QMD 命令说明（Step 3 相关）

| QMD 命令 | 使用场景 | 备注 |
|----------|---------|------|
| `qmd status` | 显示 collection 状态和文件数 | 用于对比索引是否落后 |
| `qmd update` | 索引进阶：重新索引所有 collection | 发现索引落后时执行 |

> `qmd add` / `qmd remove` 命令不存在，索引维护统一使用 `qmd collection add/remove` 与 `qmd update`。若 `qmd` 未安装或不在 PATH 中，在报告中标注「qmd 不可用，跳过索引一致性检查」，不要中断 lint 流程。

## 修复原则

- lint 发现的问题（如缺失 frontmatter、broken wikilink、`⚠ SOURCE MODIFIED` 等）只在用户确认后才自动修复。
- `⚠ SOURCE MODIFIED` 类问题的修复方式遵循主 `SKILL.md` 第 8 节 Source Integrity Rules（重新摄入 + 更新受影响页面 + Evolution Log 记录）。
