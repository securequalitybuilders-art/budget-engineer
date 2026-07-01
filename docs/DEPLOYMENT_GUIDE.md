# Deployment Guide — DzeNhare Budget Engineer Studio

> **Repository:** https://github.com/securequalitybuilders-art/budget-engineer

---

## Prerequisites

- Node.js 20+
- npm 9+
- Git

---

## Local Development

```bash
git clone https://github.com/securequalitybuilders-art/budget-engineer
cd budget-engineer
npm install
npm run dev
```

Open http://localhost:5173.

---

## Build for Production

```bash
npm run build
```

Output is in `dist/`. Preview locally:

```bash
npm run preview
```

---

## Validation Before Deploy

```bash
npm run typecheck   # TypeScript errors
npm run lint        # ESLint warnings/errors
npm test            # Vitest (58 tests, 7 files)
npm run build       # Production bundle
```

---

## Deploy to Vercel

1. Push to GitHub (default branch: `main`).
2. Import repo at https://vercel.com/new.
3. **Framework preset:** Vite
4. **Build command:** `npm run build`
5. **Output directory:** `dist`
6. **Root directory:** `./`
7. vercel.json (already in repo) handles SPA routing fallback.

### vercel.json (already configured)

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

---

## Deploy to Netlify

1. Push to GitHub.
2. Import repo at https://app.netlify.com/start.
3. **Build command:** `npm run build`
4. **Publish directory:** `dist`
5. Add a `_redirects` file to `public/` (included):

```
/*    /index.html   200
```

---

## Deploy to Any Static Host

Since this is an SPA using `createBrowserRouter`, all routes must fall back to `index.html`.

### Static hosting notes

| Host | Fallback method |
|------|----------------|
| Vercel | vercel.json rewrites |
| Netlify | `public/_redirects` |
| GitHub Pages | 404.html → index.html trick or custom action |
| Firebase | `firebase.json` rewrites |
| Nginx | `try_files $uri /index.html;` |
| Apache | `.htaccess` RewriteRule |

---

## PWA / Offline

- vite-plugin-pwa with `generateSW` strategy.
- Service worker registered on first visit (auto-update).
- Precaches 16 entries (~2.1 MB).
- Test offline mode: build, serve `dist/` locally, open DevTools → Application → Service Workers → Offline.

---

## No Paid APIs

This application uses **zero paid APIs, zero cloud LLMs, zero external AI services**.

- All AI parsing and design generation is deterministic, local JavaScript.
- No OpenAI, no Anthropic, no Gemini, no Vercel AI SDK, no cloud dependency.
- The `@xenova/transformers` package is included but unused by default.
- WebLLM (`@mlc-ai/web-llm`) is **not installed** — it is an opt-in dependency only. To enable:

```bash
npm install @mlc-ai/web-llm
```

Then uncomment the WebLLM block in `src/lib/ai/ai-provider.ts`.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Blank page after deploy | Ensure SPA fallback is configured (vercel.json / _redirects) |
| `@mlc-ai/web-llm` build error | This package is externalized in vite.config.ts; ignore errors if not installed |
| Three.js chunk too large | Dynamic import of BimViewer is already lazy-loaded |
| PWA not updating | Service worker uses `autoUpdate`; close all tabs and reopen |
| CORS errors on fonts | All assets are local; no external CDN fonts used |
| `npm run build` fails on missing dep | Run `npm install` first |
