---
phase: add-question
---

# /llm-add-question — 记录开放问题

**触发词**：`我想搞清楚`、`add question`、`记录一个问题`

> 全局铁律（wikilink 格式、confidence 规则、系统文件隔离、禁止行为）见主 `SKILL.md`，此处不重复。

## 执行步骤

1. 将问题规范化（提取核心疑问）。
2. 追加到 `wiki/QUESTIONS.md`（checkbox 格式：`- [ ] 问题内容（opened YYYY-MM-DD）`）。
3. 追加 `wiki/log.md`。

## 与其他 phase 的联动

- 每次 `/llm-ingest` 摄入新来源时，都会检查 `wiki/QUESTIONS.md` 中的开放问题是否被回答；被回答的问题会在用户确认后移入 Answered 区块（该动作由 ingest phase 执行，此处不重复步骤）。
- 本 phase 本身只负责「新增」开放问题，不负责回答或关闭问题。
