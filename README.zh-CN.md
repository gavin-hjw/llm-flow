# @thundersoft/llmflow

在空目录一键初始化完整 LLM Wiki 知识库，并生成 Cursor/Claude 斜杠命令 skills。

## 安装

需要 **Node.js ≥ 22**。

```bash
cd llm-flow
npm install          # 校验 vendor/qmd 离线包
npm run build
npm link             # 同时提供 llmflow 与 qmd 命令
```

`qmd` 与 `bun` 已捆绑在 `vendor/`，**无需**再全局安装。  
embedding 模型在 `vendor/models/`，安装/`init` 时同步到 `~/.cache/qmd/models`。  
**无需 Python**（健康检查为 `node scripts/lint.mjs`）。

## 初始化知识库

```bash
mkdir my-wiki && cd my-wiki
llmflow init --tools cursor
```

`--tools` 可逗号分隔：`cursor`, `claude`, `codex`, `opencode`（默认 `cursor`）。

## 斜杠命令

| 命令 | 作用 |
|------|------|
| `/llmflow` | 按意图自动路由 |
| `/llm-ingest` | 摄入 raw 来源 |
| `/llm-query` | 查询知识库 |
| `/llm-lint` | 健康检查 |
| `/llm-reflect` | 综合分析 |
| `/llm-merge` | 去重合并 |
| `/llm-add-question` | 记录开放问题 |

## 维护

```bash
llmflow status
llmflow update              # 刷新 skills + lint.mjs + wiki/templates
llmflow update --scaffold   # 额外刷新 CLAUDE.md / README / docs
```

只改本仓库 `templates/`，目标项目执行 `llmflow update`。
