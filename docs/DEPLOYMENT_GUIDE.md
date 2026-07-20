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

| Stage | Trigger | Automation | Gate | Deploy |
|-------|---------|------------|------|--------|
| **Local dev** | `npm run dev` | None | None | Not deployed |
| **PR preview** | Push to PR branch | CI pipeline + build validation | CI release-gate (required for merge) | Auto-deploy by Vercel/Netlify (if connected) |
| **Main build** | Push to `main` | CI pipeline + build validation | CI release-gate | Auto-deploy by Vercel/Netlify (if connected) |
| **Release tag** | `git tag v* && git push --tags` | CI pipeline + build validation + release checklist | CI release-gate | Manual or auto (depends on hosting config) |
| **Production** | Manual promotion or auto-deploy | Smoke-test verification | Operator sign-off | Static host / Vercel / Netlify |

### Key principle

> **CI validates quality. The operator validates the deployment.**

The CI pipeline confirms the code is correct. The deploy workflow confirms the
build is structurally sound. The operator confirms the live site works correctly.

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

## CI ↔ Deploy Relationship

The CI workflow and Deploy workflow run independently but are complementary:

```
CI (quality validation)            Deploy (build + operator signal)
─────────────────────────           ─────────────────────────────────
  typecheck ──> gate 1               validate-build (artifact check)
    │                                ├── preview (PR only)
    ├── lint                         ├── production-ready (main only)
    ├── shard-1/2/3                  └── release-ready (tag only)
    ├── integration
    ├── build
    └── release-gate (aggregate)
```

| Workflow | Runs on | Purpose |
|----------|---------|---------|
| CI | PRs, main, tags | Quality validation — must pass before merge |
| Deploy | PRs, main, tags | Build artifact validation + operator deployment guidance |

Both must be green for a complete clean signal. The Deploy workflow does not
check CI results — they are independent by design. Branch protection rules
enforce the CI release-gate as a merge requirement.

---

## Deployment Status Summary

| Signal | What it means |
|--------|---------------|
| CI green (release-gate passed) | Code quality, tests, and build all pass |
| Deploy green (validate-build passed) | Build artifacts are structurally complete |
| Preview deployed | PR has a live preview URL (Vercel/Netlify auto-deploy) |
| Production deployed | `main` or tag is live at the production URL |
| Smoke-test passed | Operator confirmed the live site works correctly |

---

## Related

- [CI Workflow](../.github/workflows/ci.yml) — quality pipeline definition
- [Deploy Workflow](../.github/workflows/deploy.yml) — deployment pipeline definition
- [CHANGELOG](../CHANGELOG.md) — release history
