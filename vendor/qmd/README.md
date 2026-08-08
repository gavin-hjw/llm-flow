# vendor/qmd

Offline install of `@tobilu/qmd@2.5.3` and its runtime dependencies (Node ≥ 22).

- Used by `bin/qmd-shim.js` (global `qmd` after `npm link`)
- Used by `llmflow init` for `collection add`
- Refresh (online maintainer machine): `npm run vendor:fetch` from repo root
- GPU CUDA/Vulkan optional binaries are pruned to keep the bundle pushable to GitHub
