# AGENTS.md

## Cursor Cloud specific instructions

### What this repo is
Client-side static site, no backend/database and no automated tests or linter configured. It contains two independent browser games:
- Space Nova — a Phaser 3 space game. Source in `src/`, entry `index.source.html` → `src/main.js`.
- Adventure — a standalone tile game served as static files from `adventure/` (`/adventure/index.html`).

Multiplayer (host/join co-op) uses PeerJS against an external signaling server, so it needs outbound network. `SOLO FLIGHT` needs no network and is the reliable smoke test.

### Running the dev server (important gotcha)
The `npm run dev` script is `vite index.source.html`. Under Vite 5 the positional arg is treated as the **root directory**, so it resolves to a non-existent dir and every route 404s (only `/@vite/client` responds). Do NOT rely on `npm run dev` as-is.

Run the dev server with the repo root as the Vite root instead:
- `npx vite` (add `--port <n>` / `--host` as needed).
- Open `/index.source.html` for the live dev source (HMR on `src/`).
- `/` serves the prebuilt bundle from the committed `index.html` (references `/assets/index-*.js`), not the live source.
- Adventure game: `/adventure/index.html`.

### Build
- `npm run build` — Vite build into `dist/` (entry `index.source.html`). Emits a large single chunk; the >500 kB chunk-size warning is expected.
- `npm run build:pages` — build then `scripts/sync-pages.mjs` copies the hashed bundle to `assets/` and writes root `index.html` for GitHub Pages. Note this regenerates committed `dist/`, `assets/`, and root `index.html`; only commit those if you intend to publish.

### Notes
- `node_modules/` and `dist/` are committed to the repo (`.gitignore` only ignores `.DS_Store`). Avoid committing incidental build/install churn in these paths.
