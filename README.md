# qfc-map

Paste a shopping list, see which section of QFC Harvard Market each item is in, and check items off.

- `src/layout.json` — store sections (name, description fed to Jev, keywords, map rectangle). Built from a hand sketch and aisle-sign photos (positions are approximate).
- `src/worker.js` — Cloudflare Worker: `/api/classify` (Jev choice question per item, keyword fallback) and `/api/layout`.
- `public/` — static PWA.

Local dev: put `TYPESAFE_API_KEY=...` and `ACCESS_CODE=...` in `.env`, then `npm run dev` (http://localhost:8787).
Deploy: `npm install && npm run deploy && npx wrangler secret put TYPESAFE_API_KEY && npx wrangler secret put ACCESS_CODE`.

## Dependencies

- Only dev dependency: `wrangler` (`^4.143.0`; the lockfile pins the exact resolved versions). The Worker and the page ship with no npm packages.
- `.npmrc` sets `min-release-age=3` (needs a recent npm; older versions, e.g. 9.x, ignore it, so check `npm -v`). The committed `package-lock.json` also pins every version; all were over 7 days old when locked (under the earlier 7-day setting).
- Install with `npm ci` (uses the lockfile exactly). Add `--ignore-scripts` to skip install scripts; this was tested with wrangler 4.143.0.
- `npm audit` reports advisories in `miniflare` (wrangler's local emulator). They are fixed only in releases newer than the cooldown, and we don't run the emulator (`npm run dev` uses `dev.js`). Once the fix is past the cooldown, `npm update wrangler` will pick it up.

## Security headers

`public/_headers` sets a strict Content-Security-Policy (everything from this origin only: no inline scripts or styles, no third-party hosts), plus nosniff, no-referrer, frame denial, and a locked-down Permissions-Policy. It applies to static files only; the Worker sets `no-store` and `nosniff` on `/api/*` itself. The font is self-hosted (`public/fonts/`, Josefin Sans, SIL OFL), so visits send nothing to Google. Because the CSP forbids inline styles, keep CSS in `public/style.css` and don't add `style="..."` attributes or inline scripts.
