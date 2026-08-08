---
phase: ingest
---

# /llm-ingest — 摄入

**触发词**：`ingest`、`摄入`、`处理这个`

> 全局铁律（wikilink 格式、confidence 规则、系统文件隔离、禁止行为）见主 `SKILL.md`，此处不重复。

## 来源类型判断（优先级由高到低）

1. frontmatter 含 `type: personal-writing` → 走「个人写作流程」
2. 文件路径包含 `raw/personal/` → 走「个人写作流程」
3. frontmatter 含 `type: pdf-reference` → 走「PDF 参考」流程
4. 其他 → 走「外部来源标准流程」

## 缺少 frontmatter 时的处理规则

- 从文件第一个 `# 标题` 提取 title；若无标题则从文件名推断。
- `source` 字段留空，在 `wiki/sources/<slug>.md` 中标注「来源未知」。
- `date` 使用文件系统修改时间。
- 不中断 INGEST，但在 `log.md` 记录「警告：来源文件缺少标准 frontmatter」。

## 外部来源标准流程（11 步）

1. **读取**：读取目标原始来源（`raw/` 中的文件，只读）。
2. **哈希**：计算原始文件的 SHA-256 哈希（Node `crypto`，与 `scripts/lint.mjs` 一致；无需 Python）。
3. **确认**：与用户确认核心要点（逐一摄入，保持参与感）。
4. **生成 slug**：小写英文，用连字符，例如 `attention-is-all-you-need`。
5. **创建 source 页**：创建 `wiki/sources/<slug>.md`（使用 `source-template.md`），frontmatter 中写入：
   - `raw_file`：相对路径（如 `raw/articles/filename.md`）
   - `raw_sha256`：SHA-256 哈希值
   - `last_verified`：摄入日期（YYYY-MM-DD）
   - 若来源发表日期超过 2 年前：标注 `possibly_outdated: true`，并在摘要末尾添加提示
6. **概念名称对齐检查**（提取概念之前必须执行）：
   - 将每个提取到的概念名称统一映射为英文小写连字符 slug（例如「第一性原理」→ `first-principles-thinking`）。
   - 在 `wiki/concepts/` 中查找该 slug 是否已存在对应文件。
   - **同时检查所有已有 concept 页的 `aliases` 字段**：遍历 `wiki/concepts/*.md`，解析每页 frontmatter 的 `aliases` 列表，检查是否包含当前概念名称（支持中英文别名匹配）。
   - 若通过 slug 匹配或通过 aliases 匹配到已有页面：更新已有页面，不创建新页面。
   - 若找不到任何匹配：才创建新页面，并在 frontmatter 的 `aliases` 中同时填入中文名和英文名（如果有的话）。
7. **处理概念**：为每个提取到的概念：
   - 如果 `wiki/concepts/<concept>.md` 已存在：更新它，追加新来源引用，在 Evolution Log 追加记录，更新 `source_count` 和 `confidence`，**同时更新 `last_reviewed` 字段**。
   - 如果不存在：创建新文件（使用 `concept-template.md`），**同时在 aliases 字段填入该概念的中英文名称**。
   - **Evolution Log 追加规则**：
     - 若本次来源与当前 Definition 一致：写「强化」。
     - 若有修正：写「修正：[具体变化]」。
     - 若相互矛盾：写「新增分歧：[分歧内容]，见 Contradictions 节」。
     - 格式：`- YYYY-MM-DD（N sources）：[本次认知变化的一句话描述]`
8. **处理实体**：同上逻辑（`wiki/entities/<entity>.md`，`entity-template.md`）。
9. **更新索引**：更新 `wiki/index.md`：将来源从 Unprocessed 移动到 Processed。
10. **检查问题**：读取 `wiki/QUESTIONS.md`，检查本次来源是否能回答开放问题：
    - 若能：提示用户「此来源可能回答了开放问题：[问题描述]，是否立即执行 QUERY？」
    - 用户确认后，执行 QUERY 并将结果写入 `wiki/synthesis/`，同时在 `QUESTIONS.md` 中将该问题移入 Answered。
11. **记录日志**：在 `wiki/log.md` 末尾追加：`YYYY-MM-DD HH:MM | ingest | [来源标题]`

## 个人写作流程（不同于标准流程）

当来源判断为「个人写作」时，改用以下规则（覆盖上面第 3、5、7 步中的默认行为）：

- 不生成 Summary 节，跳过客观摘要。
- 核心论点写入相关 concept 页的 `## My Position` 节（标注「个人认知」）。
- 不参与 confidence 的 `source_count` 计数（避免用自己的文章给自己背书）。
- 若文章中引用了外部来源，提取这些引用并尝试与已有 `wiki/sources/` 页面建立 wikilinks。
- `raw_sha256` 哈希机制同样适用。
- Evolution Log 记录：「YYYY-MM-DD 个人写作 [[slug]] 确立了对此概念的明确立场」。

其余步骤（哈希、slug、索引更新、问题检查、日志记录）与外部来源标准流程一致。
