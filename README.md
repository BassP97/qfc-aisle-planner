# qfc-map

Paste a shopping list, see which section of QFC Harvard Market each item is in, and check items off.

- `src/layout.json` — store sections (name, description fed to Jev, keywords, map rectangle). **Currently placeholder**; edit to match the real store.
- `src/worker.js` — Cloudflare Worker: `/api/classify` (Jev choice question per item, keyword fallback) and `/api/layout`.
- `public/` — static PWA.

Local dev: put `TYPESAFE_API_KEY=...` in `.env`, then `npm run dev` (http://localhost:8787).
Deploy: `npm install && npx wrangler secret put TYPESAFE_API_KEY && npm run deploy`.
