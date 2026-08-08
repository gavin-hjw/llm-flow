---
type: system-questions
graph-excluded: true
date: 2026-08-06
---

# 问题队列

> 此文件记录所有待解决和已解决的开放问题。LLM 在每次 INGEST 时会检查新来源是否能回答开放问题。
> 使用 checkbox 格式追踪问题状态。

## Open Questions

<!-- 无开放问题；用 /llm-add-question 或「我想搞清楚 …」追加：- [ ] 问题（opened YYYY-MM-DD） -->

## Answered Questions

<!-- 已回答问题移入此处：- [x] 问题（answered YYYY-MM-DD） -->

## 使用说明

- 用 `我想搞清楚 [问题]` 或 `/llm-add-question` 向 LLM 添加新问题
- LLM 会在摄入新来源时自动检查是否能回答已有问题
- 已回答的问题会从 Open Questions 移至 Answered Questions
