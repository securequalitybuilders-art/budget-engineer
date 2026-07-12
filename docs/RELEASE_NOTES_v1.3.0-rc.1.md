## v1.3.0-rc.1 — Enterprise Platform MVP Release Candidate

This release candidate marks the point where Budget Engineer's **enterprise platform layer** becomes feature-complete enough to validate as an MVP.

The core domain pipeline was already in place. This RC restores release integrity and wraps the system with the platform scaffolding needed for a credible enterprise-grade local-first application.

---

## What's in this RC

### ✅ Release integrity restored
This RC restores trustworthy engineering gates:

- **TypeScript typecheck is green**
- **Build gate is restored**
- **Lint policy has been tightened again**
- **All tests pass on the tagged commit**

### Quality snapshot
- **Tests:** 1,503
- **Test files:** 87
- **TypeScript:** 0 errors
- **Build:** green
- **Lint:** passes under restored warning policy

---

## Enterprise Platform MVP capabilities

### 1. Local-first project backup and portability
- project export/import workflow
- import-as-copy behavior
- schema migration/versioning support
- backup/restore surfaced in the UI

### 2. Diagnostics / monitoring baseline
- diagnostics panel
- build and environment metadata
- error log capture
- exportable debug state for local troubleshooting

### 3. Local RBAC shell
- local role-aware session model
- route/visibility guard infrastructure
- role switcher and shell-level permission behavior
- honest local-first positioning (not fake cloud IAM)

### 4. Plugin SDK scaffold
- plugin manifest structure
- sample plugin
- SDK/documentation baseline
- future plugin runtime/marketplace foundation

### 5. i18n scaffold
- translation framework wiring
- English locale baseline
- locale switcher
- future translation rollout foundation

### 6. Deployment / packaging baseline
- Dockerfile
- docker-compose
- nginx SPA fallback/config
- stronger CI pipeline with release checks

### 7. Security baseline
- CSP baseline
- sanitization utility layer
- import/export validation direction
- explicit security notes/documentation

### 8. Performance baseline
- chunk budget alignment
- practical pagination improvements
- performance notes and baseline controls

---

## Type-system cleanup included in this RC

This RC also includes a broad cleanup that resolves **167 TypeScript errors across 43 files**, including:

- missing or incorrect type exports
- adapter property mapping mismatches
- component prop typing issues
- dead code / dead imports
- canonical-model alignment in tests
- store and lib typing cleanup
- demo/project-pack alignment

This work is what made the release gates trustworthy again.

---

## Why this is still an RC

This release candidate is intentionally labeled **RC** because it represents an **Enterprise Platform MVP**, not a fully complete enterprise platform.

What is intentionally deferred:
- cloud auth / OAuth / JWT backend
- remote plugin marketplace
- real-time collaboration / CRDT sync
- full localization rollout
- external observability SaaS integration
- deeper performance-at-scale work

---

## Recommended validation focus before final `v1.3.0`

Use this RC to validate:

- studio and dashboard smoke flows
- role switching / guard behavior
- diagnostics panel usability
- project export/import roundtrip
- Docker/nginx local packaging
- route/deploy stability on the live build
- no regressions from restored type/build gates

---

## Release candidate scope summary

This RC does **not** introduce a brand-new product direction.

It stabilizes and platform-enables the already delivered architecture domain layer so that Budget Engineer can now be evaluated as a serious **Enterprise Platform MVP**.

---

## Live app

**https://budget-engineer.vercel.app/**

---

**Budget Engineer — Making Construction Affordable for Everyone.**
