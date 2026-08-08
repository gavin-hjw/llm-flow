# @thundersoft/llmflow

Scaffold a full LLM Wiki knowledge base in an empty directory, plus Cursor/Claude slash-command skills.

## Install

Requires **Node.js ≥ 22**.

```bash
cd llm-flow
npm install          # also verifies vendor/qmd (offline bundle)
npm run build
npm link             # installs `llmflow` + `qmd` shims
```

`qmd` and `bun` are bundled under `vendor/` — no separate global installs.
Embedding GGUF models live in `vendor/models/` and sync to `~/.cache/qmd/models` on install/init.
No Python required (lint is Node: `scripts/lint.mjs`).

## Initialize a wiki

```bash
mkdir my-wiki && cd my-wiki
llmflow init --tools cursor
```

`--tools` accepts comma-separated values: `cursor`, `claude`, `codex`, `opencode` (default: `cursor`).

## Slash commands

| Command | Purpose |
|---------|---------|
| `/llmflow` | Auto-route by intent |
| `/llm-ingest` | Ingest raw sources |
| `/llm-query` | Query the knowledge base |
| `/llm-lint` | Health check |
| `/llm-reflect` | Synthesis / pattern discovery |
| `/llm-merge` | Deduplicate and merge |
| `/llm-add-question` | Record an open question |

## Maintenance

```bash
llmflow status
llmflow update              # refresh skills + lint.mjs + wiki/templates
llmflow update --scaffold   # also refresh CLAUDE.md / README / docs
```

Edit `templates/` in this repo only; run `llmflow update` in target projects to apply changes.
