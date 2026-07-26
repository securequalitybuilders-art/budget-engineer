# Deployment Guide

Budget Engineer is a local-first SPA PWA. There is no backend, no database server,
and no cloud API dependency. Deployment means serving the static `dist/` build to
users.

---

## Deployment Lifecycle

```
local dev ──> PR preview ──> main (staging) ──> release tag ──> production
    │             │               │                   │              │
    │             │               │                   │              │
    ▼             ▼               ▼                   ▼              ▼
  ┌─────┐   ┌──────────┐   ┌──────────┐        ┌──────────┐   ┌──────────┐
  │npm  │   │preview   │   │validated │        │release   │   │live site │
  │run  │   │deploy    │   │main build│        │artifact  │   │verified  │
  │dev  │   │(auto)    │   │(auto)    │        │(tagged)  │   │          │
  └─────┘   └──────────┘   └──────────┘        └──────────┘   └──────────┘
```

### Stage details

| Stage | Trigger | Automation | Smoke | Gate | Deploy |
|-------|---------|------------|-------|------|--------|
| **Local dev** | `npm run dev` | None | None | None | Not deployed |
| **PR preview** | Push to PR branch | CI pipeline + build validation + smoke | Automated | CI release-gate (required for merge) | Auto-deploy by Vercel/Netlify (if connected) |
| **Main build** | Push to `main` | CI pipeline + build validation + smoke | Automated | CI release-gate | Auto-deploy by Vercel/Netlify (if connected) |
| **Release tag** | `git tag v* && git push --tags` | CI pipeline + build validation + smoke + release checklist | Automated | CI release-gate | Manual or auto (depends on hosting config) |
| **Production** | Manual promotion or auto-deploy | Smoke-test verification | Manual + automated | Operator sign-off | Static host / Vercel / Netlify |

### Key principle

> **CI validates quality. Automated smoke tests verify deployment health. The operator confirms correctness.**

The CI pipeline confirms the code is correct. The deploy workflow confirms the
build is structurally sound. Automated smoke tests verify the deployed app
loads and serves its shell correctly. The operator remains the final authority
on whether the release is fit for professional use.

---

## Hosting Options

### Vercel (recommended)

`vercel.json` at the project root configures SPA rewrites:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

