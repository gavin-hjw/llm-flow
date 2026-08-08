# 个人知识库脚手架

本目录由 `llmflow init` 生成，是一个可直接使用的个人知识库（LLM Wiki）项目结构。完整的 LLM 行为规范见 [`CLAUDE.md`](./CLAUDE.md)。

## 目录结构

```
.
├── raw/                  # 原始来源（人类拥有，LLM 只读）
│   ├── articles/         # 网络文章
│   ├── clippings/        # 剪藏内容
│   ├── images/           # 图片素材
│   ├── pdfs/             # PDF 文件
│   ├── notes/            # 零散笔记
│   └── personal/         # 个人写作（不参与 confidence 来源计数）
├── wiki/                 # 知识库主体（LLM 完全拥有和维护）
│   ├── sources/          # 来源页（每个 raw 文件对应一个 source 页）
│   ├── concepts/         # 概念页
│   ├── entities/         # 实体页
│   ├── synthesis/        # 综合分析页（REFLECT 产出）
│   ├── outputs/          # 查询结果持久化（QUERY / LINT 产出，graph-excluded）
│   ├── templates/        # Obsidian 页面模板
│   ├── index.md          # 索引（系统文件）
│   ├── log.md            # 操作日志（系统文件）
│   ├── overview.md        # 健康看板（系统文件）
│   └── QUESTIONS.md      # 开放问题队列（系统文件）
├── scripts/
│   └── lint.mjs          # LINT 健康检查（Node，9 项）
├── docs/
│   ├── qmd-setup.md       # qmd 检索引擎安装与使用
│   └── obsidian.md        # 用 Obsidian 打开和浏览知识库
├── .obsidian/             # 预置的 Obsidian vault 配置
└── CLAUDE.md              # LLM 行为契约（核心规范，务必先读）
```

## 核心心智模型

- **`raw/`**：人类负责收集的原始素材（文章、剪藏、图片、PDF、笔记、个人写作）。**LLM 只读，绝不修改**。
- **`wiki/`**：LLM 完全拥有和维护的知识库主体，供人类通过 Obsidian 浏览。每次摄入来源都会生成/更新 `sources/`、`concepts/`、`entities/` 下的页面，并保持索引和日志同步。
- **`wiki/outputs/`**：查询和分析结果的持久化存储，避免有价值的回答消失在对话历史里。

## 可用的 Slash 命令

在支持 Cursor/Claude 风格 slash 命令的客户端中，可以使用以下命令驱动知识库的日常操作（具体行为规范见 `CLAUDE.md`）：

| 命令 | 作用 |
|------|------|
| `/llm-ingest` | 摄入一个新来源：读取 raw 文件、用 Node crypto 计算 SHA-256、提取概念/实体、更新 wiki 页面与索引 |
| `/llm-query` | 基于知识库回答问题，答案溯源到具体 source 页，标注 confidence，可选持久化到 `wiki/outputs/` |
| `/llm-lint` | 运行 `node scripts/lint.mjs` 健康检查，核对 qmd 索引状态，生成检查报告 |
| `/llm-reflect` | 四阶段综合分析：反向检验 → 模式扫描 → 深度合成 → Gap Analysis，更新健康看板 |
| `/llm-merge` | 合并重复的概念/实体页面（含跨语言合并流程），绝不自动执行，需先与用户确认方案 |
| `/llm-add-question` | 向 `wiki/QUESTIONS.md` 添加一个待解决的开放问题 |
| `/llmflow` | 脚手架/模板自身的维护命令（初始化、更新） |

## 检索引擎（qmd）

知识库使用随 llm-flow **离线捆绑**的 `@tobilu/qmd`。安装本工作流后即可使用全局 `qmd` 命令，一般无需再次安装。详见 [`docs/qmd-setup.md`](./docs/qmd-setup.md)。

## 用 Obsidian 浏览

`wiki/` 是标准的 Obsidian vault 结构，可以直接用 Obsidian 打开项目根目录浏览、跳转链接和查看知识图谱。已预置基础插件配置（`.obsidian/`）和页面模板（`wiki/templates/`）。详见 [`docs/obsidian.md`](./docs/obsidian.md)。

## 保持脚手架/模板更新

如果 `llmflow` 工具本身发布了脚手架结构或 `CLAUDE.md` 规范的更新，可以用以下命令同步到已有项目：

```bash
# 更新整个项目（包括脚手架文件和已生成的知识库内容不冲突的部分）
llmflow update

# 只更新脚手架模板本身（scripts/、CLAUDE.md、wiki/templates/ 等），不动用户已有的 wiki 内容
llmflow update --scaffold
```

> 建议在执行 `llmflow update` 前先确认工作区没有未提交的改动，便于对比和回滚。
