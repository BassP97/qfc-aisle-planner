# qfc-map

Paste a shopping list, see which section of QFC Harvard Market each item is in, and check items off.

- `src/layout.json` — store sections (name, description fed to Jev, keywords, map rectangle). Built from a hand sketch and aisle-sign photos (positions are approximate).
- `src/worker.js` — Cloudflare Worker: `/api/classify` (Jev choice question per item, keyword fallback) and `/api/layout`.
- `public/` — static PWA.

Local dev: put `TYPESAFE_API_KEY=...` and `ACCESS_CODE=...` in `.env`, then `npm run dev` (http://localhost:8787).
Deploy: `npm install && npm run deploy && npx wrangler secret put TYPESAFE_API_KEY && npx wrangler secret put ACCESS_CODE`.
