---
phase: query
---

# /llm-query — 查询

**触发词**：直接提问，或「根据我的知识库」

> 全局铁律（wikilink 格式、confidence 规则、系统文件隔离、禁止行为）见主 `SKILL.md`，此处不重复。

## 检索边界（不可违反）

- **只读 `wiki/`**：Q1 命中与 Q2 打开的文件必须全部位于 `wiki/`（通常为 `sources/` / `concepts/` / `entities/` / `synthesis/`）。
- **禁止打开 `raw/`**：即便 source 页 frontmatter 含 `raw_file`，或 My Notes 指向「原文某节」，也**不得**在 query 阶段打开、引用或粘贴 `raw/` 原文。
- **信息不足时**：在答案 / Confidence Notes 中显式标注「当前 source 页未覆盖此细节」，可建议用户对该来源执行 `/llm-ingest`（或 re-ingest）补全；**不要**绕过 wiki 去读原文。
- **`raw_file` / `raw_sha256` 仅作元数据**：用于完整性核对与溯源标识，不是「跟进阅读」入口。

## 执行步骤

- **Step Q1**：执行 `qmd query "<用户问题>" --json -n 5`（语义搜索 + 查询扩展 + 重排）获取 top 5 相关页面；若 `qmd` 报错则降级为 `qmd search "<用户问题>" --json -n 5`（BM25 全文搜索）；再不行则降级读取 `wiki/index.md`。检索范围是已注册的 `wiki` collection，**不含** `raw/`。
- **Step Q2**：逐一完整读取 top 5 文件（仅 `wiki/` 下路径）。**不要**根据 `raw_file` 再打开 `raw/`。
- **Step Q3**：合成答案，每个核心结论必须溯源到具体 `wiki/sources/<slug>.md`（不允许只引用 concept 页；**不允许**溯源到 `raw/` 路径）；注明各来源 confidence 级别；来源相互矛盾时显式标注分歧。source 页的 Summary / Key Points / My Notes 即编译产物边界——答案只能基于这些内容。
- **Step Q4**：若答案具有复用价值，写入 `wiki/outputs/YYYY-MM-DD-<topic>.md`，文件 frontmatter 含 `graph-excluded: true`；在输出末尾包含「⚠ Confidence Notes」节；更新 `wiki/index.md` 的 Recent Synthesis 列表；追加 `wiki/log.md`。

## 输出格式按问题类型

- 普通问题 → Markdown 正文
- 比较类 → Markdown 表格
- 演示类 → Marp 幻灯片（frontmatter 加 `marp: true`）
- 趋势类 → Python matplotlib 代码块
- 清单类 → 结构化 bullet list

## QMD 命令说明（Step Q1 相关）

| QMD 命令 | 使用场景 | 备注 |
|----------|---------|------|
| `qmd search "..." --json -n 5` | 首选，即时可用 | BM25 全文搜索，无需 embed |
| `qmd query "..." --json -n 5` | embed 后可用 | 语义搜索，需先 `qmd embed`，首次自动下载 1.28GB 模型 |

> `qmd query` 首次使用会自动下载 embedding 模型（1.28GB），在此之前用 `qmd search` 即可。若两者都不可用（未安装 `qmd` 或报错），直接降级读取 `wiki/index.md` 定位相关页面，不要中断查询流程。
