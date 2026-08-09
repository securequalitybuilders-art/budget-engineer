# Budget Engineer — Project Constitution

Purpose: This document is the immutable decision record and working agreement for
the Budget Engineer codebase. It ranks above gemini.md (AI context) and
brandguidelines.md (visual identity). Any change that violates a clause here
requires an explicit amendment and a dated entry in the Decision Log.

## 1. Identity

- Product: Budget Engineer Studio — "Budget Engineer"
- Tagline: "Making Construction Affordable for Everyone"
- Domain: budget-engineer.vercel.app
- Region of authority: Zimbabwe / SADC construction practice.

## 2. Non-Negotiable Invariants

1. **Local-first.** All computation happens in the browser. IndexedDB (Dexie) is
   the single source of truth; there is no server.
2. **No backend.** The app is a pure static SPA. It must never require a server,
   hosted database, or cloud compute to function.
3. **Zero paid APIs.** Free-tier LLM providers only (Gemini, Groq, GitHub
   Models, OpenRouter free tiers). No OpenAI billing keys, ever.
4. **No telemetry.** Zero tracking. User data never leaves the device.
5. **Human-in-the-loop.** SI 56 of 2025 requires ACZ-registered professional
   review of all plans. The app gates and surfaces, it never claims autonomy.
6. **Honest positioning.** Never claim more than what is built. "Coming soon"
   placeholders are removed the moment a stub ships.
7. **Keys are secrets.** API keys live only in the browser (localStorage via
   persisted zustand stores). `env.example` documents free-tier key shapes only;
   real secrets are never committed.

## 3. Architecture Constitution

- Browser-only runtime; Vite 8 (Rolldown) + React + TypeScript strict.
- **Dexie schema is append-only.** Every migration adds a version that repeats
  all prior stores additively. Never drop or rename a store.
- **Engine purity.** Engines in `src/engine/**` are pure/typed and React-free
  unless named as a component; UI lives in `src/components/**`.
- **RAG pipeline.** Text extraction -> table-aware chunking -> local embeddings
  (deterministic, no paid API) -> hybrid search -> rerank -> query rewrite ->
  cross-reference graph -> compliance analysis. Deterministic local fallback is
  mandatory for every remote path (`fellBack` / `fallbackReason` contract).
- **Agent orchestrator.** Deterministic LangGraph-style graph
  (researcher -> calculator -> validator -> supervisor -> hitl | done) with
  per-node tool scoping and Dexie checkpointing. Interrupts for high-value and
  structural-deviation decisions; `resumeAgent` finalizes.
- **Storage.** IndexedDB for project data (Dexie, ~50 tables across 14 versions);
  localStorage only for UI preferences (theme, locale, onboarding).
- **Free-tier swap point.** The API layer ships a `LocalIndexedDbTransport` (the
  only transport the app constructs) and an `HttpTransport` documented as the
  future backend adapter — never wired.

## 4. Standards of Record (Single Authorities)

- **Room minimums:** `src/engine/standards/roomStandards.ts` — the Zimbabwe §5
  table is the only authority for the 13 canonical rooms; all consumers delegate.
- **Occupancy classification:** `src/engine/compliance/occupancyMatrix.ts` —
  the 16-class SANS 10400-A matrix is the only authority; `classifyOccupancy`
  and the typology KB must stay in agreement (locked by a cross-check test).
- **Typologies:** `src/engine/typology-kb.ts` — 16 entries aligned with
  gemini.md §3, occupancy codes, programmes, site/structural/fire fields.
- **Component library:** `src/engine/parametric/componentRegistry.ts` — 76 SADC
  doors/windows/sanitary/stairs.
- **Drawing package:** `src/engine/tier1/councilPackageAssembler.ts` — the
  18-sheet A-001..A-701 SADC numbering set.
- **ISO 7200 title block:** `ProfessionalTitleBlock.tsx`.
- **Zone colors:** `src/lib/drawings/roomZoneColors.ts` (brandguidelines §2.6).
- **Construction details:** `src/engine/construction/constructionDetails.ts`.
- **Payment engines:** P4P + WIPAA in `src/engine/payment/paymentCalculators.ts`.

## 5. Engineering Working Agreement

- **TypeScript strict** — `npx tsc --noEmit --skipLibCheck` must pass with 0 errors.
- **ESLint** — 0 errors / 0 warnings across `src` + `eval` + `.mjs` scripts.
- **Tests** — `npx vitest run --maxWorkers=4` must pass in full (~4,500+ tests,
  230+ files). New features ship with tests.
- **No circular dependencies** — `npx madge --circular --extensions ts,tsx src`
  must report none.
- **Build** — `npx vite build` must succeed; lazy chunks stay under 512 kB
  (opencv / three / GLTFExporter are pre-existing large lazy chunks).
- **Accessibility** — WCAG AA. No `text-stone-500` / `text-slate-500`-class
  contrast failures; use `text-stone-400` / `text-slate-400` or brand tokens.
- **React hooks** — no synchronous setState in effects; cancelled-flag pattern
  for async loaders; memo'd SVG sub-components; event delegation over inline
  callbacks for canvas surfaces.
- **Encodings** — edits must not introduce mojibake; verify `git diff` on text.
- **Areas that are never touched** — the `budget-engineer-canonical/` submodule
  (published mirror) and the untracked `DZENHARE SQB…` spec folder.
- **Theme** — the sole mechanism is the `dark` class on `<html>` toggled by
  `uiStore`; dark mode is byte-identical, light mode is purely additive via the
  un-layered remap table in `src/styles/index.css`.

## 6. Definition of Done

A change is done only when: tsc 0 errors, eslint 0/0, full vitest suite green,
madge clean, production build succeeds, and — where user-facing — the feature is
honestly described and no "coming soon" stub remains in its path.

## 7. Decision Log

| Date | Decision |
|---|---|
| 2026-08-09 | S3/S5 theme: single `dark`-class mechanism; light mode additive remap only; `--brand-accent` flips to `#7a4a1f` in light mode. |
| 2026-08-09 | A2.5 / B-series: agent orchestrator exposed via an in-app Agent Studio (`/project/:id/studio/agent`); golden BOQ dataset at `eval/golden-boq.json` (20 ZIQS/SAZ cases); `env.example` documents free-tier keys only; this constitution is the top-ranked project memory doc. |
