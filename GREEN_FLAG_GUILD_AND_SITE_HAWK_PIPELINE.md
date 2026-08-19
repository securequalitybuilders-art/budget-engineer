# Green Flag Guild & Site Hawk Pipeline — 18-Stage Architecture

## Overview
Extends the Budget Engineer 7-stage pipeline (`Brief → Concept → Design → BIM → Docs & BIM → Budget → Budget Engineered`) with two new pillars:
- **Cost Clarity (Green Flag Guild)** — 5 stages certifying roadmap + clarifying cost for practical execution
- **Project Control (Site Hawk)** — 6 stages monitoring inception to handover with detailed cost breakdowns

**Total: 18 stages = 18-sheet SADC council package** — full RAG system workflow.

---

## Cost Clarity (Green Flag Guild) — 5 Stages

### C1 Resource Hub Discovery (Amazon/Alibaba)
**Input:** Budget Engineered BOQ $41,200 + contingency $3,700 (9%) + lead magnet client type + location GPS + service selection
**Process:** RAG hybrid BM25+dense RRF k=60 over-fetch 20 → cross-encoder BAAI/bge-reranker-base ONNX threshold 0.7
**Output:** Resource Hub List + Demand Radar + Market Price Index locked 30 days
**UI:** `GreenFlagResourceHub.tsx` Bento Grid with GreenFlagBadge emerald circle
**Persistence:** Dexie `resources` table

### C2 Team Assembly (Do-it-together/for-them/alone)
**Input:** Resource Hub List + service selection + 3 Milestones (Foundation&Bones 35%, Wall Plate&Shell 40%, Finishes&Keys 25%)
**Process:** Three paths:
- **Do it alone:** P4P Calculator + WIPAA Monitor + Red Pen Audit $50 + Ghost Materials + Group Buy Aggregator + My Must-Haves
- **Do it together:** Auto-assign best-fit contractor (proximity 8km, specialization match, availability 15 June, WIPAA variance, true profitability, rating 4.9★)
- **Do it for them:** Fortress 12-15% turnkey, DzeNhare orchestrates invisible workstreams, 10-12 clicks ~45 min
**Output:** Team Assembly selected team + Contract auto-generated
**UI:** `TeamAssemblyWizard.tsx` DREAM→PLAN→PICK→BUILD→MOVE IN + Materials Transparency Panel
**Persistence:** Contract terms, team assignments

### C3 Green Flag Certification & Vetting
**Input:** Team Assembly + credentials (company registration, tax clearance, ZIMRA, bank details, insurance, Architect Registry license SI56/2025, PRAZ indemnity, trade certificates, NSSA clearance)
**Process:** KYC/AML via domain-tools MCP (7 local tools), Architect Registry Validation SI56/2025, Role-Specific Certifications (15-30 min video each)
**Output:** Green Flag Badge emerald circle white check, Public Scorecard, Verified Badge, Escrow Direct Link
**UI:** `GreenFlagBadge.tsx` + `ContractorVettingScorecard.tsx`
**Persistence:** `contractorScorecards`, `supplierScorecards` (tier silver/gold/platinum with dual-source rebates)

### C4 Bulk Procurement Batches & TCO
**Input:** Certified Team + BOQ + Market Price Index + Demand Radar dual view
**Process:** Value-Driven Quoting TCO-enabled, Group Buy Aggregator, Forward Commitment, RFQ/Tender Module, SADC Market Price Index real-time ticker
**Output:** PO Issued Escrow linked, Forward Commitment, TCO Comparison Table
**UI:** `ValueDrivenQuotingTool.tsx` + `DemandRadarDualView.tsx`
**Persistence:** `purchaseOrders`, `forwardCommitments`

### C5 Cost Clarification & BOQ Lock + Certification
**Input:** Bulk Procurement + BOQ + P4P + TCO + Market Price Index + Historical Cost Database
**Process:** Automated BOQ Generation WBS per ZIQS SMM, Dynamic Cost, Red Pen Audit Tool $50, Value Engineering Module, My Must-Haves List
**Output:** Locked Cost Baseline $41,200 + detailed breakdown, Certification
**UI:** `CostBaselineDocument.tsx` + `RedPenMarker.tsx` + `BOQLockPanel.tsx`
**Persistence:** `costBaselines`, `boqItems`

---

## Project Control (Site Hawk) — 6 Stages

### P1 Critical Path Analysis & Gantt
**Input:** Certified Team + Locked Cost Baseline + BOQ + WBS Dictionary + Schedule of Values + Risk Register
**Process:** Critical Path automated schedule dependency mapping, Gantt visual timeline, Cashflow Chart, Risk & Contingency Planning
**Output:** Critical Path schedule, Gantt Chart, Cashflow Chart, WBS Dictionary
**UI:** `CriticalPathGantt.tsx` + `CashflowChart.tsx` + `WBS_Dictionary.tsx`
**Persistence:** `wbsDictionary`, `schedules`

### P2 Site Mobilization & Resource Scheduling
**Input:** Critical Path + Certified Team + Locked Baseline
**Process:** Resource Scheduling (labour hours auto-coded), Logistics Tracker (Uber-style map), Fleet Management (GPS geofencing)
**Output:** Resource Schedule, Logistics Tracker, Real-Time Job Costing
**UI:** `SiteMobilization.tsx` + `LogisticsTracker.tsx` + `DeliveryTracker.tsx`
**Persistence:** `resourceSchedules`, `logistics`