**Setup:**
1. Push the repo to GitHub
2. Import the repo at [vercel.com/import](https://vercel.com/import)
3. Framework preset: **Vite**
4. Build command: `npm run build`
5. Output directory: `dist`

**Auto-deploy behavior:**

| Trigger | Vercel Action |
|---------|---------------|
| Push to PR branch | Preview deployment at `https://pr-{number}--{project}.vercel.app` |
| Push to `main` | Production deployment at `https://{project}.vercel.app` |
| Push tag `v*` | Deploys from the tag commit (treated as production) |

Vercel runs its own build independently. The GitHub Actions CI pipeline runs in
parallel. The CI release-gate must pass before merging — it is the quality gate.
Vercel's deployment is the distribution mechanism.

### Netlify

`public/_redirects` at the project root configures SPA fallback:

```
/*    /index.html   200
```

**Setup:**
1. Push the repo to GitHub
2. Import the repo at [app.netlify.com](https://app.netlify.com)
3. Build command: `npm run build`
4. Publish directory: `dist`

Netlify auto-deploys on every push (PR preview + main production), same as Vercel.

### Static host (any)

Upload the `dist/` directory to any static file server (S3, Nginx, Apache, GitHub Pages):

```bash
npm run build
# upload dist/ to your host
```

Ensure SPA fallback is configured on the server (all paths → `/index.html`).

---

## Release Process

### Creating a release

1. Ensure `package.json` version is updated and committed on `main`
2. Create and push a signed tag matching the version:

   ```bash
   git tag -s vX.Y.Z -m "Release vX.Y.Z"
   git push origin vX.Y.Z
   ```

3. The CI pipeline runs automatically on the tag push
4. The Deploy workflow runs, validates the build, and prints the release checklist
5. Publish release notes on GitHub Releases
6. Verify the live production deployment

### Release tag naming

Tags must match the pattern `v*` (e.g., `v4.0.0`, `v4.1.0`, `v5.0.0`).
Only tags trigger the `release-ready` job in the Deploy workflow.

### What must pass before a release

| Check | Enforced by | Fail action |
|-------|-------------|-------------|
| TypeScript strict check (0 errors) | CI typecheck job | Merge blocked |
| ESLint (max 25 warnings) | CI lint job | Merge blocked |
| All fast-path tests pass | CI shard-1/2/3 jobs | Merge blocked |
| Integration tests pass | CI integration job | Merge blocked |
| Production build succeeds | CI build job | Merge blocked |
| CI release-gate passes | CI release-gate job | Merge blocked |
| Build artifact structure valid | Deploy validate-build job | Amber signal |
| Smoke-test checklist passed | Operator | Release not promoted |

---

## Smoke-Test Checklist

After every deployment (preview or production), verify:

### Core functionality

- [ ] App loads without console errors
- [ ] Service worker registers (if PWA enabled)
- [ ] Home page renders with navigation
- [ ] Create new project works
- [ ] Open existing project loads data
- [ ] All major routes load without 404
- [ ] SPA fallback works (refresh on a sub-route)

### Feature areas

- [ ] CAD editor tools work (wall, door, window placement)
- [ ] 3D viewer loads and renders
- [ ] BOQ generates correctly
- [ ] Export (DXF, PDF, CSV, SVG) produces valid files
- [ ] Drawing tools (dimensions, annotations) work
- [ ] Board layout renders and exports
- [ ] Sun-path / shadow analysis loads
- [ ] Cost estimation displays regional rates
- [ ] Site analysis loads and processes images

### Offline / PWA

- [ ] App loads when network is disconnected
- [ ] Previously viewed projects are accessible offline
- [ ] Service worker cache contains expected assets

### Performance

- [ ] Initial load completes within reasonable time
- [ ] Route transitions are smooth
- [ ] No memory leaks on prolonged use (optional spot-check)

### Known Ops Notes

> **PWA Cache Stale State**
> After major front-end drawing or runtime changes, production may still serve an older cached bundle due to the Service Worker.
> Always verify production in a **fresh incognito session**.
> If production output remains stale despite a successful deploy, manually unregister the service worker and clear site data:
> 1. Press `F12` > Application > Service Workers > **Unregister**
> 2. Storage > **Clear site data**
> 3. Hard refresh (`Ctrl+Shift+R`)


---

## Environment Configuration

The Deploy workflow uses environment variables for provider-specific and
URL-specific settings. These can be set at the workflow level (default) or
overridden via [GitHub repository variables]
(https://docs.github.com/en/actions/learn-github-actions/variables).

### Available variables

| Variable | Default | Purpose | Override method |
|----------|---------|---------|-----------------|
| `PROVIDER` | `Vercel` | Provider label used in workflow reports and operator guidance | Workflow edit or repo variable |
| `PRODUCTION_URL` | `https://budget-engineer.vercel.app` | Target URL for main/tag push smoke tests and production deployment signal | Workflow edit or repo variable |
| `PREVIEW_URL_PATTERN` | `https://pr-{number}--budget-engineer.vercel.app` | URL template for PR preview smoke tests; `{number}` is replaced with the PR number | Workflow edit or repo variable |
| `BASE_URL` (test‑time) | `http://localhost:5173` | Playwright `baseURL` for local smoke runs; set via `BASE_URL=http://... npm run test:smoke` | Command line or CI env |

### How URL resolution works

```
PR trigger     →  PREVIEW_URL_PATTERN  →  {number} → PR#  →  smoke-test
main/tag push  →  PRODUCTION_URL       →  as-is          →  smoke-test
manual URL     →  workflow_dispatch    →  target_url     →  smoke-test
```

| Trigger | URL source | Configurable? |
|---------|------------|---------------|
| Pull request | `PREVIEW_URL_PATTERN` with `{number}` replaced by PR number | Yes — change `PREVIEW_URL_PATTERN` env var |
| Push to `main` | `PRODUCTION_URL` | Yes — change `PRODUCTION_URL` env var |
| Push tag `v*` | `PRODUCTION_URL` | Yes — change `PRODUCTION_URL` env var |
| `workflow_dispatch` | `target_url` input | Yes — enter URL on each run |

### Setting repository variables

Each workflow env variable checks for a GitHub repo variable first, then falls
back to its default. To override any value without editing the workflow file:

1. Go to **GitHub → Settings → Secrets and variables → Actions → Variables**
2. Click **New repository variable**
3. Enter the name (e.g., `PRODUCTION_URL`) and the desired value
4. Save — the Deploy workflow picks it up on the next run

**Supported repo variables:**

| Repo variable | Effect | Example value |
|---------------|--------|---------------|
| `PROVIDER` | Provider label in reports | `Netlify` |
| `PRODUCTION_URL` | Target for main/tag smoke tests | `https://app.example.com` |
| `PREVIEW_URL_PATTERN` | Template for PR preview URLs | `https://preview-{number}.example.com` |

No workflow file changes are needed — the `vars.* || 'default'` expressions
in the workflow handle fallback automatically.

### Switching providers

To switch the primary hosting provider (e.g., Vercel → Netlify):

1. Set a `PROVIDER` repo variable to the new provider name (e.g., `Netlify`)
2. Set `PRODUCTION_URL` to your production URL (e.g., `https://my-site.netlify.app`)
3. Set `PREVIEW_URL_PATTERN` to the preview URL pattern with `{number}` as
   the PR placeholder (e.g., `https://deploy-preview-{number}--my-site.netlify.app`)

No workflow file changes are needed.

### Provider assumptions

| Assumption | Where used | How to change |
|------------|------------|---------------|
| Provider label | Workflow reports, smoke metadata, preview table | Set `PROVIDER` repo variable |
| Preview URL contains `{number}` placeholder | `PREVIEW_URL_PATTERN` env var | Edit the pattern — `{number}` is replaced by bash parameter expansion |
| Production URL is the primary target | `PRODUCTION_URL` env var | Set `PRODUCTION_URL` repo variable |
| SPA fallback configs exist | Build validation step (informational only) | Modify `vercel.json` and/or `public/_redirects` directly |
| Repo variables are set via GitHub UI | All three configurable variables | Go to Settings → Secrets and variables → Actions → Variables |

These assumptions are **lightweight and optional**. Budget Engineer is a
static SPA PWA — it can be hosted on any static host with SPA fallback
configured. The workflow simply targets whatever URL it is given.

---

## Rollback

### Vercel

1. Go to the Vercel dashboard → Deployments
2. Find the last known-good deployment
3. Click the "..." menu → "Promote to Production"

Vercel keeps all deployment history. Rollback is instant.

### Netlify

1. Go to the Netlify dashboard → Deployes
2. Find the last known-good deploy
3. Click "Publish deploy"

### Static host

Re-upload the previous `dist/` build. If you keep release artifacts:

```bash
# After each release, archive the build:
npm run build
tar -czf dist-vX.Y.Z.tar.gz dist/
```

---

## Automated Smoke Tests

The Deploy workflow includes an automated `smoke-test` job that runs Playwright
against the deployed app URL. This provides a quick pass/fail signal for
deployment health before any manual verification.

### What it checks

| Check | What it verifies |
|-------|------------------|
| App shell loads | `#root` element renders, no uncaught errors or console errors |
| Page title | Title matches `Budget Engineer` |
| Navigation renders | `nav` element is visible |
| SPA fallback | Navigating to `/dashboard` and refreshing returns the app shell, not a 404 |
| Known routes | `/` and `/dashboard` return the app shell |
| Manifest | `manifest.webmanifest` is served (PWA requirement) |
| Static assets | JS bundle referenced in HTML is served successfully |

### How the URL is determined

| Trigger | URL Source | Configurable? |
|---------|------------|---------------|
| Pull request | `PREVIEW_URL_PATTERN` with `{number}` → PR# | Yes — see [Environment Configuration](#environment-configuration) |
| Push to `main` | `PRODUCTION_URL` | Yes — see above |
| Push tag `v*` | `PRODUCTION_URL` | Yes — see above |
| `workflow_dispatch` | `target_url` input — manual URL entry | Yes — enter URL on each run |

See the [Environment Configuration](#environment-configuration) section above
for the full list of variables, defaults, and override instructions.

### Retry behavior

When running against a PR preview, Vercel's deployment may not be ready when
the smoke-test job starts. To handle this, the workflow includes a **URL readiness
check** before running Playwright:

| Step | What happens |
|------|--------------|
| Preflight | Polls the URL with `curl` up to 5 times |
| Backoff | Waits 10s, 20s, 40s, 80s, then 160s between attempts (~5 min total) |
| Outcome | If URL responds (not 502/503), Playwright runs. If never reachable, reports **PREVIEW NOT READY** |

This reduces false-negative failures from slow preview deployments. If the
result is **PREVIEW NOT READY**, re-run the smoke-test job in a few minutes
(see [Rerunning smoke tests](#rerunning-smoke-tests)).

### Smoke outcome reference

| Outcome | Meaning | Action |
|---------|---------|--------|
| **PASSED** | App is alive, serving shell correctly, all 6 checks pass | Proceed with manual verification |
| **FAILED** | App reachable but one or more checks failed | Investigate before promoting |
| **PREVIEW NOT READY** | URL did not respond after polling retries | Re-run smoke-test job in a few minutes |

### What it does NOT check

- **Feature correctness** — does not create projects, draw walls, or generate BOQs
- **Professional accuracy** — does not validate structural, architectural, or compliance output
- **Offline behavior** — requires network connectivity to the target URL
- **Performance** — does not measure load times or Lighthouse scores
- **Browser compatibility** — tests Chromium only

### Running smoke tests locally

```bash
# Against a running dev server
BASE_URL=http://localhost:5173 npm run test:smoke

# Against a preview/production URL
BASE_URL=https://pr-42--budget-engineer.vercel.app npm run test:smoke
```

### Rerunning smoke tests

If a smoke test failed due to a transient issue (slow preview deploy, network
blip), you can re-run it:

1. Go to the Actions tab in GitHub
2. Select the **Deploy** workflow run
3. Click **Re-run jobs** → select **smoke-test** only

Or trigger a fresh run:

1. Go to Actions → **Deploy** workflow
2. Click **Run workflow**
3. Enter the target URL in the `target_url` field
4. Click **Run workflow**

---

## CI ↔ Deploy Relationship

The CI workflow and Deploy workflow run independently but are complementary:

```
CI (quality validation)            Deploy (build + smoke + operator signal)
─────────────────────────           ───────────────────────────────────────
  typecheck ──> gate 1               validate-build (artifact check)
    │                                ├── preview (PR only)
    ├── lint                         ├── smoke-test (all triggers)
    ├── shard-1/2/3                  ├── production-ready (main only)
    ├── integration                  └── release-ready (tag only)
    ├── build
    └── release-gate (aggregate)
```

| Workflow | Runs on | Purpose |
|----------|---------|---------|
| CI | PRs, main, tags | Quality validation — must pass before merge |
| Deploy | PRs, main, tags | Build artifact validation + automated smoke test + operator deployment guidance |

Both must be green for a complete clean signal. The Deploy workflow does not
check CI results — they are independent by design. Branch protection rules
enforce the CI release-gate as a merge requirement.

---

## Deployment Status Summary

| Signal | What it means |
|--------|---------------|
| CI green (release-gate passed) | Code quality, tests, and build all pass |
| Deploy green (validate-build passed) | Build artifacts are structurally complete |
| Smoke tests passed | Automated checks confirm the deployed app loads and serves its shell correctly |
| Preview deployed | PR has a live preview URL (Vercel/Netlify auto-deploy) |
| Production deployed | `main` or tag is live at the production URL |
| Operator smoke-test passed | Human confirmed the live site works correctly via full checklist |

---

## Related

- [CI Workflow](../.github/workflows/ci.yml) — quality pipeline definition
- [Deploy Workflow](../.github/workflows/deploy.yml) — deployment pipeline definition
- [CHANGELOG](../CHANGELOG.md) — release history
