---
phase: merge
---

# /llm-merge — 去重合并

**触发词**：`merge`、`去重`

> 全局铁律（wikilink 格式、confidence 规则、系统文件隔离、禁止行为）见主 `SKILL.md`，此处不重复。特别提醒：绝不在未与用户确认的情况下自动合并概念页。

## 同语言合并流程

1. 与用户确认合并方案（绝不自动合并）。
2. 主 slug 保留，被合并页面的 wikilinks 全部更新。
3. 被合并文件替换为重定向文件（内容：`redirect: [[wiki/concepts/主slug]]`）。
4. `log.md` 记录：`YYYY-MM-DD | merge | [旧slug] → [主slug]`

## 跨语言合并专项流程（区别于同语言合并）

用于同一概念存在中文页与英文页（或不同语言别名页）需要合并的情况：

1. 主 slug 保留英文。
2. `aliases` 取两个页面的并集。
3. Key Points / Sources / Evolution Log 按并集 + 去重合并。
4. My Position 若两页都有，先向用户展示对比后再合并。
5. 被合并的旧 slug 文件保留为 redirect 文件（确保旧 wikilinks 不 broken）。
6. `log.md` 记录：`YYYY-MM-DD | merge | [旧slug] → [主slug]（跨语言合并）`

## 执行要点

- 合并前必须向用户完整展示两个（或多个）候选页面的 Definition / Sources / confidence，等待用户明确确认后才可执行文件层面的合并与重定向。
- 合并后需检查并更新所有引用了被合并 slug 的其他 concept/entity/synthesis 页面中的 wikilinks，避免 broken link。
- redirect 文件本身不再参与 confidence / source_count 统计，仅作为跳转桩保留。
- lint（`scripts/lint.mjs`）自动跳过 redirect：不报 stub，也不把 redirect 目标当普通 wikilink 误报。