### P3 Digital Twin Progress Viewer Interactive Map-Based
**Input:** Site Mobilization + Working Drawings + BIM 3D model + Verification Photos
**Process:** Digital Twin Viewer (geo-tagged timeline), Site Verification (AI computer vision), Drone inspection, Computer Vision Verification
**Output:** Digital Twin Timeline, Verification Report, Progress Status
**UI:** `DigitalTwinViewer.tsx` + `ProgressPanel.tsx`
**Persistence:** `digitalTwinTimeline`, `verificationReports`

### P4 Escrow Release Trigger State Machine
**Input:** Digital Twin verification + Locked Baseline + Milestones + Escrow Balance
**Process:** Milestone-Based Escrow Payment System, State Machine (pending→verified→released→disputed→appeal), HITL interrupt
**Output:** Escrow Release, Payment received, Milestone Status
**UI:** `EscrowVaultCard.tsx` + `MilestoneProgressCard.tsx` + `EscrowReleaseTrigger.tsx`
**Persistence:** `escrowMilestones`, `escrowReleases`

### P5 Variation Vault Change Order Manager
**Input:** Escrow Release Trigger + Locked Baseline + Builder Change Request + Contractor Priced Response + Supplier Restocking Fees
**Process:** Change Order Protocol, Reversal Penalty Calculation (4 lenses: Red Pen + WIPAA + True Ledger + Budget Engineer)
**Output:** Change Order, New BOQ line item, Revised WBS, True Ledger captures
**UI:** `VariationVault.tsx`
**Persistence:** `changeOrders`, `variationPenalties`

### P6 WIPAA Monitor Solvency Dashboard & Handover
**Input:** Escrow Release Trigger + Variation Vault + Real-Time Job Costing + WIPAA entries + Change Orders + Supplier Scorecards + Digital Twin Progress + Cashflow Chart
**Process:** WIPAA Monitor (monthly true profitability), WIPAA Alert Escalation, Cashflow Chart, Profit & Loss Dashboard, Gain/Fade Analysis, Digital Handover, Physical Key Handover
**Output:** WIPAA Report, Profit & Loss Dashboard, Gain/Fade Analysis, Digital Handover, Physical Key Handover
**UI:** `WIPAAMonitor.tsx` + `CashflowChart.tsx` + `GainFadeAnalysis.tsx` + `DigitalHandover.tsx` + `PhysicalKeyHandover.tsx` + `ContingencySpendDown.tsx`
**Persistence:** `wipaaEntries`, `handoverPackages`

---

## Technical Architecture

### RAG Pipeline
- Hybrid BM25 + dense embeddings (local FNV-1a 256-dim)
- RRF fusion k=60 over-fetch → cross-encoder rerank (BAAI/bge-reranker-base ONNX)
- Threshold 0.7, citation format `[ZBC Ch.X Cl.Y]`
- IndexedDB persistence with incremental `addChunks`

### Free-Tier LLM Router
- Providers: Bytez, Groq, GitHub Models, OpenRouter, NVIDIA, HF
- Rate limiting with 429 backoff + circuit breaker
- Token/request budget enforcement

### State Machines
- LangGraph-style generic state machine with checkpointing
- Dexie thread checkpointer for resumable execution
- HITL interrupts for architect/QS approval gates

### Observability
- Local-first telemetry (Dexie `telemetryEvents`)
- Optional Langfuse remote sink (`VITE_LANGFUSE_*`)
- Prompt regression gate (promptfoo 80% threshold)

### Data Quality Gates
- Corpus hygiene engine (dead-OCR quarantine, dedup)
- Retrieval eval (recall@k, MRR, NDCG@k) — 7-query labeled set
- Red Pen canonical case locked in golden gate

---

## UI Design System (DzeNhare Unicorn Standard)
- **Palette:** Navy/Brass (verified AA Lighthouse 100) — NOT forest/gold
- **Components:** Bento Grid, Glassmorphism cards, Border beams, Gold shimmer
- **Typography:** JetBrains Mono for money (tabular-nums), Space Grotesk headings
- **Touch targets:** 44px minimum, staggered scroll reveals
- **Icons:** Lucide React, emerald GreenFlagBadge circle white checkmark

---

## Implementation Priority

### Phase 1: Foundation (Week 1-2)
1. Extend `stageRegistry.ts` with 11 new StageIds
2. Update `Dashboard.tsx` lazy imports + render branches
3. Add Dexie schema v15+ for new tables
4. Create base stores (resources, scorecards, costBaselines, etc.)

### Phase 2: Green Flag Guild Stages (Week 3-5)
1. C1 Resource Hub Discovery + RAG integration
2. C2 Team Assembly Wizard (3 paths)
3. C3 Certification & Vetting + MCP domain-tools
4. C4 Bulk Procurement + TCO engine
5. C5 Cost Baseline + Red Pen Audit

### Phase 3: Site Hawk Stages (Week 6-8)
1. P1 Critical Path + Gantt + Cashflow
2. P2 Site Mobilization + Logistics
3. P3 Digital Twin Viewer (Three.js/WebGL)
4. P4 Escrow State Machine + HITL
5. P5 Variation Vault (4-engine penalty)
6. P6 WIPAA Monitor + Handover

### Phase 4: Integration & Polish (Week 9-10)
1. End-to-end workflow tests
2. Prompt regression gate (promptfoo)
3. Retrieval eval gate (recall@k/MRR/NDCG)
4. Performance optimization (bundle splitting, memoization)
5. Production deploy

---

## Constitution Compliance
- ✅ Local-first (IndexedDB Dexie, no backend)
- ✅ No paid APIs (free-tier router with local fallback)
- ✅ No telemetry without consent (Langfuse opt-in only)
- ✅ SI 56/2025 human-in-the-loop gates
- ✅ Honest positioning (no fake video, no phantom features)
- ✅ Keys stored in browser only (localStorage via persisted stores)