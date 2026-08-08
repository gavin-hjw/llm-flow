# QMD 检索引擎配置指南

本知识库使用随 **llm-flow** 离线捆绑的 [`@tobilu/qmd`](https://www.npmjs.com/package/@tobilu/qmd)（当前捆绑 **2.5.3**）作为本地全文/语义检索引擎。

安装 `llmflow` 后会同时得到全局命令 `qmd`（指向本仓库 `vendor/qmd`），**无需再执行** `npm install -g @tobilu/qmd`。

## 环境要求

- **Node.js ≥ 22**（qmd 2.x engines）
- 已通过本工作流安装：`npm install && npm run build && npm link`（postinstall 校验 vendor）

## 索引初始化

`llmflow init` 会自动尝试：

```bash
qmd collection add wiki/ --name wiki --mask "**/*.md"
```

`llmflow init` 默认会：注册 collection、同步 `vendor/models` → `~/.cache/qmd/models`、执行 `qmd embed`（离线模型就绪时不访问外网）。

只要 BM25、不要向量：

```bash
llmflow init --skip-embed
```

维护者刷新模型包：`npm run vendor:fetch-models`（见仓库 `vendor/models/README.md`）。

## 常用命令

| 命令 | 用途 |
|------|------|
| `qmd search "<query>" --json -n 5` | BM25 全文搜索（无需 embed） |
| `qmd query "<query>" --json -n 5` | 混合/重排检索（embed 后效果更好） |
| `qmd vsearch "<query>" --json -n 5` | 语义检索 |
| `qmd embed` | 生成向量（可能下载模型） |
| `qmd update` | 重新索引 |
| `qmd status` | collection 状态 |
| `qmd multi-get "wiki/concepts/*.md" -l 40` | 批量读取 |
| `qmd collection list` | 列出 collection |

## 维护者刷新离线包

在有网络的机器上，于 llm-flow 仓库执行：

```bash
npm run vendor:fetch          # qmd
npm run vendor:fetch-bun      # bun
npm run vendor:fetch-models   # embedding gguf
```
