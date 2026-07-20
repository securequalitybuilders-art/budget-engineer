# Deployment Guide — Budget Engineer

> **Repository:** https://github.com/securequalitybuilders-art/budget-engineer  
> **Version:** v4.0.0  
> **Updated:** 2026-07-19

---

## Overview

Budget Engineer is a **local-first single-page application (SPA)**. It has no server-side backend, no cloud database, and no remote authentication service. All project data is stored in **IndexedDB** in the user's browser.

This guide covers all supported deployment modes, from local development to production hosting.

---

## Deployment Profiles

| Profile | Description | Best For |
|---------|-------------|----------|
| **Local Workstation** | Run via `npm run dev` or production build preview | Single-user evaluation, development, testing |
| **Office / Local-Network** | Static hosting on intranet (nginx, Apache, IIS) | Supervised team use within an office |
| **Docker Hosted** | Containerized with nginx via Docker Compose | Demo environments, internal deployments |
| **Static Hosting** | Vercel, Netlify, Cloudflare Pages, GitHub Pages | Live demos, pilot rollouts, professional use |

All profiles share the same local-first data model. See [OPERATIONAL_READINESS.md](OPERATIONAL_READINESS.md) for data storage, backup, and operational guidance.

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
npm run typecheck   # TypeScript strict check (0 errors expected)
npm run lint        # ESLint (0 errors, within 25-warning budget)
npm test            # Full Vitest suite
npm run build       # Production bundle + PWA generation
```

---

## Deployment Profile: Local Workstation

**Infrastructure:** Node.js 20+, modern browser (Chrome, Firefox, Edge, Safari)

```bash
npm run build
npm run preview     # Serves dist/ on http://localhost:4173
```

Data is stored in the browser's IndexedDB. Use project export (ZIP) for backup.

---

## Deployment Profile: Docker Hosted

### Dockerfile (included)

Multi-stage build: Node.js builder → nginx runtime. Outputs ~2 MB static image.

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

FROM nginx:stable-alpine AS runtime
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Docker Compose (included)

```yaml
version: "3.9"
services:
  budget-engineer:
    build: .
    ports:
      - "8080:80"
    restart: unless-stopped
```

```bash
docker compose up -d
# Open http://localhost:8080
```

### nginx Configuration (included)

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
    gzip_min_length 256;

    location / {
        try_files $uri $uri/ /index.html;  # SPA fallback
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|ttf|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## Deployment Profile: Static Hosting

### Vercel

1. Push to GitHub (default branch: `main`).
2. Import repo at https://vercel.com/new.
3. **Framework preset:** Vite
4. **Build command:** `npm run build`
5. **Output directory:** `dist`
6. **Root directory:** `./`
7. `vercel.json` (already in repo) handles SPA routing fallback.

**vercel.json:**
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

### Netlify

1. Push to GitHub.
2. Import repo at https://app.netlify.com/start.
3. **Build command:** `npm run build`
4. **Publish directory:** `dist`
5. `public/_redirects` (included) handles SPA fallback:
```
/*    /index.html   200
```

### Any Static Host

Since this is an SPA with `createBrowserRouter`, **all routes must fall back to `index.html`**.

| Host | Fallback method |
|------|----------------|
| Vercel | `vercel.json` rewrites |
| Netlify | `public/_redirects` |
| GitHub Pages | 404.html → index.html trick or custom action |
| Firebase | `firebase.json` rewrites |
| Nginx | `try_files $uri /index.html;` |
| Apache | `.htaccess` RewriteRule |

---

## PWA / Offline

- **vite-plugin-pwa** with `generateSW` strategy.
- Service worker registered on first visit (auto-update).
- Precaches static assets for offline operation.
- All project data in IndexedDB — available offline after first sync.
- Test offline mode: build → serve `dist/` → DevTools → Application → Service Workers → Offline.

---

## No Paid APIs

This application uses **zero paid APIs, zero cloud LLMs, zero external AI services**.

- All AI parsing and design generation is deterministic, local JavaScript.
- No OpenAI, no Anthropic, no Gemini, no Vercel AI SDK, no cloud dependency.
- WebLLM (`@mlc-ai/web-llm`) is **opt-in and not installed by default**.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Blank page after deploy | Ensure SPA fallback is configured for your host |
| `@mlc-ai/web-llm` build error | Externalized in vite.config.ts; safe to ignore if not installed |
| Three.js chunk too large | BIM viewer is lazy-loaded; first load may be slower |
| PWA not updating | Service worker uses auto-update; close all tabs and reopen |
| CORS errors | All assets are local; no external CDN dependencies |
| PWA not registering | Deploy requires HTTPS for service worker registration |

---

## Post-Deploy Smoke Test

After deploying, verify:

- [ ] Home page loads without errors
- [ ] Project wizard creates a new project
- [ ] Dashboard loads with 6-stage workspace
- [ ] AI brief generates rooms
- [ ] 2D CAD canvas renders and responds to edits
- [ ] 3D BIM toggle works
- [ ] BOQ panel shows data with correct currency
- [ ] Export CSV/HTML/PDF downloads correctly
- [ ] Project export ZIP downloads
- [ ] PWA installs and works offline
- [ ] Diagnostics panel opens (Ctrl+Shift+D)
- [ ] All routes resolve (no 404 on /project/:id, /portfolio, /academy)
