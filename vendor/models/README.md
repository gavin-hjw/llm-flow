# Offline embedding / rerank / expansion models (qmd)

These GGUF files are copied into `~/.cache/qmd/models` on `npm install` / `llmflow init`
so `qmd embed` / semantic search do **not** need HuggingFace downloads.

| File | Role |
|------|------|
| `hf_ggml-org_embeddinggemma-300M-Q8_0.gguf` | Embedding (~318 MB) |
| `hf_ggml-org_qwen3-reranker-0.6b-q8_0.gguf` | Rerank (~610 MB) |
| `hf_tobil_qmd-query-expansion-1.7B-q4_k_m.gguf` | Query expansion (~1.2 GB) |

Maintainer refresh (from a machine that already ran `qmd embed` once):

```bash
npm run vendor:fetch-models
```

**Git:** `*.gguf` 不入库（见 `.gitignore`）。本机用 `npm run vendor:fetch-models` 拉取，或从已有 `~/.cache/qmd/models` 拷贝。
