# Critical Path Analysis — DzeNhare Secure Quality Building (Whole System)

**Date:** 2026-06-29
**Question:** Of the candidate next pushes, which is on the *critical path* to a complete,
mergeable, enterprise-grade system — not just the most exciting?

A task is "critical path" if (a) other high-value work **depends** on it, and/or (b) it
closes a **stated-vision** gap that nothing else can substitute for. Polish that nothing
depends on is, by definition, *off* the critical path.

---

## 1. Where the system actually is (verified on disk)

Working, `tsc`-clean, ~166 KB bundle, 35 modules:

- AI brief (regex) → parametric **multi-floor** CAD → BIM → structure (loads, footings,
  rebar, beams) → **10-category multi-currency BOQ**
- Drawings: per-floor **plans**, **selectable section**, **issued dossier** (title blocks,
  drawing register, revision history + auto-detect/auto-note)
- Offline persistence (Dexie), audit/transaction log, RBAC-free single project

**Real gaps vs. the original vision** ("AI → 2D CAD → 3D BIM → quantities → BOQ,
enterprise, affordable for everyone"):

| Gap | Vision-critical? | Anything depend on it? |
|---|---|---|
| **No 3D BIM viewer** | YES — vision literally says "3D BIM model" | Client wow, design review, clash detection later |
| **AI is regex, not a model** | Partly — "AI-powered" is the headline | Nothing structural depends on it; seam already exists |
| **No editable / persisted plan** | YES for a real tool | Iterative design, change-tracking *meaning*, 3D-from-edits |
| **Single project only** | YES for "enterprise" | Multi-project compare, portfolio, governance |
| **No merge consolidation** | Process-critical | Folding this into your other charts safely |

---

## 2. Scoring the candidates

Scale 1–5 (5 = best). **Critical-path score = Vision × Unblocks − Risk**, effort shown
separately because cheap+high-value wins should jump the queue.

| Candidate | Vision value | Unblocks others | Risk | Effort | Notes |
|---|---|---|---|---|---|
| **A. 3D BIM viewer** | 5 | 4 | 3 | 3–4 | Closes the headline gap; reuses existing BIM model; bundle/perf risk (three.js) but solvable with lazy-load |
| **B. Merge-ready consolidation** | 3 | 5 | 1 | 1–2 | Cheap, de-risks everything downstream, but doesn't *add* product |
| **C. Keep incrementing (section polish)** | 1 | 1 | 1 | 1 | Diminishing returns; nothing depends on it |
| **D-i. Local LLM (WebLLM)** | 4 | 2 | 4 | 4 | Big bundle, device-dependent; seam already lets it drop in later |
| **D-ii. Editable + persisted plan** | 4 | 5 | 3 | 3 | Makes the whole CAD→BIM→BOQ loop *iterative*; revisions/change-tracking become real |
| **D-iii. Multi-project management** | 4 | 4 | 2 | 3 | Required for "enterprise"; unlocks portfolio/governance |

---

## 3. Dependency reasoning (what blocks what)

```
                 ┌─────────────────────────┐
                 │  B. Consolidation (cheap)│  ← do early, protects all later work
                 └─────────────────────────┘
                              │
        ┌─────────────────────┼───────────────────────┐
        ▼                     ▼                         ▼
 D-ii. Editable plan    A. 3D BIM viewer        D-iii. Multi-project
   (iterative loop)     (headline vision)        (enterprise frame)
        │                     │                         │
        ▼                     ▼                         ▼
 revisions/change-      design review,            portfolio, governance,
 tracking become        future clash             cross-scheme compare
 *meaningful*           detection, wow
        │
        ▼
 D-i. Local LLM (best LAST: it edits the design the loop already supports)
```

Key insight: **the regex→LLM swap is genuinely last** — the architecture already has the
`parseBriefAsync` seam, so doing it now buys little and costs a heavy bundle. Conversely,
**3D viewer and editable plan are both true vision gaps**, and editable plan is what makes
all the issue-control machinery (Stages 57–66) actually *mean* something (right now the
design barely changes, so "what changed since last issue" rarely fires in real use).

---

## 4. The verdict — recommended critical path

**Push order:**

1. **A — 3D BIM viewer (NOW).** It is the single biggest *stated-vision* gap, it's the
   most visible proof the system is "computational BIM," and it reuses the BIM model you
   already generate (low conceptual risk; the only real risk is bundle size, mitigated by
   lazy-loading off the critical path exactly as planned).
2. **D-ii — Editable + persisted plan (NEXT).** Turns the one-shot generator into a real
   iterative tool and makes the entire revision/change-tracking layer pay off.
3. **B — Consolidation pass (THEN).** Lock it down: refresh `gemini.md` +
   `brandguidelines.md`, write one architecture/README, so it merges cleanly into your
   other charts.
4. **D-iii — Multi-project management**, then **D-i — Local LLM**, last.

**Explicitly de-prioritised:** C (more section/marker polish). Nothing depends on it and
its marginal value is low — revisit only if a client specifically asks.

### Why A over B first, despite B being cheaper?
B protects work but adds no product; you asked to *build the whole system*. The 3D viewer
is the highest *product* value on the critical path and unblocks the "design review / wow"
that an enterprise pitch needs. B is cheap enough to slot in right after A without cost.

---

## 5. Recommendation in one line

> **Build the 3D BIM viewer next** (Candidate A) — it closes the headline "3D BIM model"
> gap, reuses existing data, and is the most visible step toward the complete DzeNhare
> Secure Quality Building system; follow immediately with the editable/persisted plan,
> then a consolidation pass.
