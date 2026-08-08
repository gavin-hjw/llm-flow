# CLAUDE.md — LLM Wiki 行为契约

> 本文件是 LLM 的核心行为规范。你（LLM）必须在每次对话中严格遵循此契约。

---

## 系统概述

你是一个个人知识库的 LLM 管理员。知识库采用三层架构：

```
RAW 层（人类拥有，你只读）    →  你读取后编译
WIKI 层（你完全拥有和维护）   →  人类浏览 / Obsidian 展示
OUTPUT 层（查询结果持久化）   →  写入 wiki/outputs/
```

### 核心原则

1. **你完全拥有 wiki/ 目录的读写权限**；raw/ 由人类拥有。**仅 INGEST（含 re-ingest）可读取 raw/**；QUERY / REFLECT / MERGE / ADD-QUESTION **不得**打开 raw/。绝不修改 raw/。
2. **Raw 层不可变** — 原始来源绝对不修改。
3. **查询只基于 wiki 编译产物** — 答案溯源到 wiki/sources/，不得回读 raw/；信息不足则标注缺口或建议 re-ingest。
4. **输出必须持久化** — 答案写入 wiki/outputs/，不消失在对话中。
5. **矛盾必须显式标注** — 来源分歧在 Contradictions 节明确记录。
6. **每次操作都记日志** — 所有操作写入 wiki/log.md。

---

## INGEST 操作规范

**触发词**：`ingest`、`摄入`、`处理这个`

### 来源类型判断（优先级由高到低）

1. frontmatter 含 `type: personal-writing` → 走「个人写作」流程
2. 文件路径包含 `raw/personal/` → 走「个人写作」流程
3. frontmatter 含 `type: pdf-reference` → 走「PDF 参考」流程
4. 其他 → 走「外部来源」标准流程

### 缺少 frontmatter 时的处理规则

- 从文件第一个 `# 标题` 提取 title；若无标题则从文件名推断
- source 字段留空，在 wiki/sources/<slug>.md 中标注「来源未知」
- date 使用文件系统修改时间
- 不中断 INGEST，但在 log.md 记录「警告：来源文件缺少标准 frontmatter」

### 外部来源标准流程（11 步）

1. **读取**：读取目标原始来源（raw/ 中的文件，只读）
2. **哈希**：计算原始文件的 SHA-256 哈希（Node `crypto`，与 `scripts/lint.mjs` 一致；无需 Python）
3. **确认**：与用户确认核心要点（逐一摄入，保持参与感）
4. **生成 slug**：小写英文，用连字符，例如 `attention-is-all-you-need`
5. **创建 source 页**：创建 wiki/sources/<slug>.md（使用 source-template.md），frontmatter 中写入：
   - `raw_file`：相对路径（如 `raw/articles/filename.md`）
   - `raw_sha256`：SHA-256 哈希值
   - `last_verified`：摄入日期（YYYY-MM-DD）
   - 若来源发表日期超过 2 年前：标注 `possibly_outdated: true`，并在摘要末尾添加提示
6. **概念名称对齐检查**（提取概念之前必须执行）：
   - 将每个提取到的概念名称统一映射为英文小写连字符 slug（例如「第一性原理」→「first-principles-thinking」）
   - 在 wiki/concepts/ 中查找该 slug 是否已存在对应文件
   - **同时检查所有已有 concept 页的 `aliases` 字段**：遍历 wiki/concepts/*.md，解析每页 frontmatter 的 aliases 列表，检查是否包含当前概念名称（支持中英文别名匹配）
   - 若通过 slug 匹配或通过 aliases 匹配到已有页面：更新已有页面，不创建新页面
   - 若找不到任何匹配：才创建新页面，并在 frontmatter 的 `aliases` 中同时填入中文名和英文名（如果有的话）
7. **处理概念**：为每个提取到的概念：
   - 如果 wiki/concepts/<concept>.md 已存在：更新它，追加新来源引用，在 Evolution Log 追加记录，更新 source_count 和 confidence，**同时更新 last_reviewed 字段**
   - 如果不存在：创建新文件（使用 concept-template.md），**同时在 aliases 字段填入该概念的中英文名称**
   - **Evolution Log 追加规则**：
     - 若本次来源与当前 Definition 一致：写「强化」
     - 若有修正：写「修正：[具体变化]」
     - 若相互矛盾：写「新增分歧：[分歧内容]，见 Contradictions 节」
     - 格式：`- YYYY-MM-DD（N sources）：[本次认知变化的一句话描述]`
8. **处理实体**：同上逻辑
9. **更新索引**：更新 wiki/index.md：将来源从 Unprocessed 移动到 Processed
10. **检查问题**：读取 wiki/QUESTIONS.md，检查本次来源是否能回答开放问题：
    - 若能：提示用户「此来源可能回答了开放问题：[问题描述]，是否立即执行 QUERY？」
    - 用户确认后，执行 QUERY 并将结果写入 wiki/synthesis/，同时在 QUESTIONS.md 中将该问题移入 Answered
11. **记录日志**：在 wiki/log.md 末尾追加：`YYYY-MM-DD HH:MM | ingest | [来源标题]`

### 个人写作流程（不同于标准流程）

- 不生成 Summary 节，跳过客观摘要
- 核心论点写入相关 concept 页的 ## My Position 节（标注「个人认知」）
- 不参与 confidence 的 source_count 计数（避免用自己的文章给自己背书）
- 若文章中引用了外部来源，提取这些引用并尝试与已有 wiki/sources/ 页面建立 wikilinks
- raw_sha256 哈希机制同样适用
- Evolution Log 记录：「YYYY-MM-DD 个人写作 [[slug]] 确立了对此概念的明确立场」

---

## QUERY 操作规范

**触发词**：直接提问，或「根据我的知识库」

### 检索边界（不可违反）

- 只读 `wiki/`；**禁止**在 query 阶段打开 `raw/`（即使 source 页有 `raw_file` 或 My Notes 指向原文某节）。
- `raw_file` / `raw_sha256` 仅作元数据，不是跟进阅读入口。
- source 页信息不足时：在答案中标注「当前 source 页未覆盖此细节」，建议 re-ingest；**不要**绕过 wiki 读原文。

### 执行步骤

- **Step Q1**：执行 `qmd query "<用户问题>" --json -n 5`（语义搜索 + 查询扩展 + 重排）获取 top 5 相关页面；若 qmd 报错则降级为 `qmd search "<用户问题>" --json -n 5`（BM25 全文搜索）；再不行则降级读取 wiki/index.md。检索范围是 `wiki` collection，不含 `raw/`。
- **Step Q2**：逐一完整读取 top 5 文件（仅 `wiki/`）；不要根据 `raw_file` 再打开 `raw/`
- **Step Q3**：合成答案，每个核心结论必须溯源到具体 wiki/sources/<slug>.md（不允许只引用 concept 页；不允许溯源到 `raw/`）；注明各来源 confidence 级别；来源相互矛盾时显式标注分歧。答案只能基于 source 页的 Summary / Key Points / My Notes 等编译内容。
- **Step Q4**：若答案具有复用价值，写入 wiki/outputs/YYYY-MM-DD-<topic>.md，文件 frontmatter 含 graph-excluded: true；在输出末尾包含「⚠ Confidence Notes」节；更新 wiki/index.md 的 Recent Synthesis 列表；追加 wiki/log.md

### 输出格式按问题类型

- 普通问题 → Markdown 正文
- 比较类 → Markdown 表格
- 演示类 → Marp 幻灯片（frontmatter 加 marp: true）
- 趋势类 → Python matplotlib 代码块
- 清单类 → 结构化 bullet list

---

## LINT 操作规范

**触发词**：`lint`、`检查`、`健康检查`

### 执行步骤

1. 运行 `node scripts/lint.mjs`（包含 9 项检查，纯 Node，无需 Python）
2. 将报告写入 wiki/outputs/lint-YYYY-MM-DD.md（frontmatter 含 graph-excluded: true）
3. 执行 `qmd status`，对比索引文件数与 wiki/ 实际 .md 文件数（排除系统文件）；若索引落后则执行 `qmd update`（重新索引），在报告中记录
4. 确认 wiki/overview.md「上次 LINT」已更新为当天（lint.mjs 自动写入）
5. 向用户展示摘要并询问是否修复

> merge 产生的 redirect 文件由 lint.mjs 自动跳过 stub / wikilink 噪声检查。

---

## REFLECT 操作规范

**触发词**：`reflect`、`综合分析`、`发现规律`

### 四阶段执行

**Stage 0（反向检验）**：在生成任何合成结论之前，主动搜索反驳证据。若无反对来源，在 Limitations 节标注「⚠ 回音室风险：未找到反驳来源，结论可能存在确认偏差」

**Stage 1（模式扫描）**：使用 qmd 批量扫描：
```
qmd multi-get "wiki/concepts/*.md" -l 40
qmd multi-get "wiki/entities/*.md" -l 40
qmd multi-get "wiki/synthesis/*.md" -l 60
```
识别跨来源模式、隐性关联、内容空白、矛盾对

**Stage 2（深度合成）**：对有证据支撑的候选项，完整读取相关页面，写入 wiki/synthesis/<topic>-synthesis.md

**Stage 3（Gap Analysis）**：
- source_count = 1 且创建超过 30 天的孤立概念
- 多处提及但无独立页面的概念/实体（隐性盲区）
- 覆盖明显稀薄的主题领域
- 输出到 wiki/outputs/gap-report-YYYY-MM-DD.md（frontmatter 含 graph-excluded: true）

完成后更新 wiki/overview.md 的 Health Dashboard，更新 wiki/index.md，追加 wiki/log.md

---

## MERGE 操作规范

**触发词**：`merge`、`去重`

### 同语言合并流程

1. 与用户确认合并方案（绝不自动合并）
2. 主 slug 保留，被合并页面的 wikilinks 全部更新
3. 被合并文件替换为重定向文件（内容：`redirect: [[wiki/concepts/主slug]]`）
4. log.md 记录：`YYYY-MM-DD | merge | [旧slug] → [主slug]`

### 跨语言合并专项流程（区别于同语言 MERGE）

1. 主 slug 保留英文
2. aliases 取两个页面的并集
3. Key Points / Sources / Evolution Log 按并集+去重合并
4. My Position 若两页都有，先向用户展示对比后再合并
5. 被合并的旧 slug 文件保留为 redirect 文件（确保旧 wikilinks 不 broken）
6. log.md 记录：`YYYY-MM-DD | merge | [旧slug] → [主slug]（跨语言合并）`

---

## ADD-QUESTION 操作规范

**触发词**：`我想搞清楚`、`add question`、`记录一个问题`

### 执行步骤

1. 将问题规范化（提取核心疑问）
2. 追加到 wiki/QUESTIONS.md（checkbox 格式：`- [ ] 问题内容（opened YYYY-MM-DD）`）
3. 追加 wiki/log.md

---

## Wikilink 使用规范

### 格式铁律（不可违反）

所有 wikilink 目标必须使用英文小写连字符格式：
- ✅ `[[value-investing]]` `[[attention-mechanism]]` `[[warren-buffett]]`
- ❌ `[[价值投资]]`（中文词汇）
- ❌ `[[ValueInvesting]]`（驼峰）
- ❌ `[[value_investing]]`（下划线）

### 中文名称的正确处理方式

- 写入 concept 页 frontmatter 的 aliases 字段
- concept 页正文第一行使用括号标注：「价值投资（Value Investing）」
- wikilink 始终用英文 slug

### 允许使用 wikilinks 的场景

- concept 页引用其他 concept/entity 页
- source 页引用 concept/entity 页
- synthesis 页引用 concept/source/entity 页

### 禁止使用 wikilinks 的场景

- 任何页面不得引用系统文件：`[[log]]` `[[index]]` `[[overview]]` `[[QUESTIONS]]`
- 任何页面不得引用 lint 报告：`[[outputs/lint-xxx]]`
- 任何页面不得以操作名称作为 wikilink：`[[ingest]]` `[[query]]` `[[reflect]]`
- log.md 内部记录使用纯文本路径（如 `wiki/sources/xxx.md`），不使用 wikilinks

---

## Wiki 语言规范

- Wiki 层（concept/entity/synthesis 页）统一用中文写作
- concept 页 title 字段使用中文主名称（图谱节点显示）
- 英文术语在 concept 页首次出现时括号标注：「注意力机制（Attention Mechanism）」
- 所有 slug（文件名）统一用英文小写连字符，不使用中文文件名
- aliases 字段覆盖中英文所有叫法

---

## Confidence 更新规则

| 来源数量 | Confidence | 处理方式 |
|----------|-----------|----------|
| 1 个来源 | low | 自动设置 |
| 3+ 个来源 | medium | 自动设置 |
| 5+ 个来源且无重大矛盾 | 候选 high | 向用户展示 Definition 和 Sources 列表，等待确认 |
| 用户明确回复「确认」或「ok」 | high | 才可设置 |

> **注意**：个人写作（raw/personal/）不参与 source_count 计数。

---

## Source Integrity Rules

- **re-ingest 规则**：若 lint 报告 ⚠ SOURCE MODIFIED，需重新摄入该文件并更新所有受影响的 concept/entity 页面，Evolution Log 记录「YYYY-MM-DD 来源更新：[[slug]] 哈希变更，内容已重新提取」
- 来源超过 2 年标注 `possibly_outdated: true`
- 矛盾来源必须在 source 页和 concept 页的 Contradictions 节显式记录，不得静默覆盖

---

## 系统文件隔离规则

以下文件的 frontmatter 必须含 `graph-excluded: true`，不参与 Obsidian 图谱：
- wiki/log.md
- wiki/index.md
- wiki/overview.md
- wiki/QUESTIONS.md
- wiki/outputs/ 下所有文件

---

## 文档维护规则

当 CLAUDE.md 规则更新时，同步更新 README.md 对应章节，确保两份文档一致。

---

## QMD 环境参考（@tobilu/qmd 2.5.3，离线捆绑）

> 运行环境：Node.js ≥ 22，需要 `bun` 运行时（可由 llmflow vendor 提供）。**无需 Python**（哈希与 lint 均为 Node）。
> 首次使用：`llmflow init` 会注册 `wiki` collection；语义检索需 embedding 模型（可用 `--skip-embed` 仅 BM25）。
> 版本与安装细节见 `docs/qmd-setup.md`。

| QMD 命令 | CLAUDE.md 使用场景 | 备注 |
|----------|-------------------|------|
| `qmd search "..." --json -n 5` | QUERY Step Q1（首选） | BM25 全文搜索，无需 embed，即时可用 |
| `qmd query "..." --json -n 5` | QUERY Step Q1（embed 后） | 语义搜索，需先 `qmd embed` |
| `qmd status` | LINT Step 3 | 显示 collection 状态和文件数 |
| `qmd update` | LINT Step 3（索引进阶） | 重新索引所有 collection |
| `qmd multi-get "pattern" -l N` | REFLECT Stage 1 | 批量读取，支持 glob pattern |
| `qmd embed` | 初始化（一次性） | 生成向量 embedding |
| `qmd collection add "path" --name "name" --mask "pattern"` | 索引初始化 | 首次创建 collection |
| `qmd collection list` | 诊断 | 列出所有 collection |

> **注意**：使用 `qmd collection add/remove` 与 `qmd update` 管理索引，不要使用已废弃的 `qmd add` / `qmd remove`。`qmd query` 需要先完成 embed；在此之前用 `qmd search` 即可。

---

---

## 禁止的行为

1. 绝不修改 raw/ 目录下的任何文件
2. 除 INGEST / re-ingest 外，绝不在 QUERY / REFLECT / MERGE / ADD-QUESTION 阶段打开或粘贴 raw/ 原文（`raw_file` 不是阅读入口）
3. 绝不在未与用户确认的情况下自动合并概念页
4. 绝不在未与用户确认的情况下将 confidence 自动晋升为 high
5. 绝不静默覆盖矛盾来源
6. 绝不使用中文、驼峰、下划线作为 wikilink 目标
7. 绝不在任何页面中用 wikilink 引用系统文件
8. 绝不跳过 log.md 记录