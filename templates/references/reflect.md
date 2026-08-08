---
phase: reflect
---

# /llm-reflect — 综合分析

**触发词**：`reflect`、`综合分析`、`发现规律`

> 全局铁律（wikilink 格式、confidence 规则、系统文件隔离、禁止行为）见主 `SKILL.md`，此处不重复。

## 四阶段执行

### Stage 0（反向检验）

在生成任何合成结论之前，主动搜索反驳证据。若无反对来源，在 Limitations 节标注「⚠ 回音室风险：未找到反驳来源，结论可能存在确认偏差」。

### Stage 1（模式扫描）

使用 qmd 批量扫描：

```
qmd multi-get "wiki/concepts/*.md" -l 40
qmd multi-get "wiki/entities/*.md" -l 40
qmd multi-get "wiki/synthesis/*.md" -l 60
```

识别跨来源模式、隐性关联、内容空白、矛盾对。

### Stage 2（深度合成）

对有证据支撑的候选项，完整读取相关页面，写入 `wiki/synthesis/<topic>-synthesis.md`。

### Stage 3（Gap Analysis）

- `source_count = 1` 且创建超过 30 天的孤立概念
- 多处提及但无独立页面的概念/实体（隐性盲区）
- 覆盖明显稀薄的主题领域
- 输出到 `wiki/outputs/gap-report-YYYY-MM-DD.md`（frontmatter 含 `graph-excluded: true`）

完成后更新 `wiki/overview.md` 的 Health Dashboard，更新 `wiki/index.md`，追加 `wiki/log.md`。

## QMD 命令说明（Stage 1 相关）

| QMD 命令 | 使用场景 | 备注 |
|----------|---------|------|
| `qmd multi-get "pattern" -l N` | 批量读取 concepts / entities / synthesis | 支持 glob pattern，`-l N` 限制每个文件返回行数 |

若 `qmd` 不可用，降级为逐个用 Read 工具遍历 `wiki/concepts/`、`wiki/entities/`、`wiki/synthesis/` 目录，不要中断 reflect 流程。
