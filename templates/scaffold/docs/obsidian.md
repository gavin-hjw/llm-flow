# 在 Obsidian 中浏览知识库

`wiki/` 目录本质上是一个标准的 Obsidian vault，可以直接用 Obsidian 打开浏览、跳转和查看关系图谱。

## 打开方式

1. 打开 Obsidian，选择「Open folder as vault」。
2. 选择本项目的**根目录**（即包含 `raw/`、`wiki/`、`CLAUDE.md` 的目录）作为 vault 根。
   - 之所以以项目根目录而非 `wiki/` 子目录打开，是为了让 `.obsidian/` 配置（已随脚手架预置）生效。
3. 首次打开时 Obsidian 会自动读取 `.obsidian/app.json` 与 `.obsidian/core-plugins.json` 中的预置配置。

## 图谱（Graph）说明

- 知识图谱只展示 `wiki/concepts/`、`wiki/entities/`、`wiki/sources/`、`wiki/synthesis/` 下的内容页面及其 wikilink 关系。
- 所有 frontmatter 中标注了 `graph-excluded: true` 的页面（包括 `wiki/index.md`、`wiki/log.md`、`wiki/overview.md`、`wiki/QUESTIONS.md`，以及 `wiki/outputs/` 下所有产出文件）**不会出现在图谱中**，这是为了避免系统文件和一次性查询结果污染知识图谱的可视化效果。

## 页面模板（Templates）

- 已启用 Obsidian 的 `templates` 核心插件，并预置了 5 个页面模板，存放在：

  ```
  wiki/templates/
  ├── concept-template.md
  ├── entity-template.md
  ├── personal-writing-template.md
  ├── source-template.md
  └── synthesis-template.md
  ```

- 在 Obsidian 设置中，将「Templates folder location」指向 `wiki/templates`，即可通过 `Ctrl/Cmd + P` → `Insert template` 快速插入。
- 这些模板同时也是 LLM 在执行 `/llm-ingest` 等操作时创建新页面所依据的标准结构，人类和 LLM 使用同一套模板，保证格式一致。

## 预置的核心插件

`.obsidian/core-plugins.json` 中已启用：

- `file-explorer`：文件浏览器
- `global-search`：全局搜索
- `graph`：关系图谱
- `backlink` / `outgoing-link`：双向链接面板
- `tag-pane`：标签面板
- `page-preview`：悬停预览
- `templates`：页面模板

## 其他说明

- `.obsidian/app.json` 中设置了 `promptDelete: false`，删除文件时不再弹出二次确认（对应人类在 `raw/` 目录管理原始文件、在 wiki 中手动清理时更顺手；但仍需注意 `raw/` 目录只应由人类维护，LLM 不会修改其中内容）。
