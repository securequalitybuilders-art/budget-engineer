# DZENHARE PROJECT CONSTITUTION
## Technical Governance, 6-Layer Topology, Schema Standards & AI Module Protocol
### Version 6.0 | Sprint 5 Release

---

## PREAMBLE

This document is the **supreme technical law** of the Dzenhare OS codebase. It overrides personal developer preferences, superficial patterns, and rapid workarounds. Every engineer, designer, and contributor must strictly align with these standards to build a platform that serves builders in Africa's emerging markets.

> *"We build for the African builder with a $200 phone, on 2G internet, who speaks ChiShona or English. Every line of code must respect their battery, data, and offline reality."*

---

## ARTICLE I: THE 6-LAYER TOPOLOGY

Every service, module, and integration in Dzenhare OS must sit cleanly within one of the following six defined layers. Inter-layer communications must follow strict unidirectional flows.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 0: CLIENT (Offline-First, Mobile-First)                               │
│ • React Native (Mobile Apps) • React + Vite PWA • RxDB & Local Cache        │
├─────────────────────────────────────────────────────────────────────────────┤
│ LAYER 1: EDGE                                                               │
│ • Kong API Gateway • Cloudflare CDN • WebSocket Hub                         │
├─────────────────────────────────────────────────────────────────────────────┤
│ LAYER 2: MICROSERVICES (EKS Container Fabric)                               │
│ • Identity (Keycloak) • Project • AI Studio • Vault • Payments • Supplier   │
├─────────────────────────────────────────────────────────────────────────────┤
│ LAYER 3: AI/ML PLATFORM (GPU Spot Compute Nodes)                            │
│ • Stable Diffusion • RAG Pipeline • YOLOv11 PPE Vision • EnergyPlus         │
├─────────────────────────────────────────────────────────────────────────────┤
│ LAYER 4: DATA (Polyglot Storage & Event Mesh)                               │
│ • PostgreSQL (Primary) • EventStoreDB • Apache Kafka • Redis • Neo4j • Kuzu │
├─────────────────────────────────────────────────────────────────────────────┤
│ LAYER 5: EXTERNAL (Third-Party Rails & Government APIs)                     │
│ • EcoCash / Paynow / Stripe • Twilio / WhatsApp • ZIMRA • Deeds Office      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.1 Layer 0: Client Layer (Offline-First)
- **Primary Tooling**: React Native for mobile applications, React + Vite + TypeScript for lightweight Progressive Web Apps (PWAs).
- **Offline Protocol**: RxDB utilizing SQLite/IndexedDB backends. Reads/writes occur locally. Changes are queued as events.
- **Visual Design**: Strict 375px baseline mobile-first design, 44px minimal touch targets, brand-compliant Deep Cobalt (`#1a365d`) and Warm Sand (`#d4a574`) themes.

### 1.2 Layer 1: Edge Layer
- **Primary Tooling**: Kong API Gateway for auth verification, rate limiting, and geo-routing.
- **CDN**: Cloudflare caches heavy WASM modules, 3D model geometry (Pascal Editor files), and static assets.
- **WebSocket Hub**: Enables real-time synchronization, team chats, and low-latency notifications.

### 1.3 Layer 2: Microservices Layer
- **Environment**: Kubernetes (AWS EKS).
- **Core Domain Services**: Identity (Keycloak), Project lifecycle, AI Studio API, Vault (Budget Core), Payments, Contractor network, Supplier catalog, and Document management (Paperless-ngx sidecars).

### 1.4 Layer 3: AI/ML Platform
- **Primary Tooling**: GPU compute clusters for model inference.
- **Engines**: Stable Diffusion + ControlNet (renderings), YOLOv11 (PPE and safety check), Llama + Qdrant (RAG design skills matching), Kuzu (AEC precedent graph database), and EnergyPlus (building thermal efficiency calculations).

### 1.5 Layer 4: Data Layer
- **Primary Tooling**: PostgreSQL (relational transactions), EventStoreDB (immutable event logging), Apache Kafka (12-topic event bus), Redis (caches/session), Neo4j (referral and supplier graphs).

### 1.6 Layer 5: External Layer
- **Integrations**: Payment rails (Stripe, EcoCash, Paynow), communications (Twilio, WhatsApp), and government systems (ZIMRA deeds mapping, council building permits).

---

## ARTICLE II: THE 12 CORE DATABASE TABLES

To prevent database fragmentation, all core platform data must be normalized and structured into these 12 tables. All tables utilize UUID v7 for sequential clustering and database row-level security (RLS).

### 2.1 Event Store & Identity

#### 1. `vault_events`
Stores the immutable transaction log of all budget and system events for cryptographic verification.
```sql
CREATE TABLE vault_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    aggregate_id UUID NOT NULL,
    payload JSONB NOT NULL,
    metadata JSONB NOT NULL,
    stream_version BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX idx_vault_events_aggregate ON vault_events(aggregate_id);
```

#### 2. `users`
Identity profiles for builders, contractors, and suppliers.
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50) UNIQUE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('BUILDER', 'CONTRACTOR', 'SUPPLIER', 'ADMIN')),
    language_preference VARCHAR(10) DEFAULT 'en' CHECK (language_preference IN ('en', 'sn', 'nd', 'af', 'pt')),
    currency_preference VARCHAR(10) DEFAULT 'USD' NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
```

### 2.2 Project Management & Estimating

#### 3. `projects`
Core records for all active home constructions.
```sql
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    builder_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    location_coordinates POINT,
    budget_locked BOOLEAN DEFAULT FALSE NOT NULL,
    status VARCHAR(50) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
```

#### 4. `milestones`
5-stage structural progression phases (Foundation, Walling, Roofing, Electrical/Plumbing, Finishes).
```sql
CREATE TABLE milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    sequence_order INT NOT NULL,
    budget_allocated NUMERIC(19, 4) NOT NULL CHECK (budget_allocated >= 0),
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'WIPAA_SUBMITTED', 'APPROVED', 'REJECTED')),
    wipaa_required BOOLEAN DEFAULT TRUE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);
```

#### 5. `budget_lines`
Detailed bill of quantities (BOQ) mapping estimated materials to projects.
```sql
CREATE TABLE budget_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
    milestone_id UUID REFERENCES milestones(id) ON DELETE RESTRICT,
    category VARCHAR(100) NOT NULL CHECK (category IN ('MATERIALS', 'LABOR', 'EQUIPMENT', 'PERMITS', 'PROFESSIONAL_SERVICES', 'CONTINGENCY')),
    item_description TEXT NOT NULL,
    quantity NUMERIC(15, 4) NOT NULL CHECK (quantity > 0),
    unit VARCHAR(50) NOT NULL,
    unit_price NUMERIC(19, 4) NOT NULL CHECK (unit_price >= 0),
    ai_confidence NUMERIC(5, 2) NOT NULL CHECK (ai_confidence BETWEEN 0 AND 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
```

### 2.3 Execution Network

#### 6. `contractor_profiles`
Performance metrics and professional capacity indexes.
```sql
CREATE TABLE contractor_profiles (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE RESTRICT,
    specialties VARCHAR(100)[] NOT NULL,
    experience_years INT NOT NULL CHECK (experience_years >= 0),
    safety_rating NUMERIC(4, 2) DEFAULT 100.00 NOT NULL CHECK (safety_rating BETWEEN 0 AND 100),
    quality_rating NUMERIC(4, 2) DEFAULT 100.00 NOT NULL CHECK (quality_rating BETWEEN 0 AND 100),
    timeliness_rating NUMERIC(4, 2) DEFAULT 100.00 NOT NULL CHECK (timeliness_rating BETWEEN 0 AND 100),
    overall_rating NUMERIC(3, 2) DEFAULT 5.00 NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
    verified BOOLEAN DEFAULT FALSE NOT NULL
);
```

#### 7. `bids`
Price-for-Performance (P4P) dynamic bids sent by contractors.
```sql
CREATE TABLE bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
    contractor_id UUID NOT NULL REFERENCES contractor_profiles(id) ON DELETE RESTRICT,
    milestone_id UUID NOT NULL REFERENCES milestones(id) ON DELETE RESTRICT,
    proposed_price NUMERIC(19, 4) NOT NULL CHECK (proposed_price > 0),
    estimated_days INT NOT NULL CHECK (estimated_days > 0),
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED')),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
```

#### 8. `wipaa_records`
Work Inspection and Payment Approval Authority photo-evidence records.
```sql
CREATE TABLE wipaa_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    milestone_id UUID NOT NULL REFERENCES milestones(id) ON DELETE RESTRICT,
    contractor_id UUID NOT NULL REFERENCES contractor_profiles(id) ON DELETE RESTRICT,
    photo_urls TEXT[] NOT NULL,
    gps_coordinates POINT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    ai_quality_score NUMERIC(5, 2) NOT NULL CHECK (ai_quality_score BETWEEN 0 AND 100),
    status VARCHAR(50) DEFAULT 'PENDING_REVIEW' CHECK (status IN ('PENDING_REVIEW', 'APPROVED', 'REJECTED')),
    reviewed_at TIMESTAMP WITH TIME ZONE
);
```

### 2.4 Supply & Commerce

#### 9. `supplier_profiles`
Verified bulk material merchants.
```sql
CREATE TABLE supplier_profiles (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE RESTRICT,
    company_name VARCHAR(255) NOT NULL,
    delivery_areas TEXT[] NOT NULL,
    rating NUMERIC(3, 2) DEFAULT 5.00 NOT NULL CHECK (rating BETWEEN 1 AND 5),
    verified BOOLEAN DEFAULT FALSE NOT NULL
);
```

#### 10. `catalog_items`
Standardized building materials index mapping real-time pricing feeds.
```sql
CREATE TABLE catalog_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES supplier_profiles(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    price NUMERIC(19, 4) NOT NULL CHECK (price >= 0),
    currency VARCHAR(10) DEFAULT 'USD' NOT NULL,
    in_stock BOOLEAN DEFAULT TRUE NOT NULL
);
```

### 2.5 Payments & Escrow

#### 11. `escrow_accounts`
Builder-funded lockboxes holding milestone budgets.
```sql
CREATE TABLE escrow_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
    total_funded NUMERIC(19, 4) DEFAULT 0.0000 NOT NULL,
    released_amount NUMERIC(19, 4) DEFAULT 0.0000 NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD' NOT NULL,
    status VARCHAR(50) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISBURSED', 'DISPUTED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
```

#### 12. `invoices`
Transaction payout records distributing funds (utilizing the 90/10 holdback protocol).
```sql
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    escrow_account_id UUID NOT NULL REFERENCES escrow_accounts(id) ON DELETE RESTRICT,
    milestone_id UUID NOT NULL REFERENCES milestones(id) ON DELETE RESTRICT,
    contractor_id UUID NOT NULL REFERENCES contractor_profiles(id) ON DELETE RESTRICT,
    payout_amount NUMERIC(19, 4) NOT NULL CHECK (payout_amount > 0),
    holdback_amount NUMERIC(19, 4) NOT NULL CHECK (holdback_amount >= 0),
    status VARCHAR(50) DEFAULT 'UNPAID' CHECK (status IN ('UNPAID', 'PAID', 'HELD')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE
);
```

---

## ARTICLE III: ARCHITECTURAL DECISIONS

### 3.1 Mobile-First Layout
All interfaces must align to a **375px baseline**. Viewports must scale *up*, never down. All tap targets must conform to the **44px rule** to support builders wearing thick gloves or using budget touchscreen displays.

### 3.2 Offline-First Event-Sourcing
- **No Direct Mutation**: Operations must trigger discrete, serialized events (e.g., `PROJECT_CREATION_REQUESTED`).
- **Offline Ledger**: Events append to the local IndexedDB/localStorage log when offline.
- **Reconciliation Engine**: When internet returns, the background sync broker pushes queued events in chronological sequence and updates local projections.

### 3.3 Strict Financial Data Types
- Floating-point arithmetic is strictly prohibited for monetary calculations.
- All pricing, totals, budgets, and percentages must utilize localized, arbitrary-precision libraries (e.g., `decimal.js` or `BigNumber`) and database type `NUMERIC(19, 4)`.

---

## ARTICLE IV: THE CONSTITUTIONAL PROHIBITIONS (10 Anti-Patterns)

Any code committed containing these anti-patterns will fail CI verification and lead to automated PR rejection.

### AP-001: Floating-Point for Currency
*   **Prohibition**: Never use native JS numbers or floats for currency operations.
*   **Enforcement**: ESLint AST parser rejects variables containing pricing keywords typed as `number`. Use localized `Decimal` objects.

### AP-002: Expose Total Budget to Contractors
*   **Prohibition**: Never leak total project budget to bidding contractors.
*   **Enforcement**: GraphQL schemas and REST serializers explicitly prune the `budget_locked` and overall budget fields on queries initiated by users tagged with `role: CONTRACTOR`.

### AP-003: Offline Finalized Payments
*   **Prohibition**: Payouts must never be finalized while offline.
*   **Enforcement**: Escalated multi-sig approvals for payout releases are flagged as "PENDING_SYNC" and locked on the client layer until mTLS handshakes confirm server verification.

### AP-004: Desktop-First Breakpoints
*   **Prohibition**: Never write media queries starting with desktop widths.
*   **Enforcement**: Lint rules force mobile CSS styles by default. Media queries must exclusively use `min-width` rules starting at 375px, 640px, and 768px.

### AP-005: Bypassing the Event Log
*   **Prohibition**: Client views must never update project states directly without dispatching an event.
*   **Enforcement**: State managers (like Redux or Zustand) are configured to throw errors if states are mutated outside of event actions.

### AP-006: Hardcoding Localized Content
*   **Prohibition**: Hardcoding raw English or Shona UI text is forbidden.
*   **Enforcement**: AST scanner flags files containing unmapped string literals. All text must utilize `i18n.t("key")`.

### AP-007: Plaintext Secrets in Repositories
*   **Prohibition**: Credentials, keys, and tokens must never exist in the codebase or environment files committed to git.
*   **Enforcement**: Pre-commit hooks run `gitleaks` scans. Secrets must load dynamically from Supabase Vault / HashiCorp Vault.

### AP-008: Unbounded Database Queries
*   **Prohibition**: Never query database collections without pagination limits.
*   **Enforcement**: DB queries automatically append `LIMIT 50` at the driver layer if no explicit limit parameter is supplied.

### AP-009: Bypassing Row-Level Security (RLS)
*   **Prohibition**: Database tables must never be queried with bypass schemas.
*   **Enforcement**: CI tests run verification scripts on migration folders to ensure RLS policies exist on every new table.

### AP-010: Synchronous API Chaining
*   **Prohibition**: Microservices must not call other microservices in synchronous blocking loops.
*   **Enforcement**: Service integration is async via Kafka. Synchronous HTTP request nesting depth is limited to 2.

---

## ARTICLE V: AI STUDIO MODULE — Conversational AI Protocol

The AI Studio module governs all conversational AI interactions within Dzenhare OS. It is the single entry point for builder-facing LLM capabilities and must enforce event sourcing, response validation, context awareness, and skill-based RAG.

### 5.1 Module Topology

```
Layer 0 (Client):
  └─ AI Studio Page (React) ←→ Threaded Chat UI (React Component)
Layer 2 (Microservice):
  └─ @dzenhare/ai-studio (Express)
      ├─ ConversationService  (thread management, event sourcing)
      ├─ RagService           (Qdrant + Kuzu AEC Knowledge Graph)
      ├─ LlmService           (multi-provider: Ollama / Anthropic / OpenAI)
      ├─ SkillService         (dynamic skill loading)
      └─ ValidationService    (5-gate response validation)
Layer 3 (AI/ML):
  ├─ Qdrant (vector store: dzenhare_architectural, dzenhare_skills_*)
  ├─ Kuzu (AEC Knowledge Graph: precedents, codes, materials)
  └─ Skills Runtime (country-zimbabwe, boq-calculator, etc.)
Layer 4 (Data):
  ├─ conversation_events (immutable event log)
  ├─ ai_conversations (projection table)
  └─ conversation_messages (read-model for chat UI)
Layer 4 (Transport):
  └─ Kafka topic ai.design (produce: SESSION_STARTED, MESSAGE_SENT, RESPONSE_VALIDATED)
     Kafka topics project.lifecycle, milestone.status (consume: context refresh)
```

### 5.2 Data-First Rule (Constitutional)

Every conversational turn — user message AND AI response — MUST be persisted as an immutable `conversation_events` row BEFORE the response is delivered to the client. The delivery order is:

1. User message arrives at `POST /api/v1/ai/studio/conversations/:id/messages`
2. `ConversationService` appends `conversation_events` with `event_type = 'MESSAGE_SENT'`
3. Context is assembled (project data + skills + RAG)
4. LLM generates response
5. `ValidationService` validates response through 5 gates
6. Response is persisted as `conversation_events` with `event_type = 'RESPONSE_GENERATED'`
7. Response is delivered to client

**Prohibition**: No AI response may be streamed or returned to the client before step 6 completes.

### 5.3 Event-Sourced Conversation Schema

```sql
-- Immutable event log (single source of truth)
CREATE TABLE conversation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id),
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
    'CONVERSATION_CREATED', 'MESSAGE_SENT', 'RESPONSE_GENERATED',
    'RESPONSE_VALIDATED', 'RESPONSE_REJECTED', 'CONTEXT_UPDATED',
    'SKILL_LOADED', 'CONVERSATION_ARCHIVED'
  )),
  payload JSONB NOT NULL,
  metadata JSONB DEFAULT '{}',
  stream_version BIGINT NOT NULL,
  occurred_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UNIQUE (conversation_id, stream_version)
);

-- Materialized projection (for fast reads)
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  title TEXT,
  message_count INT DEFAULT 0 NOT NULL,
  last_message_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'ACTIVE' NOT NULL CHECK (status IN ('ACTIVE', 'ARCHIVED')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Individual messages (read model for chat UI)
CREATE TABLE conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role VARCHAR(10) NOT NULL CHECK (role IN ('user', 'ai', 'system')),
  content TEXT NOT NULL,
  sources JSONB DEFAULT '[]' NOT NULL,
  confidence NUMERIC(4, 3),
  validated BOOLEAN DEFAULT FALSE NOT NULL,
  token_usage JSONB DEFAULT '{}' NOT NULL,
  metadata JSONB DEFAULT '{}' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX idx_conv_messages_conv ON conversation_messages(conversation_id, created_at);
```

### 5.4 Context Awareness Protocol

Every conversation turn MUST hydrate the following context before LLM generation:

| Context | Source | Injection |
|---|---|---|
| Project title + status | `projects` table | System prompt header |
| Budget (locked + remaining) | `budget_lines` aggregate | Percentile of budget used |
| Active milestone | `milestones` table | Current stage + completion % |
| Location + region | `projects.location` | Building code jurisdiction |
| Language preference | `users.language_preference` | Response language |
| Currency preference | `users.currency_preference` | Monetary formatting |

### 5.5 Skills Integration Protocol

Skills are domain-specific knowledge modules loaded dynamically into the LLM context.

**Skill Registry** (loaded at service startup):

| Skill ID | Source | Trigger | Collection |
|---|---|---|---|
| `country-zimbabwe` | `Amanbh997/Skills-Architects` | project.region === 'ZW' | `dzenhare_skills_country_zimbabwe` |
| `boq-calculator` | `@dzenhare/boq-calculator` | Cost/quantity keywords in message | `dzenhare_boq_calculator` |

**Skill Loading Sequence**:
1. `SkillService` classifies message intent
2. Matched skills inject RAG context into LLM system prompt
3. Response `sources` array enumerates activated skills with relevance scores
4. Skills are cached for 5 minutes (TTL) within a conversation

### 5.6 Response Validation (5-Gate Pipeline)

Every AI response MUST pass all 5 validation gates before delivery:

| Gate | Check | Implementation | Action on Failure |
|---|---|---|---|
| **Schema** | Valid JSON, matches `AiResponseSchema` | Zod parse | Reject, re-generate (max 2 retries) |
| **Financial** | No float in monetary values | Regex `\d+\.\d{2,}` on price tokens | Reject, flag for human review |
| **Safety** | No harmful construction advice | Classifier model + blocklist | Reject, escalate to admin |
| **Hallucination** | Citations exist in RAG results | Cross-reference source IDs | Strip citation, log warning |
| **Confidence** | Overall confidence >= 0.6 | LlmService self-scoring | Queue for human review |

### 5.7 API Schema

```typescript
// POST /api/v1/ai/studio/conversations
// POST /api/v1/ai/studio/conversations/:id/messages
// GET  /api/v1/ai/studio/conversations
// GET  /api/v1/ai/studio/conversations/:id
// DELETE /api/v1/ai/studio/conversations/:id

interface CreateConversationRequest {
  projectId?: string;
  title?: string;
}

interface SendMessageRequest {
  content: string;       // min 1 char, max 10000 chars
  projectId?: string;    // override context
}

interface AiResponse {
  messageId: string;
  role: 'ai';
  content: string;
  sources: Array<{ skill: string; relevance: number; reference?: string }>;
  confidence: number;     // 0.0 - 1.0
  validated: boolean;
  tokenUsage: { input: number; output: number; total: number };
}
```

### 5.8 Anti-Patterns Specific to AI Studio

| ID | Prohibition | Enforcement |
|---|---|---|
| AP-AI-01 | Never deliver unvalidated AI output | ValidationService runs before every response |
| AP-AI-02 | Never skip event sourcing for performance | Event append is synchronous before delivery |
| AP-AI-03 | Never expose raw LLM prompts or system prompts | All prompts are server-side only |
| AP-AI-04 | Never hardcode fallback responses | All responses come from LLM or known skills |
| AP-AI-05 | Never cache user-specific conversation data across tenants | RLS enforced per `user_id` |

### 5.9 Kafka Integration

**Produced** (topic: `ai.design`):
- `CONVERSATION_CREATED` — new thread started
- `MESSAGE_SENT` — user message logged
- `RESPONSE_VALIDATED` — AI response delivered
- `SKILL_LOADED` — skill activated for conversation

**Consumed** (topics: `project.lifecycle`, `milestone.status`):
- `PROJECT_UPDATED` — refresh context cache
- `MILESTONE_APPROVED` — update context for active conversations

### 5.10 Definition of Done (Sprint 2)

- [ ] User creates conversation → `CONVERSATION_CREATED` event persisted
- [ ] User sends message → `MESSAGE_SENT` event persisted, then LLM invoked
- [ ] AI responds → `RESPONSE_VALIDATED` event persisted, response delivered
- [ ] Context includes project name, budget %, active milestone, region
- [ ] `country-zimbabwe` skill auto-loads for ZW projects
- [ ] `boq-calculator` skill activates on cost queries
- [ ] Validation pipeline blocks malformed or low-confidence responses
- [ ] All responses include `confidence` and `sources` arrays
- [ ] Frontend threaded chat displays branding (Deep Cobalt + Warm Sand)
- [ ] RLS enforced: users see only their conversations
- [ ] Offline: messages queued in RxDB, replay on reconnect

---

## ARTICLE VI: VAULT MODULE — Budget Engineering & Escrow Governance

The Vault module is the financial backbone of Dzenhare OS. It enforces immutable budget control, milestone-based escrow release, real-time variance tracking, and a 4-engine penalty system. All currency is calculated in **integer cents**. Every financial action is event-sourced. No money moves without a milestone. No milestone completes without WIPAA.

### 6.1 Module Topology

```
Layer 0 (Client):
  └─ Vault Page (React) ←→ VaultDashboard (Bento Grid)
      ├─ VaultSeal (SVG circular progress — Emerald/Amber/Rose)
      ├─ VarianceDashboard (per-category variance cards)
      ├─ EscrowTimeline (vertical milestone progression)
      ├─ PenaltyTimeline (4-engine penalty breakdown)
      └─ BudgetLockButton (animated lock → confetti)

Layer 2 (Microservice):
  └─ @dzenhare/vault (Express/Fastify)
      ├─ BudgetController     — lock, summary, change-order
      ├─ MilestoneController  — generate (AI), list, status
      ├─ PenaltyEngine        — assess, recalculate, forfeit
      ├─ EscrowController     — fund, release, ledger
      └─ EventService         — EventStoreDB append, Kafka produce

Layer 4 (Data):
  ├─ vault_events (EventStoreDB — immutable stream)
  ├─ vault_summary (PostgreSQL materialized view)
  ├─ milestone_progress (PostgreSQL projection)
  ├─ penalty_history (PostgreSQL table)
  └─ Kafka topics: budget.change, milestone.status, payment.transaction
```

### 6.2 Integer-Cents Currency Rule (Constitutional)

All monetary values in the Vault module MUST be stored as **integer cents**. This is a zero-tolerance constitutional rule.

```
GOOD:  budget_allocated_cents: 1250000    // $12,500.00
BAD:   budget_allocated: 12500.00         // floating-point — REJECTED
BAD:   budget_allocated: 1250000.0000     // NUMERIC(19,4) — REJECTED
```

**Enforcement**:
- ESLint rule `no-float-currency`: AST scanner rejects any variable matching `*price*`, `*amount*`, `*budget*`, `*funded*`, `*fee*` with type `number` (floats). Only `number` (int) and `bigint` are permitted.
- Database columns: `BIGINT NOT NULL CHECK (column_name >= 0)`.
- API payloads: All monetary fields use `_cents` suffix, type `integer`.
- Display formatting: Frontend divides by 100 only at render time using `fmtCents()` helper.
- No `NUMERIC(19,4)` anywhere in vault-related schemas.

### 6.3 Event-Sourced Financial Ledger

Every financial action MUST append an immutable event to the `vault_events` stream BEFORE any state projection is updated. The delivery order is:

1. User action triggers event (e.g., `BUDGET_LOCKED`, `MILESTONE_CREATED`, `PENALTY_ASSESSED`)
2. `EventService` appends event to EventStoreDB stream `vault-{projectId}`
3. Event is produced to relevant Kafka topic
4. PostgreSQL materialized views are rebuilt asynchronously
5. Client receives confirmation via WebSocket or poll

**Vault Event Types**:

| Event Type | Payload (all cents are BIGINT) | Trigger |
|---|---|---|
| `BUDGET_INITIALIZED` | `{ totalBudgetCents, contingencyCents }` | Project created with initial BOQ |
| `BUDGET_LOCKED` | `{ totalBudgetCents, lockedBy, lockedAt }` | Builder locks budget |
| `BUDGET_MODIFIED` | `{ deltaCents, reason, changeOrderId }` | Change order approved |
| `MILESTONE_GENERATED` | `{ milestones: AiMilestoneOutput[] }` | AI generates schedule |
| `MILESTONE_CREATED` | `{ milestoneId, name, sequence, budgetAllocatedCents }` | Milestone instantiated |
| `MILESTONE_SCHEDULED` | `{ milestoneId, es, ef, ls, lf, slack, isCritical }` | CPM schedule computed |
| `MILESTONE_IN_PROGRESS` | `{ milestoneId, startedAt }` | Work begins |
| `WIPAA_SUBMITTED` | `{ milestoneId, qualityScore, photoUrls }` | Photo evidence uploaded |
| `WIPAA_APPROVED` | `{ milestoneId, approvedBy }` | Milestone work validated |
| `ESCROW_FUNDED` | `{ amountCents, transactionId }` | Builder funds escrow |
| `PAYMENT_RELEASED` | `{ milestoneId, amountCents, holdbackCents }` | 90% milestone payment |
| `PENALTY_ASSESSED` | `{ milestoneId, delayDays, tier, ratePerDay, penaltyCents, forfeitMilestone, breakdown }` | Penalty calculated |
| `CONTINGENCY_USED` | `{ amountCents, reason, remainingCents }` | Contingency drawn |
| `CHANGE_ORDER_REQUESTED` | `{ changeOrderId, description, budgetImpactCents, scheduleImpactDays }` | Change initiated |

**Prohibition**: No state projection may update before the corresponding event is persisted. Violation is a constitutional breach (AP-005 applies).

### 6.4 4-Engine Penalty System

The penalty engine evaluates four weighted dimensions to compute a composite penalty on milestone delays and budget variances.

#### Engine 1: Schedule Impact (35% weight)

| Tier | Delay Range | Daily Rate | Cap |
|---|---|---|---|
| Tier 1 | <7 days | 0.5% per day | 3.5% total |
| Tier 2 | 7-14 days | 1% per day | 14% total |
| Tier 3 | 14-30 days | 2% per day | 60% total |
| Tier 4 | >30 days | Forfeit | 100% of milestone budget |

```typescript
function assessSchedulePenalty(delayDays: number, milestoneBudgetCents: bigint): SchedulePenaltyResult {
  if (delayDays >= 30) return { tier: 'TIER_4', ratePerDay: 0, penaltyCents: milestoneBudgetCents, forfeit: true };
  if (delayDays >= 14) return { tier: 'TIER_3', ratePerDay: 0.02, penaltyCents: BigInt(Math.floor(Number(milestoneBudgetCents) * 0.02 * delayDays)), forfeit: false };
  if (delayDays >= 7) return { tier: 'TIER_2', ratePerDay: 0.01, penaltyCents: BigInt(Math.floor(Number(milestoneBudgetCents) * 0.01 * delayDays)), forfeit: false };
  return { tier: 'TIER_1', ratePerDay: 0.005, penaltyCents: BigInt(Math.floor(Number(milestoneBudgetCents) * 0.005 * delayDays)), forfeit: false };
}
```

#### Engine 2: Budget Variance (30% weight)

Measures deviation from budgeted spend at milestone completion.
```
variance_pct = (actual_spent_cents - budgeted_cents) / budgeted_cents
penalty_cents = budgeted_cents × variance_pct × 0.30
Only applies when variance_pct > 0 (overspend). No penalty for underspend.
```

#### Engine 3: Quality Degradation (20% weight)

Uses WIPAA AI quality score (0-100). Penalty triggers when score < 80.
```
quality_deficit = max(0, 80 - ai_quality_score)
penalty_cents = budgeted_cents × (quality_deficit / 100) × 0.20
```

#### Engine 4: Contingency Burn (15% weight)

Penalizes excessive contingency usage beyond 50% of allocated contingency.
```
contingency_excess_pct = max(0, contingency_used_pct - 50)
penalty_cents = budgeted_cents × (contingency_excess_pct / 100) × 0.15
```

#### Composite Penalty

```typescript
interface PenaltyBreakdown {
  engine1: { weight: 0.35; penaltyCents: bigint; tier: PenaltyTier; delayDays: number };
  engine2: { weight: 0.30; penaltyCents: bigint; variancePct: number };
  engine3: { weight: 0.20; penaltyCents: bigint; qualityScore: number };
  engine4: { weight: 0.15; penaltyCents: bigint; contingencyExcessPct: number };
  totalPenaltyCents: bigint;
  penaltyPctOfBudget: number;   // totalPenaltyCents / milestoneBudgetCents * 100
  escalationLevel: 'NORMAL' | 'ESCALATED' | 'ARBITRATION';
}
```

- **>15% penalty**: Auto-escalation to project mediator
- **>25% penalty**: Arbitration required (human mediator assigned)

#### Change Order Protocol

Every change order triggers a full 4-engine recalculation:
1. `CHANGE_ORDER_REQUESTED` event emitted
2. Budget delta applied to affected milestones
3. All 4 engines re-run on revised budget
4. `BUDGET_MODIFIED` event emitted with recalculation results
5. Builder + contractor both sign digital acknowledgment

### 6.5 AI Milestone Schedule Generator

The AI milestone scheduler auto-generates a 5-phase release plan from project context.

**Input** (from client → AI Studio):
```typescript
interface GenerateMilestonesRequest {
  projectId: string;
  projectType: 'RESIDENTIAL' | 'COMMERCIAL' | 'INFRASTRUCTURE' | 'RENOVATION';
  region: string;            // e.g., 'Harare', 'Bulawayo'
  totalBudgetCents: bigint;
  builderId: string;
  language: 'en' | 'sn';
}
```

**AI System Prompt** (injected by AI Studio):
> You are Dzenhare Vault Scheduler. Generate a 5-phase milestone plan for a {projectType} project in {region} with budget ${totalBudgetCents/100}. Follow the DREAM → PLAN → PICK → BUILD → MOVE IN phases. Consider regional building codes (ZBC 1996 for ZW), typical duration norms, and budget allocation patterns. Return JSON conforming to AiMilestoneResponse schema.

**Output**:
```typescript
interface AiMilestoneResponse {
  milestones: Array<{
    name: string;             // e.g., "Foundation", "Walling"
    description?: string;
    durationDays: number;
    budgetPercentage: number; // e.g., 25 (means 25% of total budget)
    dependencyOrder: number[];// indices of milestones that must precede
    wippaRequired: boolean;
  }>;
  totalDurationDays: number;
  projectType: string;
}
```

**CPM Scheduling** (executed after AI response):

```typescript
interface ScheduledMilestone {
  id: string;
  name: string;
  sequence: number;
  durationDays: number;
  budgetAllocatedCents: bigint;  // totalBudgetCents * budgetPercentage / 100
  es: number;   // Early Start (day from project start)
  ef: number;   // Early Finish
  ls: number;   // Late Start
  lf: number;   // Late Finish
  slack: number; // LS - ES (0 = critical path)
  isCritical: boolean;
  dependencies: MilestoneDependency[];
}
```

**Forward Pass**:
```
ES[0] = 0
EF[i] = ES[i] + duration[i]
ES[j] = max(EF[i] for all i predecessors of j)
```

**Backward Pass**:
```
LF[last] = EF[last]
LS[i] = LF[i] - duration[i]
LF[j] = min(LS[i] for all i successors of j)
```

**Critical Path**: Milestones with slack === 0. Duration = sum of critical path durations.

### 6.6 90/10 Holdback Protocol

Every milestone payment follows the 90/10 holdback rule:
- **90%** of milestone budget released on WIPAA approval
- **10%** held in escrow until final project sign-off
- Holdback released only after all milestones complete and final inspection passes

```typescript
interface Invoice {
  milestoneId: string;
  payoutCents: bigint;           // milestoneBudgetCents * 0.90
  holdbackCents: bigint;         // milestoneBudgetCents * 0.10
  status: 'UNPAID' | 'PAID' | 'HELD';
  paidAt?: string;
}
```

### 6.7 VaultSeal — Circular Progress Indicator

The VaultSeal is the primary visual metaphor for budget health. It renders an SVG circular ring with color-coded fill.

**Specification**:
```
Size: 176px × 176px
Stroke width: 10px
Radius: (176 - 10) / 2 = 83px
Circumference: 2 * PI * 83 ≈ 521.5px
Track color: #e2e8f0 (neutral-200) | dark: #2c5282 (dark-surface)
Progress offset: circumference - (burnPct / 100) * circumference
```

**Color Rules**:
| Burn Rate | SVG Stroke Color | Glow Filter | Center Text Color |
|---|---|---|---|
| ≤25% (Emerald) | `#38a169` | `drop-shadow(0 0 6px #38a16944)` | `text-emerald-600` |
| >25% ≤50% (Amber) | `#d69e2e` | `drop-shadow(0 0 6px #d69e2e44)` | `text-amber-600` |
| >50% (Rose) | `#e53e3e` | `drop-shadow(0 0 6px #e53e3e44)` | `text-rose-600` |

**Center Content**:
- 40px circle with Shield icon (Warm Sand on Deep Cobalt)
- Released amount (H2, bold monospace)
- "of $X released" (caption, muted)
- Burn percentage badge (pill, tinted background matching severity)

**Animation**:
- Mount: Scale 0.85 → 1 (spring bounce), opacity 0 → 1
- Ring: stroke-dashoffset animates from circumference to target offset (1.2s ease-out)
- Center: Staggered entrance (shield rotate, text fade-up)
- Reduced motion: Skip all animations, render final state immediately

### 6.8 Variance Dashboard

The variance dashboard shows per-category and per-milestone budget performance.

**VarianceCard** (one per category/milestone):
- Header: Category label + severity badge (Emerald/Amber/Rose dot + variance %)
- Body: Overshoot/remaining text with color-coded monetary value (Emerald/Amber/Rose)
- ProgressBar: Spent vs. allocated (5px height, gradient fill)
- Footer: Spent amount + allocated amount (caption, muted)

**Severity Thresholds**:
```
≤5% variance     → Emerald (on track)
>5% ≤15%         → Amber (at risk)
>15%             → Rose (overrun)
```

**Data Refresh**: Variance recalculates on every `budget.change` and `milestone.status` event via WebSocket subscription. Offline mode uses last-cached projection.

### 6.9 Penalty Timeline

Displays penalty assessments chronologically per milestone.

**PenaltyCard**:
- Milestone name + due date + status badge
- Delay days count with icon (`AlertTriangle` size varies by tier)
- Tier badge (Tier 1-4 with color coding)
- Penalty amount in cents (formatted as dollars)
- Forfeit indicator (pulsing red icon if Tier 4)
- 4-engine breakdown bar (stacked horizontal bar showing each engine's contribution)

**Color Coding**:
| Tier | Card Border | Delay Badge | Forfeit |
|---|---|---|---|
| Tier 1 | `border-emerald-200` | `bg-emerald-100` text-emerald-700 | No |
| Tier 2 | `border-amber-200` | `bg-amber-100` text-amber-700 | No |
| Tier 3 | `border-rose-200` | `bg-rose-100` text-rose-700 | No |
| Tier 4 | `border-rose-500` (pulsing) | `bg-rose-900` text-white | Yes — ShieldAlert icon |

### 6.10 API Schema

```typescript
// POST /api/v1/vault/budget/lock
interface LockBudgetRequest {
  projectId: string;
  totalBudgetCents: bigint;
}
interface LockBudgetResponse {
  eventId: string;
  streamVersion: number;
  lockedAt: string;
}

// GET /api/v1/vault/budget/:projectId/summary
interface VaultSummaryResponse {
  projectId: string;
  totalBudgetCents: bigint;
  spentCents: bigint;
  remainingCents: bigint;
  contingencyCents: bigint;
  contingencyUsedCents: bigint;
  burnRatePct: number;
  milestoneCount: number;
  completedMilestoneCount: number;
  budgetLocked: boolean;
}

// POST /api/v1/vault/milestones/generate
interface GenerateMilestonesRequest {
  projectId: string;
  projectType: string;
  region: string;
  totalBudgetCents: bigint;
}
interface GenerateMilestonesResponse {
  milestones: ScheduledMilestone[];
  totalDurationDays: number;
  criticalPath: string[];
}

// GET /api/v1/vault/milestones/:projectId
// Returns milestone progress list

// POST /api/v1/vault/penalties/assess
interface AssessPenaltyRequest {
  milestoneId: string;
  actualCompletionDate: string;
  actualSpentCents: bigint;
  aiQualityScore: number;
  contingencyUsedCents: bigint;
}
interface AssessPenaltyResponse {
  assessment: PenaltyBreakdown;
  eventId: string;
}

// GET /api/v1/vault/penalties/:milestoneId
// Returns penalty history for a milestone

// POST /api/v1/vault/escrow/fund
interface FundEscrowRequest {
  projectId: string;
  amountCents: bigint;
  paymentMethod: string;
}
interface FundEscrowResponse {
  escrowId: string;
  fundedAt: string;
  totalFundedCents: bigint;
}

// POST /api/v1/vault/escrow/release
interface ReleasePaymentRequest {
  milestoneId: string;
}
interface ReleasePaymentResponse {
  payoutCents: bigint;
  holdbackCents: bigint;
  releasedAt: string;
}

// POST /api/v1/vault/change-orders
interface ChangeOrderRequest {
  projectId: string;
  milestoneId: string;
  description: string;
  budgetImpactCents: bigint;
  scheduleImpactDays: number;
}
```

### 6.11 Kafka Integration

**Produced**:
| Topic | Events |
|---|---|
| `budget.change` | BUDGET_INITIALIZED, BUDGET_LOCKED, BUDGET_MODIFIED, CONTINGENCY_USED |
| `milestone.status` | MILESTONE_CREATED, MILESTONE_GENERATED, MILESTONE_SCHEDULED, MILESTONE_IN_PROGRESS, WIPAA_SUBMITTED, WIPAA_APPROVED |
| `payment.transaction` | ESCROW_FUNDED, PAYMENT_RELEASED, PENALTY_ASSESSED |

**Consumed**:
| Topic | Events | Action |
|---|---|---|
| `project.lifecycle` | PROJECT_CREATED | Initialize vault for new project |
| `milestone.status` | WIPAA_SUBMITTED | Trigger penalty assessment |
| `payment.transaction` | PAYMENT_RELEASED | Update vault_summary projection |

### 6.12 Definition of Done (Sprint 3)

- [ ] All monetary fields migrated to integer cents (`BIGINT`) across types, DB, API, and frontend
- [ ] ESLint rule `no-float-currency` rejects floating-point vault values in CI
- [ ] `PenaltyEngine.assess()` computes correct penalties for all 4 tiers with unit test coverage
- [ ] `PenaltyEngine.forfeitMilestone()` correctly marks milestone as forfeit and releases remaining budget
- [ ] AI milestone generator produces valid 5-phase `AiMilestoneResponse` via AI Studio
- [ ] CPM scheduler computes ES/EF/LS/LF/slack and identifies critical path
- [ ] VaultSeal renders SVG circular progress with correct Emerald/Amber/Rose coloring
- [ ] VarianceDashboard shows per-category and per-milestone variance with severity badges
- [ ] PenaltyTimeline shows penalty assessments with tier badges and forfeit indicators
- [ ] BudgetLockButton animates shake → lock → confetti and dispatches `BUDGET_LOCKED` event
- [ ] EscrowTimeline displays vertical milestone progression with status dots
- [ ] Event sourcing enforced: every state change appends to `vault_events` before UI updates
- [ ] 90/10 holdback enforced on every milestone payment release
- [ ] Offline queue captures dispatches; `sync()` replays on reconnect with exponential backoff
- [ ] All vault text localized via `i18n.t("vault.*")` with English and Shona translations
- [ ] Dark mode supported: all vault components have `dark:` variants
- [ ] TypeScript: zero errors. ESLint: zero warnings. Unit tests: passing.
- [ ] RLS enforced: builders see own vault data; contractors see only assigned milestone budgets

### 6.13 Anti-Patterns Specific to Vault

| ID | Prohibition | Enforcement |
|---|---|---|
| AP-VLT-01 | Never use floating-point for currency | ESLint `no-float-currency` rule; CI rejection |
| AP-VLT-02 | Never update state before event persistence | EventService.append() must complete before projection update |
| AP-VLT-03 | Never release holdback before final sign-off | 90/10 rule enforced at EscrowController layer |
| AP-VLT-04 | Never expose total budget to contractors | API serializers prune `totalBudgetCents` when role === 'CONTRACTOR' |
| AP-VLT-05 | Never skip penalty assessment on overdue milestones | Auto-trigger on WIPAA submission + daily cron job |
| AP-VLT-06 | Never allow offline budget lock | Lock button disabled when `navigator.onLine === false` |
| AP-VLT-07 | Never bypass CPM scheduling for milestone dates | All milestones must go through CPM scheduler after AI generation |
| AP-VLT-08 | Never hardcode severity thresholds | Thresholds (5%, 15%, 25%) configurable via `vault-config` table |
| AP-VLT-09 | Never allow unbounded penalty accumulation | Penalty capped at 100% of milestone budget (forfeit) |
| AP-VLT-10 | Never store cents as `NUMERIC(19,4)` or `number` (float) | Schema enforces `BIGINT` for all `*_cents` columns |

---

*project_constitution.md | Dzenhare Technical Governance*
*Version 4.0 | Ratified: June 2026 | Sprint 3 — Vault v1*

---

## ARTICLE VII: CONTRACTOR NETWORK MODULE — Trust-Based Contractor Marketplace

The Contractor Network module is the execution backbone of Dzenhare OS. It manages contractor discovery, trust verification, P4P bidding, WIPAA progress verification, and dispute resolution. Every contractor action is event-sourced. No work begins without verified credentials. No payment releases without WIPAA.

### 7.1 Module Topology

```
Layer 0 (Client):
  └─ ContractorDirectory Page (React) — Card-based directory + Map view
      ├─ ContractorCard (profile, certs, portfolio, performance gauges)
      ├─ MapView (SADC regional + Google Maps contractor pins)
      ├─ BidComparisonTable (P4P price/duration/rating comparison)
      ├─ WipaaPanel (photo capture with GPS, notes, progress slider)
      ├─ CertificationBadge (ZIMRA, NEC, EMA verification indicators)
      └─ QuickStats (total partners, verified count, avg rating, active bids)

Layer 2 (Microservice):
  └─ @dzenhare/api — contractors + bidding routes
      ├─ ContractorController — CRUD, verification, certifications, portfolio, listing
      ├─ BidController — submit P4P bid, accept, reject, withdraw, list
      ├─ WipaaController — submit evidence, approve, reject (3-stage)
      ├─ VerificationEngine — ZIMRA + NEC document validation
      └─ EventService — EventStoreDB append, Kafka produce

Layer 4 (Data):
  ├─ contractor_profiles (PostgreSQL — company, specialties, ratings, verification status)
  ├─ verification_documents (PostgreSQL — ZIMRA, NEC, address proof uploads)
  ├─ contractor_certifications (PostgreSQL — trade certs, expiry tracking)
  ├─ contractor_portfolio (PostgreSQL — completed project gallery)
  ├─ bids (PostgreSQL — P4P pricing, schedule, scoring)
  ├─ wipaa_reports (PostgreSQL — photo evidence with GPS, AI quality scores)
  └─ Kafka topics: bid.activity, contractor.lifecycle, wipaa.lifecycle
```

### 7.2 Zero-Trust Verification Protocol

Every contractor must complete document-based verification before bidding on projects. The system enforces a **3-document minimum** for verified status.

**Required Documents**:

| Document Type | Issuer | Verification Method | Validity |
|---|---|---|---|
| `ZIMRA_TAX_CLEARANCE` | Zimbabwe Revenue Authority | Admin review + cross-reference | 12 months |
| `NEC_REGISTRATION` | National Employment Council | Admin review + grade check | 24 months |
| `PHYSICAL_ADDRESS_PROOF` | Local authority / utility bill | Geo-match against project region | 12 months |

**Verification State Machine**:

```
UNVERIFIED → (all docs uploaded) → PENDING → (all docs verified) → VERIFIED
                                              → (any doc rejected) → REJECTED
```

**Data-First Rule (Constitutional)**:
Every document upload, verification pass, and verification failure MUST be persisted as a `contractor.lifecycle` event before the status transition is reflected in the projection table.

### 7.3 Event-Sourced Contractor Lifecycle

All contractor actions produce immutable events.

**Contractor Event Types**:

| Event Type | Payload | Trigger |
|---|---|---|
| `CONTRACTOR_PROFILE_CREATED` | `{ contractorId, userId, companyName, specialties }` | Profile created |
| `CONTRACTOR_PROFILE_UPDATED` | `{ contractorId, updatedFields }` | Profile edited |
| `CONTRACTOR_CERTIFICATION_ADDED` | `{ certificationId, contractorId, name, issuer }` | New cert uploaded |
| `CONTRACTOR_PORTFOLIO_ITEM_ADDED` | `{ portfolioItemId, contractorId, title }` | Portfolio entry added |
| `DOCUMENT_UPLOADED` | `{ documentId, contractorId, documentType }` | Verification doc uploaded |
| `DOCUMENT_VERIFIED` | `{ documentId, verifiedBy, verifiedAt, notes }` | Admin approves/rejects |
| `BID_SUBMITTED` | `{ bidId, projectId, contractorId, price, p4pScore }` | P4P bid placed |
| `BID_ACCEPTED` | `{ bidId, acceptedBy, acceptedAt }` | Builder accepts bid |
| `BID_WITHDRAWN` | `{ bidId, withdrawnBy }` | Contractor withdraws |
| `WIPAA_SUBMITTED` | `{ reportId, milestoneId, photoCount, gpsCaptured }` | Progress photos with GPS |
| `WIPAA_APPROVED` | `{ wipaaId, approvedBy }` | Milestone work validated |
| `WIPAA_REJECTED` | `{ wipaaId, rejectedBy, notes }` | Work does not pass |
| `WIPAA_AUTO_APPROVED` | `{ wipaaId, reason }` | 48-hour auto-approval |
| `CONTRACT_SIGNED` | `{ projectId, contractorId, milestoneId }` | Bid → contract |
| `DISPUTE_OPENED` | `{ disputeId, milestoneId, reason }` | Dispute raised |
| `DISPUTE_RESOLVED` | `{ disputeId, resolution }` | Mediation/arbitration outcome |

### 7.4 P4P Bidding Engine

**Price-for-Performance Formula**:

```
p4pScore = priceScore × 0.6 + scheduleScore × 0.4

priceScore = max(0, round(100 - (priceRatio - 0.5) × 50))
  where priceRatio = min(proposedPriceCents / budgetCents, 2)

scheduleScore = max(0, min(100, round(100 - scheduleDays × 0.5)))
```

**Bid Schema** (API):

```typescript
interface CreateBidV2 {
  projectId: string;
  milestoneId: string;
  price: number;
  scheduleDays: number;
  qualityCommitment?: string;
  costBreakdown: Array<{
    category: BudgetCategory;
    description: string;
    amountCents: number;
  }>;
  portfolioReferences?: string[];
  notes?: string;
}
```

**Bid Lifecycle**:
```
DRAFT → PENDING → ACCEPTED → (contract signed) → ACTIVE
               → REJECTED
               → WITHDRAWN
               → EXPIRED (after milestone deadline + 7 days)
```

**Prohibition (AP-NET-01)**: No contractor may view competing bids. Each sees only their own submission status.

### 7.5 WIPAA — 3-Stage Progress Verification

The Work Inspection and Payment Approval Authority enforces a **3-stage approval chain** before milestone payments release.

**Stage Flow**:

1. **Self-Check** (Contractor): Submit progress photos with GPS coordinates + AI quality scan
2. **Peer-Check** (Independent Inspector): Randomly assigned from pool (only for milestones >$5,000)
3. **Client-Check** (Builder): Final visual approval via app

**Auto-Approval Rule**: If no objection within **48 hours** at any stage, the stage auto-approves.

**WIPAA Photo Requirements**:
```
- Minimum 3 photos per milestone stage
- GPS coordinates embedded in EXIF (captured at site)
- Timestamp must be within 24 hours of submission
- AI quality score must be >= 70 (else flagged for manual review)
```

**Prohibition (AP-NET-02)**: No payment release may bypass WIPAA approval. The 90/10 holdback protocol (Article VI §6.6) applies after all 3 stages pass.

### 7.6 Card-Based Directory & Map View

The frontend presents contractors in two interchangeable views:

**Card-Based Directory**:
- 2-column responsive grid (1-col mobile, 2-col tablet+, 3-col desktop)
- Each card shows: company name + logo initials, overall rating (Stars component), years experience, trade tags, 3 performance gauges (Safety, Quality, Timeliness), ZIMRA/NEC certification badges, portfolio thumbnail strip, verify badge
- Filter bar with: free text search, verified-only toggle, trade category pills, region filter
- Sort by: rating, projects completed, experience

**Map View**:
- SADC region map with contractor density dots
- Google Maps overlay for satellite/street-level pinning
- Region selection filters the directory below
- Color-coded pins: Verified (emerald), Unverified (neutral), Top-rated (warm sand)

**Visual Identity**:
- Deep Cobalt (`#1a365d`) for card headers, primary buttons, map pins
- Warm Sand (`#d4a574`) for CTAs, star ratings, accent badges
- Success Green (`#38a169`) for verified badges, WIPAA approved
- Warning Amber (`#d69e2e`) for pending verification
- Error Crimson (`#e53e3e`) for rejected documents, disputes
- Card shadow: `0 4px 12px rgba(0, 0, 0, 0.12)` hover state
- Typography: Inter (body), Space Grotesk (headings), JetBrains Mono (prices)

### 7.7 API Schema

```typescript
// GET /api/v1/contractors — List all contractors (with filters)
interface ListContractorsQuery {
  specialties?: string;
  minRating?: number;
  verified?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

// POST /api/v1/contractors/profile — Create/update profile
interface CreateContractorProfile {
  companyName: string;
  companyRegistration?: string;
  specialties: ContractorSpecialty[];
  yearsExperience: number;
  equipmentOwned?: EquipmentItem[];
  portfolioUrls?: string[];
  phone?: string;
  physicalAddress?: string;
  projectsCompleted?: number;
  insuranceCoverage?: string;
}

// GET /api/v1/contractors/:id/profile — Public profile
interface ContractorPublicProfile {
  id: string;
  companyName: string;
  specialties: string[];
  yearsExperience: number;
  overallRating: number;
  safetyScore: number;
  qualityScore: number;
  timelinessScore: number;
  verificationStatus: VerificationStatus;
  certifications?: Certification[];
  portfolio?: PortfolioItem[];
  projectsCompleted: number;
}

// POST /api/v1/projects/:id/bids — Submit P4P bid
// GET /api/v1/projects/:id/bids — List bids for project
// PUT /api/v1/projects/:id/bids/:bidId/accept — Accept bid

// POST /api/v1/projects/:id/milestones/:milestoneId/wipaa — Submit WIPAA
// PUT /api/v1/projects/:id/wipaa/:wipaaId/approve — Approve milestone
// PUT /api/v1/projects/:id/wipaa/:wipaaId/reject — Reject milestone

// POST /api/v1/contractors/certifications — Add certification
// GET /api/v1/contractors/:id/certifications — List certifications

// POST /api/v1/contractors/portfolio — Add portfolio item
// GET /api/v1/contractors/:id/portfolio — List portfolio items

// GET /api/v1/contractors/:id/rating — Get rating summary
// GET /api/v1/contractors/verification-status — Get my verification status
```

### 7.8 Frontend Component Architecture

```
pages/
  ContractorDirectory.tsx
    ├─ Header (icon + title + subtitle)
    ├─ QuickStats (4 metric cards)
    ├─ ViewToggle (Directory | Map | [WIPAA if active milestone])
    ├─ [if Directory]
    │   ├─ FilterPanel (search + verified toggle + trade pills)
    │   └─ ContractorCard Grid (responsive, staggered entrance)
    │       ├─ CertificationBadge (ZIMRA, NEC, EMA)
    │       ├─ PortfolioThumbnails (last 3 projects)
    │       ├─ PerformanceGauges (3x MiniGauge)
    │       └─ Action Buttons (Compare Bids / View Profile)
    ├─ [if Map]
    │   └─ MapView (SADC map + Google Maps toggle)
    │       ├─ SadcMap (SVG region map)
    │       └─ GoogleMapPlaceholder (API-ready integration)
    ├─ [modal] BidComparisonTable (sortable, best-value badge)
    └─ [modal] WipaaPanel (photo capture + GPS + progress + notes)
        ├─ PhotoGrid (up to 10, camera capture or upload)
        ├─ GpsCapture (geolocation button with status)
        ├─ ProgressSlider (0-100% range)
        └─ NotesTextarea (max 2000 chars)
```

### 7.9 Kafka Integration

**Produced** (topics: `contractor.lifecycle`, `bid.activity`, `wipaa.lifecycle`):

| Topic | Events |
|---|---|
| `contractor.lifecycle` | CONTRACTOR_PROFILE_CREATED, CONTRACTOR_PROFILE_UPDATED, CONTRACTOR_CERTIFICATION_ADDED, CONTRACTOR_PORTFOLIO_ITEM_ADDED, DOCUMENT_UPLOADED, DOCUMENT_VERIFIED |
| `bid.activity` | SUBMITTED, ACCEPTED, REJECTED, WITHDRAWN |
| `wipaa.lifecycle` | WIPAA_SUBMITTED, WIPAA_APPROVED, WIPAA_REJECTED, WIPAA_AUTO_APPROVED |

**Consumed**:
| Topic | Events | Action |
|---|---|---|
| `project.lifecycle` | PROJECT_CREATED | Notify matching contractors by specialty |
| `milestone.status` | MILESTONE_CREATED | Open bidding window for milestone |
| `payment.transaction` | PAYMENT_RELEASED | Update contractor earnings ledger |

### 7.10 Performance Scoring System

Contractors are scored across 4 dimensions weighted into an overall rating (1-5):

| Dimension | Weight | Calculation | Source |
|---|---|---|---|
| Safety | 30% | `(1 - incidentCount / totalProjects) × 100` | YOLOv11 PPE detections + incident reports |
| Quality | 30% | `avg(WIPAA AI quality scores)` | WIPAA photo analysis |
| Timeliness | 25% | `(1 - totalDelayDays / totalScheduleDays) × 100` | Milestone completion dates |
| Budget | 15% | `(1 - avgVariancePct) × 100` | Final spend vs budget allocation |

**Overall Rating** (1-5 scale):
```typescript
function computeOverallRating(safety: number, quality: number, timeliness: number, budget: number): number {
  const composite = safety * 0.30 + quality * 0.30 + timeliness * 0.25 + budget * 0.15;
  return Math.round((composite / 100) * 4 + 1);
}
```

### 7.11 Dispute Resolution

Disputes follow a 3-tier escalation:

1. **Negotiation** (in-app chat): Contractor + builder resolve directly (72-hour window)
2. **Mediation** (assigned mediator): Platform assigns neutral mediator (48-hour window)
3. **Arbitration** (binding): Final decision by Dzenhare arbitration panel

Each dispute is event-sourced:
- `DISPUTE_OPENED` → payload includes issue description, evidence refs
- `DISPUTE_ESCALATED` → moves to next tier
- `DISPUTE_RESOLVED` → outcome logged, rating adjustment triggered

### 7.12 Definition of Done (Sprint 4)

- [ ] `GET /api/v1/contractors` returns filtered, paginated list of profiles
- [ ] `POST /api/v1/contractors/certifications` creates cert record with event
- [ ] `POST /api/v1/contractors/portfolio` creates portfolio entry with event
- [ ] Contractor profiles display certification badges (ZIMRA, NEC) on cards
- [ ] ContractorCard shows portfolio thumbnails and projects completed count
- [ ] View toggle switches between card-based directory and map view
- [ ] Filter bar supports text search, verified-only toggle, trade category pills
- [ ] Trade categories include: Brickwork, Roofing, Foundation, Plumbing, Electrical, Structural Steel, Concrete Casting, Civil Works, Carpentry
- [ ] BidComparisonTable shows P4P score, best-value badge, sortable columns
- [ ] WipaaPanel captures photos (camera/gallery), GPS location, progress %, notes
- [ ] WIPAA dispatches event on submit to local event log (`WIPAA_SUBMITTED`)
- [ ] All monetary values use integer cents in server-side code
- [ ] Verified contractor profiles show emerald badge and top color bar
- [ ] QuickStats row displays: total partners, verified count, avg rating, active bids
- [ ] Card hover animation: translateY(-4px), shadow-lg, 200ms ease-out
- [ ] Every state change appends event before UI update (event sourcing)
- [ ] All text localized via `i18n.t("contractor.*")` with Shona/English toggle
- [ ] RLS enforced: contractors see own profile; builders see all public profiles
- [ ] Dark mode supported: all contractor components have `dark:` variants
- [ ] TypeScript: zero errors. ESLint: zero warnings.

### 7.13 Anti-Patterns Specific to Contractor Network

| ID | Prohibition | Enforcement |
|---|---|---|
| AP-NET-01 | Never expose competing bids to contractors | API serializers return only own bid; comparison is builder-only |
| AP-NET-02 | Never release payment without WIPAA | EscrowController checks WIPAA status before release |
| AP-NET-03 | Never accept unverified contractor bids | BidController rejects with 403 if `verificationStatus !== 'VERIFIED'` |
| AP-NET-04 | Never store certification docs as plain URLs | File URLs signed with 1-hour expiry; store in S3 with encryption |
| AP-NET-05 | Never hardcode verification document types | `document_type` stored as enum; configurable via `verification_config` table |
| AP-NET-06 | Never allow offline bid acceptance | `PUT /bids/:id/accept` returns 503 when `navigator.onLine === false` |
| AP-NET-07 | Never skip GPS on WIPAA photos | WIPAA schema requires `gpsCoordinates`; validation rejects without |
| AP-NET-08 | Never cache contractor ratings longer than 1 hour | Rating data TTL = 3600s; always serve fresh from projection |

---

## ARTICLE VIII: SUPPLIER MARKETPLACE MODULE — Transparent Material Procurement

The Supplier Marketplace module is the supply chain backbone of Dzenhare OS. It manages material and equipment cataloging, real-time pricing via the CWICR cost database, QR-based material authenticity verification, GPS delivery tracking, RFQ-based procurement, flash deals, and escrow-secured order payments. Every inventory update, order transition, and delivery status is event-sourced. No payment releases without delivery confirmation. No material accepted without authenticity verification.

### 8.1 Module Topology

```
Layer 0 (Client):
  └─ SupplierMarketplace Page (React) — Grid catalog + Cart + QR Scanner + Map
      ├─ CatalogGrid (responsive 1/2/3-column, staggered entrance)
      │   └─ MaterialCard (gradient placeholder, price mono, stock badge, add-to-cart)
      ├─ FilterPanel (search debounced, category pills, region + sort dropdowns)
      ├─ CartSlideout (slide-in panel, quantity controls, Traccar tracking toggle)
      ├─ QrScanner (camera overlay, torch, result sheet: GENUINE/COUNTERFEIT/UNKNOWN)
      ├─ DeliveryMap (Leaflet, vehicle marker with heading, ping trail, ETA banner)
      ├─ OrderTimeline (vertical stages with color-coded dots)
      ├─ FlashDealsBar (horizontal scroll, countdown, discount pill, claim CTA)
      └─ SupplierProfile (company info, catalog management, orders, stats)

Layer 2 (Microservice):
  └─ @dzenhare/supplier (Express/Fastify)
      ├─ CatalogController — CRUD, CWICR price refresh, pgvector search
      ├─ PricingController — live CWICR prices, price history
      ├─ OrderController — place, status transitions, escrow release
      ├─ TrackingController — Traccar GPS positions, delivery pings
      ├─ RfqController — create RFQ, submit/accept/reject quotes
      ├─ FlashDealController — create, auto-expire (Redis TTL), claim
      ├─ VerificationController — QR scan, CWICR cross-reference
      └─ EventService — EventStoreDB append, Kafka produce

Layer 4 (Data):
  ├─ supplier_catalog (PostgreSQL — items with price_cents, category, pgvector)
  ├─ supplier_orders (PostgreSQL — order lifecycle with items JSONB)
  ├─ delivery_tracking (PostgreSQL — GPS ping history)
  ├─ escrow_holds (PostgreSQL — order escrow with release tracking)
  ├─ material_verifications (PostgreSQL — QR scan log)
  ├─ rfq_quotes (PostgreSQL — supplier quotes on RFQs)
  ├─ flash_deals (PostgreSQL — time-limited deals with quantities)
  ├─ EventStoreDB (immutable supplier_events stream)
  ├─ Redis (flash deal TTL cache, CWICR price cache, catalog search cache)
  ├─ Qdrant (vector embeddings for semantic catalog search)
  └─ Kafka topics: supplier.order, supplier.catalog, supplier.verification
```

### 8.2 Integer-Cents Currency Rule (Constitutional)

All monetary values in the Supplier Marketplace module MUST be stored as **integer cents**. This is a zero-tolerance constitutional rule.

```
GOOD:  priceCents: 1350          // $13.50
GOOD:  totalAmountCents: 1250000 // $12,500.00
BAD:   price: 13.50              // floating-point — REJECTED
BAD:   totalAmount: 12500.00     // NUMERIC(19,4) — REJECTED
```

**Enforcement**:
- ESLint rule `no-float-currency`: AST scanner rejects any variable matching `*PriceCents`, `*AmountCents`, `*FeeCents`, `*DiscountCents` with type `number` (float). Only `number` (int) and `bigint` are permitted.
- Database columns: `INTEGER NOT NULL CHECK (column_name >= 0)` or `BIGINT NOT NULL`.
- API payloads: All monetary fields use `_cents` suffix, type `integer`.
- Display formatting: Frontend divides by 100 only at render time using `fmtCents()` helper.
- No `NUMERIC(19,4)` or `FLOAT` anywhere in supplier-related schemas.

### 8.3 Event-Sourced Supplier Ledger

Every financial and state-changing action MUST append an immutable event to the EventStoreDB stream BEFORE any state projection is updated.

**Supplier Event Types**:

| Event Type | Payload (all cents are INTEGER) | Trigger |
|---|---|---|
| `ORDER_PLACED` | `{ orderId, projectId, supplierId, buyerId, items[], totalAmountCents, escrowHeldCents }` | Buyer places order |
| `ORDER_CONFIRMED` | `{ orderId, confirmedAt }` | Supplier acknowledges |
| `ORDER_SHIPPED` | `{ orderId, trackingNumber, vehicleId, shippedAt }` | Goods dispatched |
| `ORDER_DELIVERED` | `{ orderId, deliveredAt, deliveryLat, deliveryLng, gpsVerified }` | Delivery confirmed |
| `ORDER_CANCELLED` | `{ orderId, reason, cancelledBy, refundCents }` | Order cancelled |
| `ORDER_RETURNED` | `{ orderId, returnReason, restockingFeeCents, refundCents }` | Goods returned |
| `CATALOG_ITEM_ADDED` | `{ itemId, supplierId, name, category, priceCents, cwicrCode }` | New catalog item |
| `CATALOG_ITEM_UPDATED` | `{ itemId, updatedFields }` | Catalog item edited |
| `CATALOG_PRICE_REFRESHED` | `{ supplierId, itemCount, refreshedAt }` | CWICR bulk price refresh |
| `FLASH_DEAL_CREATED` | `{ dealId, itemId, discountPercent, dealPriceCents, endTime }` | Flash deal created |
| `FLASH_DEAL_EXPIRED` | `{ dealId, expiredAt }` | Flash deal TTL expired |
| `MATERIAL_VERIFIED` | `{ verificationId, materialName, authenticity, cwicrListing }` | QR scan completed |
| `MATERIAL_FLAGGED` | `{ verificationId, reason, flaggedBy }` | Counterfeit suspected |
| `RFQ_CREATED` | `{ rfqId, projectId, title, itemCount }` | RFQ published |
| `RFQ_QUOTE_SUBMITTED` | `{ quoteId, rfqId, supplierId, priceCents, deliveryDays }` | Supplier quotes |
| `RFQ_QUOTE_ACCEPTED` | `{ quoteId, acceptedBy, acceptedAt }` | Quote accepted |
| `DELIVERY_LOCATION_UPDATED` | `{ orderId, vehicleId, latitude, longitude, speedKmph, etaMinutes }` | GPS ping recorded |

**Prohibition**: No state projection may update before the corresponding event is persisted. Violation is a constitutional breach (AP-005 applies).

### 8.4 Catalog Management & CWICR Pricing

The catalog system integrates with the CWICR cost database to provide real-time material pricing across SADC regions.

**Catalog Item Schema**:
```typescript
interface CatalogItem {
  id: string;
  supplierId: string;
  name: string;                  // max 255 chars
  description: string;
  category: CatalogCategory;
  unit: string;                  // e.g., "bag", "m", "m²", "tonne", "unit"
  baselineCwicrCode: string;     // CWICR material code (cross-reference key)
  baselinePriceCents: number;    // CWICR baseline price (integer cents)
  markupCents: number;           // supplier's markup over baseline
  priceCents: number;            // baselinePriceCents + markupCents (final price)
  currency: string;              // "ZAR" | "USD"
  stockLevel: number;            // current inventory count
  isActive: boolean;
  aiEmbedding: number[];         // 384d pgvector for semantic search
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}
```

**CWICR Price Refresh Flow**:
1. Supplier triggers `POST /api/v1/supplier/catalog/refresh-prices`
2. System iterates all items with `baselineCwicrCode`, fetches current CWICR rates
3. `priceCents = baselinePriceCents + markupCents` (markup preserved independently)
4. Emits `CATALOG_PRICE_REFRESHED` event
5. Rate-limited to 1 refresh per 15 minutes per supplier

**Search Strategy** (hybrid):
- Full-text: PostgreSQL `to_tsvector('english', name || ' ' || description)` with `ts_rank`
- Vector: pgvector `cosine_distance(ai_embedding, query_embedding)` using 384d embeddings
- Combined: `ts_rank * 0.6 + (1 - cosine_distance) * 0.4`
- Filters: category, supplierId, region, inStockOnly, price range

### 8.5 Order Lifecycle & Escrow

Orders follow a strict state machine with escrow-secured payments.

**Order State Machine**:
```
PENDING → CONFIRMED → SHIPPED → DELIVERED → (escrow released)
   ↓         ↓                                       ↓
CANCELLED  CANCELLED                              RETURNED → REFUNDED
```

**Escrow Protocol**:
- On `ORDER_PLACED`: Total `amountCents` held in escrow (status `HELD`)
- On `DELIVERED`: Escrow released subject to 3.5% platform fee
  - Fee: `Math.round(totalAmountCents * 0.035)` (2.5% transaction + 1% delivery insurance)
  - Supplier receives: `totalAmountCents - feeCents`
- On `CANCELLED` (before SHIPPED): Escrow fully refunded to buyer
- On `RETURNED` (within 7 days): Refund minus 10% restocking fee

**Order Schema**:
```typescript
interface SupplierOrder {
  id: string;
  projectId: string;
  supplierId: string;
  buyerId: string;
  items: Array<{
    catalogItemId: string;
    quantity: number;
    unitPriceCents: number;
    discountPercent: number;
  }>;
  totalAmountCents: number;
  discountAmountCents: number;
  escrowHeldCents: number;
  feeCents: number;                 // platform fee (3.5%)
  supplierPayoutCents: number;      // totalAmountCents - feeCents
  currency: string;
  status: OrderStatus;
  trackingNumber: string | null;
  estimatedDelivery: string | null;
  deliveredAt: string | null;
  deliveryLatitude: number | null;
  deliveryLongitude: number | null;
  returnReason: string | null;
  refundAmountCents: number | null;
  createdAt: string;
  updatedAt: string;
}
```

### 8.6 QR Material Verification

Every material batch can be verified for authenticity via QR code scan against the CWICR material registry.

**Verification Flow**:
1. User scans QR code via camera (or enters code manually)
2. QR data parsed (JSON, pipe-delimited, or raw code)
3. `POST /api/v1/supplier/materials/verify` cross-references against CWICR
4. Result: `GENUINE` (CWICR match), `COUNTERFEIT` (code not in registry), or `UNKNOWN` (unparseable)
5. `MATERIAL_VERIFIED` event emitted with scan metadata

**QR Format Support**:
```typescript
// JSON format
{ "code": "CWICR-MAT-CEM-001", "batch": "BATCH-2026-05", "manufactured": "2026-05-15" }

// Pipe-delimited (compact)
CWICR-MAT-CEM-001|BATCH-2026-05|2026-05-15

// Raw code (simple lookup)
CWICR-MAT-CEM-001
```

**Verification Result**:
```typescript
interface VerificationResult {
  verified: boolean;
  materialName: string;
  manufacturer: string;
  batchNumber?: string;
  manufactureDate?: string;
  qualityGrade: string | null;
  cwicrListing: boolean;
  cwicrPriceCents: number | null;
  authenticity: 'GENUINE' | 'COUNTERFEIT' | 'UNKNOWN';
  scannedAt: string;
}
```

### 8.7 GPS Delivery Tracking (Traccar)

Real-time delivery tracking via Traccar open-source GPS platform.

**Integration Points**:
- Vehicle registration: On SHIPPED status, register Traccar device via REST API
- Position streaming: WebSocket connection to Traccar for real-time lat/lng updates
- Ping recording: `POST /api/v1/supplier/orders/:id/tracking/ping` stores position to `delivery_tracking`
- ETA calculation: Based on distance-to-destination / average-speed (last 5 pings)
- Auto-DELIVERED: If GPS within 50m of delivery coordinates for 3 consecutive pings

**Delivery Tracking Response**:
```typescript
interface DeliveryTrackingResponse {
  orderId: string;
  status: string;
  trackingNumber: string;
  estimatedDelivery: string;
  livePosition: {
    vehicleId: string;
    currentLatitude: number;
    currentLongitude: number;
    speedKmph: number;
    heading: number;
    lastUpdated: string;
  } | null;
  pings: DeliveryPing[];
  checkpoints: Array<{
    location: string;
    timestamp: string;
    status: string;
  }>;
}
```

### 8.8 Flash Deals

Time-limited discounts powered by Redis TTL with automatic expiry.

**Deal Schema**:
```typescript
interface FlashDeal {
  id: string;
  supplierId: string;
  catalogItemId: string;
  discountPercent: number;      // 1-100
  dealPriceCents: number;        // priceCents - (priceCents * discountPercent / 100)
  startTime: string;
  endTime: string;
  maxQuantity: number;
  claimedQuantity: number;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  createdAt: string;
}
```

**Redis Caching**:
- Key: `flash-deal:{id}`, Value: FlashDeal JSON
- TTL: `endTime - now` (seconds until deal expiry)
- On expiry: Redis notification → `FLASH_DEAL_EXPIRED` event emitted
- Claim counter: Atomic `DECR` on Redis key `flash-deal:{id}:remaining`

**Claim Protocol**:
1. Buyer clicks "Claim Deal" → checks `claimedQuantity < maxQuantity`
2. Atomic claim count increment (Redis DECR + PostgreSQL check)
3. Item auto-added to cart at `dealPriceCents`
4. On order placement, `flash_deal_claims` record created linking order to deal

### 8.9 API Schema

```typescript
// GET /api/v1/supplier/catalog — Search catalog (hybrid full-text + pgvector)
interface CatalogSearchQuery {
  search?: string;              // full-text search query
  category?: CatalogCategory;
  supplierId?: string;
  region?: string;
  inStockOnly?: boolean;
  minPriceCents?: number;
  maxPriceCents?: number;
  sort?: 'relevance' | 'price_asc' | 'price_desc' | 'rating' | 'newest';
  cursor?: string;              // cursor-based pagination
  limit?: number;               // default 24, max 100
}

// POST /api/v1/supplier/catalog — Add catalog item
interface CreateCatalogItem {
  name: string;
  description?: string;
  category: CatalogCategory;
  unit: string;
  baselineCwicrCode?: string;
  baselinePriceCents: number;
  markupPercent: number;
  stockLevel: number;
  currency: string;
}

// POST /api/v1/supplier/catalog/refresh-prices — Bulk CWICR refresh
interface RefreshPricesResponse {
  refreshedCount: number;
  failedCount: number;
  errors: Array<{ itemId: string; error: string }>;
  refreshedAt: string;
}

// POST /api/v1/supplier/orders — Place order
interface CreateOrderRequest {
  projectId: string;
  supplierId: string;
  items: Array<{
    catalogItemId: string;
    quantity: number;
    unitPriceCents: number;
  }>;
  currency?: string;
}
interface CreateOrderResponse {
  orderId: string;
  totalAmountCents: number;
  escrowHeldCents: number;
  feeCents: number;
  status: 'PENDING';
  createdAt: string;
}

// PUT /api/v1/supplier/orders/:id/status — Update order status
interface UpdateOrderStatusRequest {
  status: 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'RETURNED';
  trackingNumber?: string;
  vehicleId?: string;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  returnReason?: string;
}

// GET /api/v1/supplier/orders/:id/tracking — Delivery tracking
// Returns DeliveryTrackingResponse (see §8.7)

// POST /api/v1/supplier/orders/:id/tracking/ping — Record GPS ping
interface DeliveryPingRequest {
  vehicleId: string;
  latitude: number;
  longitude: number;
  speedKmph?: number;
  heading?: number;
  etaMinutes?: number;
}

// POST /api/v1/supplier/materials/verify — QR material verification
interface VerifyMaterialRequest {
  qrCodeData: string;
  projectId?: string;
}
interface VerifyMaterialResponse {
  verificationId: string;
  verified: boolean;
  materialName: string;
  manufacturer: string;
  batchNumber: string | null;
  qualityGrade: string | null;
  authenticity: 'GENUINE' | 'COUNTERFEIT' | 'UNKNOWN';
  cwicrListing: boolean;
  cwicrPriceCents: number | null;
  scannedAt: string;
}

// POST /api/v1/supplier/rfq — Create RFQ
interface CreateRfqRequest {
  projectId: string;
  title: string;
  description?: string;
  items: Array<{ name: string; quantity: number; unit: string }>;
  deadline: string;
}

// POST /api/v1/supplier/flash-deals — Create flash deal
interface CreateFlashDealRequest {
  catalogItemId: string;
  discountPercent: number;
  startTime: string;
  endTime: string;
  maxQuantity: number;
}
```

### 8.10 Frontend Component Architecture

```
pages/
  SupplierMarketplace.tsx
    ├─ Header (Store icon + title + subtitle)
    ├─ FlashDealsBar (horizontal scroll, countdown timers)
    ├─ FilterPanel (search input + category pills + region/sort selects)
    ├─ CatalogGrid (responsive grid with MaterialCard)
    │   └─ MaterialCard (gradient img, meta, price, stock, add/remove)
    ├─ OrderTimeline (vertical connected dots, 5 stages)
    ├─ CartSlideout (slide-in panel, items, tracking toggle, order CTA)
    ├─ QrScanner (camera overlay, torch, result sheet)
    ├─ DeliveryMap (Leaflet, Traccar GPS, vehicle marker, ETA)
    └─ QuickStats (suppliers count, in-stock items, avg rating, project location)

  SupplierProfile.tsx
    ├─ Company info + rating + verification status
    ├─ Catalog Manager (add/edit items, bulk price refresh)
    ├─ Orders List (status filters, order cards)
    └─ Performance Stats (on-time delivery, total orders, avg rating)
```

### 8.11 Kafka Integration

**Produced**:

| Topic | Events |
|---|---|
| `supplier.order` | ORDER_PLACED, ORDER_CONFIRMED, ORDER_SHIPPED, ORDER_DELIVERED, ORDER_CANCELLED, ORDER_RETURNED |
| `supplier.catalog` | CATALOG_ITEM_ADDED, CATALOG_ITEM_UPDATED, CATALOG_PRICE_REFRESHED, FLASH_DEAL_CREATED, FLASH_DEAL_EXPIRED |
| `supplier.verification` | MATERIAL_VERIFIED, MATERIAL_FLAGGED |

**Consumed**:

| Topic | Events | Action |
|---|---|---|
| `project.lifecycle` | PROJECT_CREATED | Suggest nearby suppliers matching project region |
| `payment.transaction` | PAYMENT_RELEASED | Update order status to PAID |

### 8.12 Bulk Discount Tiers

Discount is automatically applied based on order quantity per item.

| Tier | Min Quantity | Discount |
|---|---|---|
| Tier 1 | 500+ units | 12% |
| Tier 2 | 100+ units | 8% |
| Tier 3 | 50+ units | 5% |
| Tier 4 | 10+ units | 3% |
| Tier 5 | <10 units | 0% |

Tiers are configurable via `supplier_discount_tiers` table. Tier selection uses highest matching tier (`find` descending order).

### 8.13 Definition of Done (Sprint 5)

- [ ] `GET /api/v1/supplier/catalog` returns filtered, paginated items with CWICR prices
- [ ] `POST /api/v1/supplier/catalog` creates item with event emission
- [ ] `POST /api/v1/supplier/catalog/refresh-prices` triggers CWICR bulk refresh
- [ ] Catalog search supports full-text + pgvector hybrid search with filters
- [ ] `POST /api/v1/supplier/orders` creates order + escrow hold + emits `ORDER_PLACED`
- [ ] Order state machine correctly transitions PENDING → CONFIRMED → SHIPPED → DELIVERED
- [ ] Escrow auto-releases on DELIVERED; platform fee (3.5%) deducted
- [ ] Return/refund flow: 90% refund minus 10% restocking fee
- [ ] `POST /api/v1/supplier/materials/verify` scans QR and cross-references CWICR
- [ ] QrScanner component: camera, torch, result sheet with GENUINE/COUNTERFEIT/UNKNOWN
- [ ] MaterialCard shows gradient placeholder, price (monospace Deep Cobalt), stock badge
- [ ] CatalogGrid: responsive 1/2/3-column layout with staggered entrance animation
- [ ] FilterPanel: search (debounced 300ms), category pills with Lucide icons, dropdowns
- [ ] CartSlideout: slide-in panel, quantity controls, total, "Place Bulk Order"
- [ ] OrderTimeline: vertical stages with color-coded dots and status labels
- [ ] DeliveryMap: Leaflet map, vehicle marker, ping trail, ETA banner
- [ ] FlashDealsBar: horizontal scroll, discount pill, countdown timer, "Claim Deal"
- [ ] Bulk discount tiers applied on order placement
- [ ] All monetary values stored as integer cents — zero float in supplier code
- [ ] All events emitted via Kafka before state projection updates
- [ ] Offline queue: cart persisted to IndexedDB, orders queued with `PENDING_SYNC`
- [ ] RLS enforced: suppliers manage own catalog, buyers read published items
- [ ] All text localized via `i18n.t("supplier.*")` with English/Shona toggle
- [ ] Dark mode supported across all supplier components
- [ ] TypeScript: zero errors. ESLint: zero warnings. Unit tests: passing.

### 8.14 Anti-Patterns Specific to Supplier Marketplace

| ID | Prohibition | Enforcement |
|---|---|---|
| AP-SUP-01 | Never store monetary values as float | ESLint `no-float-currency` rule; CI rejection on `*PriceCents`, `*AmountCents` |
| AP-SUP-02 | Never deliver without escrow confirmation | EscrowController checks `status === 'HELD'` before order confirmation |
| AP-SUP-03 | Never release payment without delivery GPS | DeliveryController requires `deliveryLatitude` + `deliveryLongitude` or buyer confirmation |
| AP-SUP-04 | Never skip CWICR cross-reference on catalog add | CatalogController validates `baselineCwicrCode` against CWICR registry |
| AP-SUP-05 | Never allow flash deal oversell | Atomic Redis DECR + PostgreSQL CHECK `claimed_quantity <= max_quantity` |
| AP-SUP-06 | Never expose competing RFQ quotes to suppliers | API serializers return only own quote; RFQ creator sees all |
| AP-SUP-07 | Never bypass QR verification for material acceptance | `MaterialVerification` required before payment release for verified items |
| AP-SUP-08 | Never cache CWICR prices longer than 1 hour | Redis `cwicr:{code}` TTL = 3600s; stale indicator shown on frontend |
| AP-SUP-09 | Never allow offline order finalization | Escrow creation requires server; offline orders queued as `PENDING_SYNC` |
| AP-SUP-10 | Never hardcode bulk discount tiers | Tiers stored in `supplier_discount_tiers` table; configurable per supplier |

---

## ARTICLE IX: COMMAND CENTER MODULE — Central Nervous System for Project Oversight

The Command Center module is the central nervous system of Dzenhare OS. It powers real-time oversight across all active projects, revenue tracking, dispute resolution, analytics, and AI-driven budget variance insights. Every dashboard interaction, map click, dispute action, analytics export, and AI insight generation is event-sourced. No metric updates without event projection. No dispute resolution without audit trail.

### 9.1 Module Topology

```
Layer 0 (Client):
  └─ CommandCenter Page (React) — Bento grid dashboard + tabs
      ├─ BentoDashboard (responsive 4/2/1-col card grid)
      │   ├─ ActiveProjectsCard (metric + sparkline + drill-down)
      │   ├─ RevenueCard (total + MoM trend + currency badge)
      │   ├─ BudgetHealthCard (composite score + at-risk count)
      │   ├─ ProjectPipelineChart (stacked bar, click drill-down)
      │   ├─ RevenueTrendChart (12mo line + forecast)
      │   └─ RegionalBreakdown (horizontal bar, click → map filter)
      ├─ ProjectMap (MapLibre GL JS, PostGIS vector tiles)
      │   ├─ ProjectPins (color-coded by status, supercluster)
      │   ├─ FilterPanel (status pills, region, date range)
      │   ├─ PinPopup (name, status, budget health, CTA)
      │   └─ LegendCard (collapsible status color guide)
      ├─ AnalyticsPanel (Metabase/Superset embedded iframes)
      │   ├─ MetabaseFrame (JWT-signed iframe, dashboard picker)
      │   ├─ SupersetFrame (guest token iframe, ad-hoc charts)
      │   └─ CustomChartBuilder (metric + chart type selector)
      ├─ DisputeBoard (table + detail panel + Jitsi video)
      │   ├─ DisputeList (filterable, paginated, sortable)
      │   ├─ DisputeDetailPanel (timeline, participants, evidence)
      │   └─ JitsiMeetView (JWT-authenticated WebRTC video room)
      └─ AiInsightPanel (feed + variance explorer + timeline)
          ├─ InsightCard[] (severity badge, detail, action CTA)
          ├─ VarianceExplorer (project → milestone → category drill)
          └─ AnomalyTimeline (scatter chart of flagged events)

Layer 2 (Microservice):
  └─ @dzenhare/command-center (Express/Fastify)
      ├─ DashboardController — metrics, pipeline, revenue trend, regional
      ├─ MapController — project GeoJSON, clusters, province boundaries
      ├─ AnalyticsController — Metabase JWT, Superset guest token, exports
      ├─ DisputeController — CRUD, escalate, resolve, evidence, Jitsi token
      ├─ InsightController — feed, variance explorer, anomaly timeline
      └─ EventService — EventStoreDB append, Kafka produce/consume

Layer 4 (Data):
  ├─ dispute_logs (PostgreSQL — full dispute lifecycle with event sourcing)
  ├─ dispute_evidence (PostgreSQL — evidence documents linked to disputes)
  ├─ insight_logs (PostgreSQL — AI-generated insights with severity)
  ├─ analytics_exports (PostgreSQL — export request tracking)
  ├─ jitsi_room_sessions (PostgreSQL — video meeting audit trail)
  ├─ dashboard_bookmarks (PostgreSQL — user dashboard preferences)
  ├─ analytics_funnel (PostgreSQL — feature usage event tracking)
  ├─ dashboard_metrics (PostgreSQL materialized view — aggregate KPIs)
  ├─ EventStoreDB (immutable command_events stream)
  ├─ Redis (dashboard cache TTL 60s, insight cache TTL 300s, JWT cache)
  └─ Kafka topics: command.dispute, command.insight, command.analytics (produced)
     Kafka topics: project.lifecycle, milestone.status, budget.change, payment.transaction,
     contractor.lifecycle, bid.activity, supplier.order (consumed)
```

### 9.2 Event-Sourced Command Engine

Every dashboard interaction, map query, dispute action, and insight generation MUST append an immutable event to the `command_events` stream BEFORE the response is delivered to the client.

**Command Event Types**:

| Event Type | Payload | Trigger |
|---|---|---|
| `DASHBOARD_VIEWED` | `{ userId, dateRange }` | User opens dashboard |
| `DRILL_DOWN_REQUESTED` | `{ userId, metric, context }` | User clicks chart |
| `MAP_VIEWED` | `{ userId, bounds, zoom, filters }` | User opens/pan map |
| `PIN_CLICKED` | `{ userId, projectId, zoom }` | User clicks project pin |
| `DISPUTE_OPENED` | `{ disputeId, projectId, reason, tier, participants }` | New dispute created |
| `DISPUTE_ESCALATED` | `{ disputeId, fromTier, toTier, escalatedBy }` | Dispute tier escalated |
| `DISPUTE_RESOLVED` | `{ disputeId, outcome, penaltyCents, resolution }` | Dispute closed |
| `DISPUTE_EVIDENCE_UPLOADED` | `{ disputeId, fileType, uploadedBy }` | Evidence attached |
| `JITSI_ROOM_CREATED` | `{ disputeId, roomName, startedBy }` | Video room initialized |
| `JITSI_SESSION_ENDED` | `{ disputeId, duration, participantCount }` | Video session ended |
| `ANALYTICS_DASHBOARD_VIEWED` | `{ userId, dashboardType, dashboardId }` | Embedded analytics loaded |
| `ANALYTICS_EXPORT_REQUESTED` | `{ userId, format, dashboardId }` | Export requested |
| `BUDGET_VARIANCE_DETECTED` | `{ projectId, variancePct, severity, details }` | Threshold exceeded |
| `ANOMALY_FLAGGED` | `{ projectId, anomalyType, score, factors[] }` | Anomaly classified |
| `RECOMMENDATION_GENERATED` | `{ projectId, recommendationType, cta }` | Recommendation produced |
| `INSIGHT_DISMISSED` | `{ insightId, userId, feedback }` | User dismisses insight |

**Delivery Order**:
1. User action triggers event (e.g., `DISPUTE_OPENED`)
2. `EventService.append()` persists event to EventStoreDB stream `command-{disputeId}`
3. PostgreSQL projection updated asynchronously
4. Kafka event produced to `command.dispute` topic
5. Client receives confirmation via REST response or WebSocket push

**Prohibition**: No state projection may update before the corresponding event is persisted. Violation is a constitutional breach (AP-005 applies).

### 9.3 Dashboard Metrics Engine

The dashboard aggregates cross-service data into a single materialized view for sub-100ms reads.

**Materialized View** (`dashboard_metrics`):
```sql
CREATE MATERIALIZED VIEW dashboard_metrics AS
SELECT
  COUNT(*) FILTER (WHERE p.status = 'ACTIVE') AS active_project_count,
  COALESCE(SUM(ea.total_funded_cents) FILTER (WHERE p.status = 'ACTIVE'), 0) AS total_revenue_cents,
  COUNT(*) FILTER (WHERE p.status = 'ACTIVE' AND (
    COALESCE((SELECT COUNT(*) FROM vault_events ve WHERE ve.aggregate_id = p.id::text AND ve.event_type IN ('BUDGET_MODIFIED', 'BUDGET_LOCKED')), 0) > 0
    -- Variance >15% check via event payload
  )) AS at_risk_project_count,
  COUNT(*) FILTER (WHERE dl.status = 'OPEN') AS open_dispute_count,
  COUNT(*) FILTER (WHERE p.status = 'COMPLETED' AND p.updated_at > NOW() - INTERVAL '30 days') AS completed_this_month,
  COUNT(*) FILTER (WHERE p.status = 'DRAFT') AS draft_project_count,
  COUNT(*) FILTER (WHERE p.status = 'PAUSED') AS paused_project_count
FROM projects p
LEFT JOIN escrow_accounts ea ON ea.project_id = p.id
LEFT JOIN dispute_logs dl ON dl.project_id = p.id;
```

**Refresh Policy**:
- Refresh on event: Trigger on `project.lifecycle`, `budget.change`, `payment.transaction` events
- Scheduled: Every 5 minutes via cron as fallback
- Manual: `POST /api/v1/command/dashboard/refresh`

**Caching**:
- Redis key: `command:dashboard:{userId}:{dateRange}`
- TTL: 60s (realtime metrics), 300s (historical trend data)
- Cache invalidation: On relevant Kafka event, delete cache key for affected user scope

**API**:
```typescript
// GET /api/v1/command/dashboard/metrics
interface DashboardMetricsResponse {
  activeProjectCount: number;
  totalRevenueCents: bigint;
  budgetHealthScore: number;         // 0-100 composite
  atRiskProjectCount: number;
  openDisputeCount: number;
  completedThisMonth: number;
  lastRefreshedAt: string;
}

// GET /api/v1/command/dashboard/pipeline
interface PipelineResponse {
  draft: number;
  active: number;
  paused: number;
  completed: number;
}

// GET /api/v1/command/dashboard/revenue-trend?months=12
interface RevenueTrendResponse {
  data: Array<{ month: string; revenueCents: bigint; forecast?: bigint }>;
}

// GET /api/v1/command/dashboard/regional
interface RegionalResponse {
  data: Array<{ region: string; revenueCents: bigint; projectCount: number }>;
}
```

### 9.4 GIS Map Service

All project location data is served via PostGIS with vector tile optimization.

**PostGIS Setup**:
```sql
-- Enable PostGIS extension (if not already)
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Add geometry column to projects
SELECT AddGeometryColumn('projects', 'location_geom', 4326, 'POINT', 2);

-- Create spatial index
CREATE INDEX idx_projects_location ON projects USING GIST (location_geom);

-- Province boundaries table
CREATE TABLE sadc_provinces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country TEXT NOT NULL,
  province_name TEXT NOT NULL,
  geom GEOMETRY(MULTIPOLYGON, 4326) NOT NULL
);
CREATE INDEX idx_sadc_provinces_geom ON sadc_provinces USING GIST (geom);
```

**Vector Tile Configuration** (Martin sidecar):
```yaml
# martin-config.yaml
postgres:
  connection_string: postgresql://dzenhare:pass@localhost:5432/dzenhare
  tables:
    project_locations:
      schema: public
      table: projects
      geometry_column: location_geom
      id_column: id
      properties:
        - id
        - title
        - status
        - budget_health
        - region
    sadc_provinces:
      schema: public
      table: sadc_provinces
      geometry_column: geom
      id_column: id
      properties:
        - country
        - province_name
```

**Map API**:
```typescript
// GET /api/v1/command/map/projects?status=ACTIVE&region=Harare
interface MapProjectsQuery {
  status?: string;        // Comma-separated: ACTIVE,PAUSED,COMPLETED
  region?: string;        // Province or country filter
  bounds?: string;        // SW-lat,SW-lng,NE-lat,NE-lng for viewport filter
  limit?: number;         // Max 500 unclustered pins
}
interface MapProjectsResponse {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: { type: 'Point'; coordinates: [number, number] };
    properties: {
      id: string;
      title: string;
      status: string;
      budgetHealth: number;    // 0-100, or null if no budget
      region: string;
      lastUpdated: string;
    };
  }>;
}

// GET /api/v1/command/map/clusters?zoom=8&bounds=...
// Returns supercluster-compatible GeoJSON with count per cluster

// GET /api/v1/command/map/provinces
// Returns GeoJSON FeatureCollection of SADC province boundaries with aggregate stats
```

**Pin Color Mapping**:
| Status | Hex | Glow |
|---|---|---|
| `ACTIVE` | `#d4a574` | Warm Sand |
| `COMPLETED` | `#38a169` | Emerald |
| `PAUSED` | `#d69e2e` | Amber |
| `DISPUTED` | `#e53e3e` | Crimson (pulsing) |
| `DRAFT` | `#a0aec0` | Neutral |

### 9.5 Analytics Integration

Command Center embeds Metabase and Apache Superset dashboards for ad-hoc analytics and reporting.

**Metabase Embedding**:
```typescript
// POST /api/v1/command/analytics/metabase-token
interface MetabaseTokenRequest {
  dashboardId: number;
  projectId?: string;       // Optional: scope to specific project
  theme?: 'light' | 'dark';
}

interface MetabaseTokenResponse {
  iframeUrl: string;        // Signed embed URL
  expiresAt: string;        // 10 minutes from issue
}

// Token generation
const payload = {
  resource: { dashboard: dashboardId },
  params: projectId ? { project_id: projectId } : {},
  exp: Math.floor(Date.now() / 1000) + 600,
};
const token = jwt.sign(payload, METABASE_JWT_SECRET, { algorithm: 'HS256' });
```

**Superset Embedding**:
```typescript
// POST /api/v1/command/analytics/superset-guest-token
interface SupersetGuestTokenRequest {
  dashboardId: string;
  rls?: Record<string, any>;  // Row-level security filters
}

interface SupersetGuestTokenResponse {
  guestToken: string;
  dashboardUrl: string;
  expiresAt: string;          // 24 hours default
}

// Token generation via Superset REST API
// POST /api/v1/security/guest_token/
// Body: { "user": { "username": "dzenhare_guest" }, "resources": [{ "type": "dashboard", "id": dashboardId }], "rls_rules": [...] }
```

**Pre-built Dashboards**:
| Dashboard | Platform | Purpose | Metrics |
|---|---|---|---|
| Executive Summary | Metabase | C-suite overview | Active projects, revenue, budget health, disputes |
| Project Pipeline | Metabase | Project lifecycle tracking | Status distribution, conversion funnel, avg duration |
| Revenue Tracking | Metabase | Financial performance | Monthly revenue, MoM growth, regional breakdown |
| Regional Breakdown | Superset | Geographic analysis | Revenue by province, project density, budget health by region |
| Budget Variance Explorer | Superset | Deep financial analysis | Variance by project/category, trend, change order impact |
| Contractor Performance | Superset | Execution quality | P4P scores, on-time delivery, dispute rate by contractor |

**Prohibition (AP-CMD-01)**: No analytics embed token may expose cross-tenant data. All tokens MUST be scoped via RLS parameters to the requesting user's organization.

### 9.6 Dispute Resolution & Jitsi Integration

Disputes follow a 3-tier escalation with video mediation via Jitsi Meet.

**3-Tier Escalation**:
1. **Negotiation** (Tier 1, 72h window): In-app chat + shared evidence viewer. Jitsi session optional.
2. **Mediation** (Tier 2, 48h window): Assigned platform mediator. Jitsi session required.
3. **Arbitration** (Tier 3, binding): Final decision by Dzenhare arbitration panel. Jitsi session recorded.

**Dispute State Machine**:
```
OPEN (tier=NEGOTIATION) → ESCALATED (tier=MEDIATION) → ESCALATED (tier=ARBITRATION) → RESOLVED
  ↓                         ↓                            ↓
RESOLVED                  RESOLVED                     RESOLVED
  ↓                         ↓                            ↓
WITHDRAWN                 WITHDRAWN                    WITHDRAWN
```

**Jitsi Integration**:
```typescript
// POST /api/v1/command/disputes/{id}/jitsi-token
interface JitsiTokenRequest {
  userId: string;
  userName: string;
  userEmail: string;
  isModerator?: boolean;       // Dispute opener = moderator
}
interface JitsiTokenResponse {
  jwt: string;                 // HS256 JWT for Jitsi authentication
  roomName: string;            // dispute-{disputeId}
  jitsiUrl: string;            // Self-hosted Jitsi Meet URL
  expiresAt: string;           // 2 hours
}

// JWT payload
const jitsiPayload = {
  context: {
    user: { id: userId, name: userName, email: userEmail, moderator: isModerator || false },
  },
  room: `dispute-${disputeId}`,
  exp: Math.floor(Date.now() / 1000) + 7200,
  aud: 'jitsi',
  iss: 'dzenhare-command-center',
};
const jitsiToken = jwt.sign(jitsiPayload, JITSI_APP_SECRET, { algorithm: 'HS256' });
```

**Dispute API**:
```typescript
// POST /api/v1/command/disputes
interface CreateDisputeRequest {
  projectId: string;
  milestoneId?: string;
  reason: 'QUALITY' | 'SCHEDULE' | 'BUDGET' | 'SCOPE' | 'SAFETY' | 'OTHER';
  description: string;
  evidenceUrls?: string[];
  participants: string[];
}
interface CreateDisputeResponse {
  disputeId: string;
  status: 'OPEN';
  tier: 'NEGOTIATION';
  eventId: string;
  createdAt: string;
}

// PUT /api/v1/command/disputes/:id/escalate
interface EscalateResponse {
  disputeId: string;
  previousTier: string;
  newTier: string;
  eventId: string;
}

// PUT /api/v1/command/disputes/:id/resolve
interface ResolveDisputeRequest {
  outcome: 'RESOLVED' | 'WITHDRAWN' | 'ARBITRATION_BINDING';
  resolutionNotes: string;
  penaltyCents?: number;
}
interface ResolveDisputeResponse {
  disputeId: string;
  outcome: string;
  eventId: string;
  resolvedAt: string;
}

// POST /api/v1/command/disputes/:id/evidence
// Multipart upload → S3 signed URL → dispute_evidence record

// GET /api/v1/command/disputes?status=OPEN&tier=NEGOTIATION&projectId=...
interface DisputeListItem {
  id: string;
  projectId: string;
  projectTitle: string;
  reason: string;
  tier: string;
  status: string;
  participantCount: number;
  openedAt: string;
  daysOpen: number;
}

// GET /api/v1/command/disputes/:id
interface DisputeDetailResponse {
  id: string;
  projectId: string;
  milestoneId: string | null;
  reason: string;
  description: string;
  tier: string;
  status: string;
  participants: Array<{ id: string; name: string; role: string }>;
  evidence: Array<{ id: string; fileUrl: string; fileType: string; uploadedBy: string; uploadedAt: string }>;
  timeline: Array<{ eventType: string; payload: any; occurredAt: string }>;
  outcome: string | null;
  resolutionNotes: string | null;
  penaltyCents: number | null;
  openedAt: string;
  escalatedAt: string | null;
  resolvedAt: string | null;
  jitsiSessions: Array<{ roomName: string; startedAt: string; endedAt: string | null; participantCount: number }>;
}
```

### 9.7 AI Insights Engine

The AI Insights engine monitors cross-service events and produces actionable intelligence for project health.

**Variance Detection** (Budget):
- Triggered by: `budget.change` events
- Thresholds:
  - `≤5%` variance → `ON_TRACK` (no event)
  - `>5% ≤15%` → `AT_RISK` (produces `WARNING` insight)
  - `>15%` → `CRITICAL` (produces `CRITICAL` insight)
- Output: `BUDGET_VARIANCE_DETECTED` event with affected milestone, category, and severity

**Anomaly Classification** (Hourly job):
- Input features per project: burn rate, milestone delay, change order count, dispute count, P4P trend
- Rule-based triggers:
  - High burn + low progress → "Front-loaded spending with lagging milestones"
  - >2 change orders in 30 days → "Scope creep detected"
  - Active dispute + budget variance → "Dispute may be driving cost overruns"
  - Low P4P contractor + repeated delays → "Contractor performance impacting schedule"
- Output: `ANOMALY_FLAGGED` event with anomaly type and contributing factors

**Recommendation Engine** (Rule-based):
| Condition | Recommendation | CTA |
|---|---|---|
| Variance > 15% | "Consider change order to adjust budget allocation" | Open Change Order |
| Contingency > 50% used | "Contingency running low — review remaining scope" | View Budget |
| Dispute open > 7 days | "Schedule mediation session to resolve pending dispute" | Schedule Mediation |
| Milestone delay > 14 days | "Penalty assessment triggered — review contractor P4P" | View Penalties |
| Multiple projects delayed | "Resource rebalancing recommended" | View Contractors |

**AI Insights API**:
```typescript
// GET /api/v1/command/insights?severity=CRITICAL,WARNING&projectId=...
interface InsightFeedResponse {
  insights: Array<{
    id: string;
    type: 'BUDGET_VARIANCE' | 'ANOMALY' | 'RECOMMENDATION';
    severity: 'CRITICAL' | 'WARNING' | 'INFO';
    title: string;
    summary: Record<string, any>;  // Type-specific detail payload
    confidence: number | null;     // 0-1, null for rule-based
    actionCta: string | null;
    actionUrl: string | null;
    dismissed: boolean;
    createdAt: string;
  }>;
  total: number;
  unreadCount: number;
}

// GET /api/v1/command/insights/variance/:projectId
interface VarianceExplorerResponse {
  projectId: string;
  projectName: string;
  totalBudgetCents: bigint;
  totalSpentCents: bigint;
  overallVariancePct: number;
  milestones: Array<{
    id: string;
    name: string;
    budgetCents: bigint;
    spentCents: bigint;
    variancePct: number;
    severity: 'ON_TRACK' | 'AT_RISK' | 'CRITICAL';
    categories: Array<{
      category: string;
      budgetCents: bigint;
      spentCents: bigint;
      variancePct: number;
    }>;
  }>;
}

// GET /api/v1/command/insights/anomalies?days=30
interface AnomalyTimelineResponse {
  anomalies: Array<{
    id: string;
    projectId: string;
    projectName: string;
    anomalyType: string;
    score: number;
    factors: string[];
    detectedAt: string;
  }>;
}

// POST /api/v1/command/insights/:id/dismiss
interface DismissInsightRequest {
  feedback?: 'HELPFUL' | 'NOT_RELEVANT' | 'FALSE_POSITIVE';
}
```

**Prohibition (AP-CMD-02)**: No AI insight may be delivered to the client before the corresponding event is persisted to EventStoreDB. Violation is a constitutional breach.

### 9.8 Bento Grid Dashboard Components

The dashboard uses a responsive bento grid layout — 4 columns desktop, 2 columns tablet, 1 column mobile.

**BentoCard Specification**:
```typescript
interface BentoCard {
  colSpan: 1 | 2 | 3;         // How many grid columns the card spans
  rowSpan: 1 | 2;              // How many grid rows the card spans
  children: ReactNode;
  variant: 'metric' | 'chart' | 'list' | 'timeline';
  loading?: boolean;
  error?: string;
  empty?: boolean;
  onDrillDown?: (context: DrillDownContext) => void;
}
```

**Card Inventory**:

| Card | ColSpan | RowSpan | Type | Data Source |
|---|---|---|---|---|
| ActiveProjectsCard | 2 | 1 | Metric + sparkline | `GET /dashboard/metrics` |
| RevenueCard | 1 | 1 | Metric | `GET /dashboard/metrics` |
| BudgetHealthCard | 1 | 1 | Metric (gauge) | `GET /dashboard/metrics` |
| DisputeCountCard | 1 | 1 | Metric | `GET /dashboard/metrics` |
| ProjectPipelineChart | 3 | 1 | Chart (stacked bar) | `GET /dashboard/pipeline` |
| RevenueTrendChart | 2 | 2 | Chart (line + forecast) | `GET /dashboard/revenue-trend` |
| RegionalBreakdown | 2 | 1 | Chart (horizontal bar) | `GET /dashboard/regional` |
| TopProjectsCard | 2 | 1 | List | `GET /dashboard/active-projects` |
| DisputeActivityTimeline | 1 | 2 | Timeline | `GET /disputes?status=OPEN&limit=5` |

**Drill-Down Protocol**:
1. Click chart → emit `DRILL_DOWN_REQUESTED` event → open drill-down panel
2. Panel shows breadcrumb: "Command Center / Projects / Active"
3. Context filters adjacent cards: clicking a bar in ProjectPipelineChart auto-filters other cards to that status
4. Breadcrumb click → drill-up to parent context
5. Animation: slide-up panel, 200ms ease-out

### 9.9 SADC Map Integration

The project map must cover Zimbabwe and SADC region with responsive clustering.

**Map Configuration**:
- Engine: MapLibre GL JS v4+ (open-source, offline-capable)
- Tiles: Martin PostGIS vector tile server (self-hosted sidecar)
- Basemap: CartoDB dark-matter (dark mode) / positron (light mode)
- Bounds: `[8, -35, 42, -15]` (SADC region)
- Default center: `[30.0, -19.0]` (Zimbabwe centroid)
- Default zoom: 6

**Province Boundaries**:
- Static GeoJSON: `sadc_provinces.geojson` (bundled ~1.2MB, zstandard compressed)
- Dynamic tiles: Martin serves MVT tiles from `sadc_provinces` table
- Style: 30% opacity fill (country color), 60% opacity stroke

**Pin Clustering**:
- Library: `supercluster` (in-browser clustering)
- Configuration:
  - radius: 60px
  - maxZoom: 14
  - Min points per cluster: 2
  - Cluster colors: Warm Sand `#d4a574` at 60% opacity
- At zoom >= 12: show individual pins with status colors

### 9.10 Kafka Integration

**Consumed Topics**:

| Topic | Events | Consumer Action |
|---|---|---|
| `project.lifecycle` | PROJECT_CREATED, UPDATED, COMPLETED | Refresh dashboard metrics, update project locations |
| `milestone.status` | MILESTONE_APPROVED, REJECTED | Recompute budget health, trigger variance check |
| `budget.change` | BUDGET_INITIALIZED, LOCKED, MODIFIED, CONTINGENCY_USED | Refresh metrics, trigger variance detection |
| `payment.transaction` | PAYMENT_RELEASED | Update revenue metrics |
| `contractor.lifecycle` | CONTRACTOR_PROFILE_CREATED | Update contractor count metric |
| `bid.activity` | BID_SUBMITTED, ACCEPTED | Update active bid count |
| `supplier.order` | ORDER_PLACED, DELIVERED | Update supply chain metrics |

**Produced Topics**:

| Topic | Events | Consumers |
|---|---|---|
| `command.dispute` | DISPUTE_OPENED, DISPUTE_ESCALATED, DISPUTE_RESOLVED | Notification, Analytics |
| `command.insight` | BUDGET_VARIANCE_DETECTED, ANOMALY_FLAGGED, RECOMMENDATION_GENERATED | Notification, AI Studio |
| `command.analytics` | EXPORT_REQUESTED, DASHBOARD_CUSTOMIZED | Analytics, Audit |

### 9.11 Frontend Component Architecture

```
pages/
  CommandCenter.tsx
    ├─ Header (Crown icon, title, date range selector, sync status)
    ├─ TabBar (Dashboard | Map | Analytics | Disputes | AI Insights)
    ├─ [if Dashboard]
    │   └─ BentoDashboard
    │       ├─ BentoGrid (responsive: grid-cols-4 lg:grid-cols-2 sm:grid-cols-1)
    │       │   ├─ ActiveProjectsCard (2×1) — count + sparkline + drill-down list
    │       │   ├─ RevenueCard (1×1) — amount + MoM change + currency badge
    │       │   ├─ BudgetHealthCard (1×1) — circular gauge + score + at-risk count
    │       │   ├─ DisputeCountCard (1×1) — count + open/escalated split
    │       │   ├─ ProjectPipelineChart (3×1) — stacked bar chart + click drill-down
    │       │   ├─ RevenueTrendChart (2×2) — line chart + forecast dash
    │       │   ├─ RegionalBreakdown (2×1) — horizontal bar + click → map filter
    │       │   ├─ TopProjectsCard (2×1) — top 5 by budget + status badges
    │       │   └─ DisputeActivityTimeline (1×2) — vertical event feed
    │       └─ [modal] DrillDownPanel (slide-up, breadcrumb, filtered data view)
    ├─ [if Map]
    │   └─ ProjectMap
    │       ├─ MapLibreMap (MapLibre GL JS v4, Martin tiles)
    │       ├─ FilterPanel (status pills, region dropdown, date range selector)
    │       ├─ LegendCard (collapsible, bottom-right)
    │       └─ [popup] PinPopup (project detail card + CTA)
    ├─ [if Analytics]
    │   └─ AnalyticsPanel
    │       ├─ TabBar (Metabase | Superset | Custom)
    │       ├─ DashboardSelector (dropdown, from dashboard_bookmarks)
    │       ├─ [if Metabase] MetabaseFrame (JWT-signed iframe)
    │       ├─ [if Superset] SupersetFrame (guest token iframe)
    │       └─ [if Custom] CustomChartBuilder (metric picker + chart type)
    ├─ [if Disputes]
    │   └─ DisputeBoard
    │       ├─ Header ("New Dispute" button, filter bar)
    │       ├─ DisputeList (table: status dot, project, reason, tier, date, actions)
    │       ├─ [slide-out] DisputeDetailPanel
    │       │   ├─ Header (status badge, tier badge, ID)
    │       │   ├─ Timeline (vertical event feed, timestamps)
    │       │   ├─ Participants (avatars + roles)
    │       │   ├─ Evidence (document thumbnails, download)
    │       │   └─ Actions (Escalate, Resolve, Start Video)
    │       └─ [full] JitsiMeetView (JitsiMeetComponent, JWT auth)
    │           ├─ VideoGrid (WebRTC tiles)
    │           ├─ ChatPanel (side panel, messages)
    │           └─ EvidenceViewer (screen share + document overlay)
    └─ [if AI Insights]
        └─ AiInsightPanel
            ├─ FilterBar (severity pills, project search, date range)
            ├─ InsightFeed (scrollable card list)
            │   └─ InsightCard (severity badge, title, expand detail, CTA, dismiss)
            ├─ [tab] VarianceExplorer
            │   └─ DrillDownTree (project → milestone → category, progress bars)
            └─ [tab] AnomalyTimeline
                └─ ScatterChart (anomaly events over time, type colored)
```

### 9.12 Definition of Done (Sprint 6)

- [ ] `GET /api/v1/command/dashboard/metrics` returns aggregated project, revenue, budget health, dispute metrics
- [ ] `GET /api/v1/command/dashboard/pipeline` returns project status distribution
- [ ] `GET /api/v1/command/dashboard/revenue-trend` returns 12-month revenue with forecast
- [ ] `GET /api/v1/command/dashboard/regional` returns province-level revenue breakdown
- [ ] `GET /api/v1/command/map/projects` returns GeoJSON FeatureCollection with color-coded pins
- [ ] `GET /api/v1/command/map/clusters` returns supercluster-compatible clustered pins
- [ ] `POST /api/v1/command/analytics/metabase-token` returns signed JWT embed URL
- [ ] `POST /api/v1/command/analytics/superset-guest-token` returns guest token
- [ ] `POST /api/v1/command/disputes` creates dispute with event emission and projection update
- [ ] `PUT /api/v1/command/disputes/:id/escalate` transitions NEGOTIATION→MEDIATION→ARBITRATION
- [ ] `PUT /api/v1/command/disputes/:id/resolve` closes dispute with outcome and optional penalty
- [ ] `POST /api/v1/command/disputes/:id/jitsi-token` returns JWT for Jitsi room auth
- [ ] `POST /api/v1/command/disputes/:id/evidence` uploads file to S3 with event emission
- [ ] `GET /api/v1/command/insights` returns paginated, filtered insight feed
- [ ] `GET /api/v1/command/insights/variance/:projectId` returns milestone/category drill-down
- [ ] `GET /api/v1/command/insights/anomalies` returns anomaly timeline
- [ ] Budget variance detection: budget.change event with >15% variance → BUDGET_VARIANCE_DETECTED
- [ ] Anomaly classifier runs hourly and flags anomalous project patterns
- [ ] Recommendation engine produces actionable suggestions with CTAs
- [ ] BentoDashboard renders responsive 4/2/1-column grid with all card types
- [ ] Drill-down: clicking chart opens modal with breadcrumb and shared context filtering
- [ ] ProjectMap renders MapLibre GL JS with PostGIS vector tiles and pin clustering
- [ ] PinPopup shows project name, status badge, budget health, and "Open Project" CTA
- [ ] Map filter panel supports status pills, region dropdown, and date range
- [ ] DisputeBoard shows filterable, paginated dispute list with status indicators
- [ ] DisputeDetailPanel shows timeline, participants, evidence, and escalation/resolution actions
- [ ] JitsiMeetView embeds Jitsi Meet with JWT authentication, chat, and evidence viewer
- [ ] AnalyticsPanel embeds Metabase and Superset iframes with dynamic token generation
- [ ] AiInsightPanel shows insight feed with severity badges, expandable detail, and action CTAs
- [ ] VarianceExplorer provides tree drill-down: project → milestone → category
- [ ] All state changes append event to EventStoreDB before projection updates or client delivery
- [ ] Offline: dashboard cached to IndexedDB, dispute actions queued, sync on reconnect
- [ ] All monetary values stored as integer cents — zero float in command center code
- [ ] RLS enforced: users see own org data; admins see cross-tenant aggregates
- [ ] All text localized via `i18n.t("command.*")` with English and Shona translations
- [ ] Dark mode enforced: all command center components have `dark:` variants with Cobalt Dark bg
- [ ] TypeScript: zero errors. ESLint: zero warnings. Unit tests: passing.

### 9.13 Anti-Patterns Specific to Command Center

| ID | Prohibition | Enforcement |
|---|---|---|
| AP-CMD-01 | Never expose cross-tenant data in analytics embeds | Metabase/Superset tokens scoped via RLS params; token expiry = 10 min |
| AP-CMD-02 | Never deliver AI insight before event persistence | InsightController appends to EventStoreDB before returning response |
| AP-CMD-03 | Never render dashboard from stale cache without indicator | All cached data shows "Last updated" timestamp; stale indicator if > cache TTL |
| AP-CMD-04 | Never bypass event sourcing for dispute actions | DisputeController emits event before each status transition |
| AP-CMD-05 | Never hardcode dashboard card layout | BentoGrid layout configurable via dashboard_bookmarks.config JSONB |
| AP-CMD-06 | Never expose Jitsi rooms without authentication | Jitsi room access requires JWT; token verified by Jitsi Videobridge |
| AP-CMD-07 | Never allow dispute resolution offline | Dispute actions require server; offline queued as PENDING_SYNC |
| AP-CMD-08 | Never skip RLS on dashboard metrics | Materialized view refreshed with user_id context; API applies org filter |
| AP-CMD-09 | Never hardcode Metabase/Superset dashboard IDs | Dashboard references stored in dashboard_bookmarks, user-configurable |
| AP-CMD-10 | Never ignore WebSocket disconnect for realtime metrics | Client shows "Disconnected" indicator; auto-reconnect with backoff; falls back to poll |

---

## ARTICLE X: COMPUTATIONAL DESIGN & BIM PIPELINE MODULE — AI Architect Studio

The Computational Design & BIM Pipeline module is the architectural design engine of Dzenhare OS. It transforms builder sketches into buildable designs through a browser-based 3D parametric editor (`pascalorg/editor`), runs automated structural checks, solar analysis, material estimation, and BOQ generation via 18 integrated Claude computational design skills, and provides lightweight 3D BIM viewing via xeokit. Every design mutation — every wall placement, node connection, and pipeline result — is event-sourced and synced via RxDB for offline-first resilience. No design change updates the scene without an event. No pipeline result is delivered before its event is persisted.

### 10.1 Module Topology

```
Layer 0 (Client):
  └─ DesignStudio Page (React) — Full-viewport 3D canvas + floating tools
      ├─ PascalViewer (wraps @pascal-app/viewer — React Three Fiber 3D editor)
      ├─ FloatingToolsPalette (glassmorphism, left-anchored toolbelt)
      │   ├─ ToolGroup 1: select, wall, slab, roof, column, beam, opening
      │   ├─ ToolGroup 2: move, rotate, scale, align, mirror
      │   ├─ ToolGroup 3: undo, redo, delete, duplicate
      │   └─ PipelineStatus ring (idle/running/passed/warning/critical)
      ├─ PropertiesPanel (right slide-out, selected node editor)
      ├─ PipelinePanel (right slide-out, 4-stage pipeline: structural → solar → materials → BOQ)
      ├─ TopBar (Deep Cobalt, project name, sync status, language toggle, view mode)
      ├─ BottomBar (tool name, cursor coordinates, zoom, renderer badge, pipeline status)
      └─ BimViewerModal (full-screen xeokit viewer for IFC/XKT model review)

  └─ @dzenhare/design-canvas (npm package — Pascal → Dzenhare bridge)
      ├─ DzenSceneBridge  — bidirectional Pascal scene graph ↔ Dzenhare event sync
      ├─ DzenToolRegistry — Dzenhare-specific tools registered in Pascal editor
      ├─ DzenRxDbSync     — RxDB event append on every mutation, flush on reconnect
      └─ DzenPipelineClient — HTTP client to pipeline service endpoints

Layer 2 (Microservice):
  └─ @dzenhare/design-studio (Express/Fastify + TypeScript)
      ├─ SceneController      — CRUD design scenes, node graph management
      ├─ PipelineController   — structural-check, solar-analysis, material-estimate, boq-generate
      ├─ SkillRouter          — routes computation to correct Claude skill runner
      ├─ BimController        — convert-to-ifc, convert-to-xkt, export
      ├─ ComplianceController — zbc-1996-check, sans-10160-check
      └─ EventService         — EventStoreDB append, Kafka produce

Layer 3 (AI/ML):
  └─ @dzenhare/cd-runners (FastAPI + Python 3.11 — Claude Skills calculators)
      ├─ /run/structural-check    — Python: structural_check.py (load paths, deflection, slenderness)
      ├─ /run/solar-analysis      — Python: solar_analysis.py (insolation, panel recommendations)
      ├─ /run/material-estimate   — Python: material_estimation.py (quantities, costs)
      ├─ /run/boq-generate        — Python: BOQ formatter with CWICR pricing
      ├─ /run/compliance-zbc1996  — ZBC 1996 building code compliance (Skills-Architects country-zimbabwe)
      └─ Pyodide WASM bundles     — Offline browser fallback for all 7 calculators

Layer 4 (Data):
  ├─ design_scenes (PostgreSQL — scene metadata, version, node count)
  ├─ design_nodes (PostgreSQL — node graph, positions, properties as JSONB)
  ├─ design_pipeline_logs (PostgreSQL — pipeline execution history, results)
  ├─ EventStoreDB stream design-{projectId} (immutable design event log)
  ├─ RxDB collections (client-side): design_scenes, design_nodes, design_events, design_pipeline_results, design_snapshots
  └─ Kafka topics: design.event, design.pipeline, design.boq
```

### 10.2 Pascal Editor Integration (Constitutional)

The `pascalorg/editor` serves as the core 3D parametric modeling engine. It is integrated via its npm packages:

- **`@pascal-app/core`**: Node type definitions (Zod schemas), scene state store (Zustand), 3D object registry, geometry generation systems
- **`@pascal-app/viewer`**: React Three Fiber Viewer component, node renderers, main Viewer export

**Bridge Protocol** (DzenSceneBridge — mandatory for all design interactions):

```
1. User interacts with Pascal Editor (draw wall, move slab, etc.)
2. Pascal Zustand store updates local scene state
3. DzenSceneBridge intercepts via Zustand subscribe() callback
4. DzenRxDbSync appends DESIGN_NODE_CREATED/MODIFIED/DELETED event to RxDB
5. RxDB event is persisted locally BEFORE SceneController response is returned
6. When online, RxDB flushes events to POST /api/v1/design/scenes/:id/events
7. EventService appends to EventStoreDB stream design-{projectId}
8. Kafka event produced to design.event topic
9. Client receives confirmation via WebSocket or poll
```

**Prohibition (AP-DES-01)**: No scene state update may be reflected in the UI before the corresponding design event is appended to the local RxDB store. Violation is a constitutional breach.

### 10.3 Computational Pipeline — 18 Claude Skills Integration

The 18 skills from `Amanbh997/Claude-skills-for-Computational-Designers` are organized into an automated 4-stage pipeline. Each stage is independently runnable and produces immutable events.

**Stage 1 — Structural Check**:
- Trigger: User clicks "Run Structural Check" in PipelinePanel
- Input: Scene JSON (walls, slabs, columns, beams with positions, dimensions, materials)
- Claude Skills activated: `cd-foundations`, `struct-computation`, `cd-calculator`
- Python calculator: `structural_check.py`
- Output: Load path continuity, beam deflection (SANS 10160), column slenderness ratio, foundation bearing capacity, lateral stability
- Event: `DESIGN_STRUCTURAL_CHECK_COMPLETED` with `{ checks[], passed, summary }`

**Stage 2 — Solar Analysis**:
- Trigger: Auto-runs after structural check passes, or manual trigger
- Input: Scene JSON + location (lat/lng from project data)
- Claude Skills activated: `env-simulation`, `solar-analysis`, `cd-calculator`
- Python calculator: `solar_analysis.py`
- Output: Annual insolation (kWh/m²), optimal panel placement, roof pitch recommendations, shading analysis
- Event: `DESIGN_SOLAR_ANALYSIS_COMPLETED` with `{ insolationKwh, panelRecommendations[], shadingFactors[] }`

**Stage 3 — Material Estimation**:
- Trigger: Auto-runs after solar analysis completes, or manual trigger
- Input: Scene JSON with structural validation results
- Claude Skills activated: `cd-foundations`, `mat-estimate`, `cd-calculator`
- Python calculator: `material_estimation.py`
- Output: Material list (quantities per category: concrete, steel, brick, timber, roofing, finishes), unit costs
- Event: `DESIGN_MATERIAL_ESTIMATE_COMPLETED` with `{ materials[], totalCents, categories{} }`

**Stage 4 — BOQ Generation**:
- Trigger: Auto-runs after material estimation completes, or manual trigger
- Input: Material estimate + CWICR pricing data
- Claude Skills activated: `bim-scripting`, `mat-estimate`, `cd-calculator`
- Python calculator: CWICR pricing formatter
- Output: Complete BOQ with line items, unit prices (in cents), subtotals by category, grand total, contingency
- Event: `DESIGN_BOQ_GENERATED` with `{ boqId, lineItems[], totalCents, currency, generatedAt }`
- Vault Integration: Emitted BOQ auto-populates `budget_lines` in the Vault module

**Pipeline Orchestration**:
```typescript
interface PipelineOrchestrator {
  runFullPipeline(sceneId: string): AsyncGenerator<PipelineStageEvent>;
  runStage(sceneId: string, stage: PipelineStage): Promise<PipelineStageResult>;
  getCachedResult(sceneId: string, stage: PipelineStage): PipelineStageResult | null;
}

type PipelineStage = 'STRUCTURAL_CHECK' | 'SOLAR_ANALYSIS' | 'MATERIAL_ESTIMATE' | 'BOQ_GENERATE';

interface PipelineStageEvent {
  stage: PipelineStage;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  progress?: number;       // 0-100
  result?: PipelineStageResult;
  error?: string;
}
```

**Prohibition (AP-DES-02)**: No pipeline result may be displayed in the PipelinePanel before the corresponding DESIGN_*_COMPLETED event is persisted to EventStoreDB.

### 10.4 BIM Viewer — xeokit Integration

The BIM viewer uses xeokit SDK for lightweight 3D viewing of IFC and XKT models. XKT is xeokit's highly optimized binary format for fast web loading.

**Conversion Pipeline**:
```
Scene JSON (Pascal Editor)
  → IFC STEP file (server-side, @dzenhare/design-studio BimController)
  → XKT binary (xeokit-convert CLI)
  → Loaded in xeokit Viewer (BimViewerModal component)
```

**Viewer Controls** (floating toolbar over Deep Cobalt canvas):
| Control | Action | Icon |
|---|---|---|
| Orbit/Pan/Zoom | Mouse drag / scroll | Default |
| Reset View | Return to initial camera | RotateCw |
| Fullscreen | Toggle full-screen mode | Maximize2 / Minimize2 |
| X-Ray | Toggle transparency on all objects | Eye / EyeOff |
| Section Plane | Interactive clipping plane | Scissors |
| Measure | Click-to-click distance tool | Ruler |
| Tree View | IFC entity tree browser | Layers |
| Properties | Click entity → properties panel | PanelRight |
| Export | Download as XKT/IFC/OBJ | Download |

**BimViewerModal** (full-screen overlay):
```typescript
interface BimViewerModalProps {
  open: boolean;
  onClose: () => void;
  xktUrl?: string;           // URL to pre-converted XKT file
  sceneId?: string;          // Convert current scene on-the-fly
  projectId?: string;
}
```

**Prohibition (AP-DES-03)**: No BIM viewer may render an unvalidated design. The scene must pass Stage 1 (structural check) before conversion to IFC/XKT for viewer display.

### 10.5 RxDB Offline-First Protocol

Every design mutation must pass through RxDB before any other layer is updated.

**RxDB Collections**:

| Collection | Schema | Write Trigger | Sync Strategy |
|---|---|---|---|
| `design_scenes` | `{ id, projectId, name, units, version, createdAt, updatedAt }` | Scene create/rename | Last-write-wins |
| `design_nodes` | `{ id, sceneId, type, properties, position, rotation, parentId }` | Node add/modify/delete | CRDT merge |
| `design_events` | `{ id, eventType, aggregateId, payload, streamVersion, synced, createdAt }` | Every mutation | Append-only (no conflict) |
| `design_pipeline_results` | `{ id, sceneId, stage, result, status, cachedAt }` | Pipeline stage complete | Last-write-wins |
| `design_snapshots` | `{ id, sceneId, label, cameraState, nodeStates, createdAt }` | Manual save | Last-write-wins |

**Sync Protocol**:
```
Online:  Each mutation → RxDB write → immediate POST to /api/v1/design/scenes/:id/events
Offline: Each mutation → RxDB write → queued with synced=false
Reconnect: Flush all unsynced events in chronological order → exponential backoff (1s, 2s, 4s, 8s, max 30s)
Conflict: CRDT merge for nodes (last-write-wins per property path), append-only for events
```

**Prohibition (AP-DES-04)**: No RxDB collection may bypass the event log. Direct writes to `design_nodes` without a corresponding `design_events` entry are prohibited.

### 10.6 Event-Sourced Design Schema

```sql
-- Immutable event log (single source of truth for design)
CREATE TABLE design_scenes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    units VARCHAR(10) DEFAULT 'mm' CHECK (units IN ('mm', 'cm', 'm')),
    version BIGINT DEFAULT 1 NOT NULL,
    node_count INT DEFAULT 0,
    last_pipeline_stage VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Node graph (projection from event stream)
CREATE TABLE design_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scene_id UUID NOT NULL REFERENCES design_scenes(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('wall', 'slab', 'roof', 'column', 'beam', 'opening', 'group', 'floor', 'stair', 'ramp', 'furniture', 'site')),
    properties JSONB NOT NULL DEFAULT '{}',
    position JSONB NOT NULL DEFAULT '{"x":0,"y":0,"z":0}',
    rotation JSONB NOT NULL DEFAULT '{"x":0,"y":0,"z":0}',
    scale JSONB NOT NULL DEFAULT '{"x":1,"y":1,"z":1}',
    parent_id UUID REFERENCES design_nodes(id) ON DELETE SET NULL,
    visible BOOLEAN DEFAULT TRUE NOT NULL,
    locked BOOLEAN DEFAULT FALSE NOT NULL,
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX idx_design_nodes_scene ON design_nodes(scene_id);
CREATE INDEX idx_design_nodes_type ON design_nodes(type);

-- Pipeline execution log
CREATE TABLE design_pipeline_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scene_id UUID NOT NULL REFERENCES design_scenes(id) ON DELETE CASCADE,
    pipeline_type VARCHAR(50) NOT NULL CHECK (pipeline_type IN ('STRUCTURAL_CHECK', 'SOLAR_ANALYSIS', 'MATERIAL_ESTIMATE', 'BOQ_GENERATE', 'COMPLIANCE_CHECK')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED')),
    input_checksum VARCHAR(64),       -- SHA-256 of scene JSON for caching
    input JSONB,
    output JSONB,
    duration_ms INT,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX idx_pipeline_scene ON design_pipeline_logs(scene_id, pipeline_type);

-- Scene snapshots (user save points)
CREATE TABLE design_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scene_id UUID NOT NULL REFERENCES design_scenes(id) ON DELETE CASCADE,
    label VARCHAR(255) NOT NULL,
    camera_state JSONB NOT NULL DEFAULT '{}',
    hidden_node_ids UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);
```

### 10.7 Design Event Types

| Event Type | Payload | Trigger |
|---|---|---|
| `DESIGN_SCENE_CREATED` | `{ sceneId, projectId, name, units }` | New design started |
| `DESIGN_SCENE_UPDATED` | `{ sceneId, name?, description?, units? }` | Scene metadata edited |
| `DESIGN_SCENE_DELETED` | `{ sceneId, reason }` | Scene removed |
| `DESIGN_NODE_CREATED` | `{ nodeId, type, properties, position, rotation, parentId }` | Element added |
| `DESIGN_NODE_MODIFIED` | `{ nodeId, delta: { properties?, position?, rotation?, scale?, parentId?, visible?, locked?, tags? } }` | Element changed |
| `DESIGN_NODE_DELETED` | `{ nodeId, cascade }` | Element removed |
| `DESIGN_NODE_CONNECTED` | `{ sourceId, targetId, connectionType, properties? }` | Nodes connected |
| `DESIGN_NODE_DISCONNECTED` | `{ sourceId, targetId, connectionType }` | Nodes disconnected |
| `DESIGN_SNAPSHOT_TAKEN` | `{ snapshotId, label, cameraState, hiddenNodeIds }` | Checkpoint saved |
| `DESIGN_SNAPSHOT_RESTORED` | `{ snapshotId }` | Checkpoint restored |
| `DESIGN_STRUCTURAL_CHECK_STARTED` | `{ checks[] }` | Pipeline stage 1 started |
| `DESIGN_STRUCTURAL_CHECK_COMPLETED` | `{ checks[], passed, summary }` | Stage 1 done |
| `DESIGN_SOLAR_ANALYSIS_STARTED` | `{ location }` | Pipeline stage 2 started |
| `DESIGN_SOLAR_ANALYSIS_COMPLETED` | `{ insolationKwh, panelRecommendations[], shadingFactors[] }` | Stage 2 done |
| `DESIGN_MATERIAL_ESTIMATE_STARTED` | `{ categories[] }` | Pipeline stage 3 started |
| `DESIGN_MATERIAL_ESTIMATE_COMPLETED` | `{ materials[], totalCents, categories{} }` | Stage 3 done |
| `DESIGN_BOQ_STARTED` | `{ }` | Pipeline stage 4 started |
| `DESIGN_BOQ_GENERATED` | `{ boqId, lineItems[], totalCents, currency, generatedAt }` | Stage 4 done |
| `DESIGN_COMPLIANCE_CHECKED` | `{ code, passed, violations[], summary }` | Building code check |
| `DESIGN_EXPORTED` | `{ format, url, sizeBytes }` | Design exported (IFC/XKT/OBJ) |
| `DESIGN_CONVERTED_TO_IFC` | `{ ifcUrl, ifcSizeBytes }` | Scene → IFC conversion |
| `DESIGN_CONVERTED_TO_XKT` | `{ xktUrl, xktSizeBytes }` | Scene → XKT conversion |
| `DESIGN_PIPELINE_CACHED_RESULT_INVALIDATED` | `{ sceneId, stage, reason }` | Scene change invalidates cache |

### 10.8 API Schema

```typescript
// ─── Scene Management ───

// POST /api/v1/design/scenes
interface CreateSceneRequest {
  projectId: string;
  name: string;
  description?: string;
  units?: 'mm' | 'cm' | 'm';
}
interface CreateSceneResponse {
  sceneId: string;
  eventId: string;
  streamVersion: number;
  createdAt: string;
}

// GET /api/v1/design/scenes/:sceneId
interface SceneResponse {
  id: string;
  projectId: string;
  name: string;
  description: string;
  units: string;
  version: number;
  nodeCount: number;
  lastPipelineStage: string | null;
  nodes: DesignNodeResponse[];
  createdAt: string;
  updatedAt: string;
}

// PUT /api/v1/design/scenes/:sceneId
interface UpdateSceneRequest {
  name?: string;
  description?: string;
  units?: 'mm' | 'cm' | 'm';
}

// DELETE /api/v1/design/scenes/:sceneId

// ─── Node Management ───

// POST /api/v1/design/scenes/:sceneId/nodes
interface CreateNodeRequest {
  type: DesignNodeType;
  properties: Record<string, unknown>;
  position: Vector3;
  rotation?: Vector3;
  scale?: Vector3;
  parentId?: string;
}
interface CreateNodeResponse {
  nodeId: string;
  eventId: string;
}

// PUT /api/v1/design/scenes/:sceneId/nodes/:nodeId
interface UpdateNodeRequest {
  properties?: Record<string, unknown>;
  position?: Vector3;
  rotation?: Vector3;
  scale?: Vector3;
  parentId?: string | null;
  visible?: boolean;
  locked?: boolean;
  tags?: string[];
}

// DELETE /api/v1/design/scenes/:sceneId/nodes/:nodeId
interface DeleteNodeRequest {
  cascade?: boolean;
}

// POST /api/v1/design/scenes/:sceneId/nodes/connect
interface ConnectNodesRequest {
  sourceId: string;
  targetId: string;
  connectionType: 'ADJACENT' | 'SUPPORTS' | 'INTERSECTS' | 'CONTAINS';
  properties?: Record<string, unknown>;
}

// ─── Events ───

// POST /api/v1/design/scenes/:sceneId/events
// Batch append design events (from RxDB sync)

// GET /api/v1/design/scenes/:sceneId/events?fromVersion=0&limit=100
// Returns paginated event log for the scene

// ─── Pipeline ───

// POST /api/v1/design/pipeline/structural-check
interface StructuralCheckRequest {
  sceneId: string;
  checks?: string[];    // Specific checks to run (default: all)
}
interface StructuralCheckResponse {
  checkId: string;
  status: 'PASSED' | 'WARNING' | 'FAILED';
  checks: Array<{
    id: string;
    label: string;
    passed: boolean;
    severity: 'PASSED' | 'WARNING' | 'CRITICAL';
    detail?: string;
    value?: number;
    limit?: number;
  }>;
  summary: string;
  eventId: string;
  durationMs: number;
}

// POST /api/v1/design/pipeline/solar-analysis
interface SolarAnalysisRequest {
  sceneId: string;
  location: { latitude: number; longitude: number };
  orientation?: number;   // Building rotation in degrees from north
}
interface SolarAnalysisResponse {
  analysisId: string;
  annualInsolationKwh: number;
  panelRecommendations: Array<{
    area: string;          // e.g., "south-roof", "north-roof"
    areaM2: number;
    optimalTilt: number;
    estimatedYieldKwh: number;
    panelCount: number;
  }>;
  shadingFactors: Array<{ hour: number; factor: number }>;
  eventId: string;
  durationMs: number;
}

// POST /api/v1/design/pipeline/material-estimate
interface MaterialEstimateRequest {
  sceneId: string;
}
interface MaterialEstimateResponse {
  estimateId: string;
  materials: Array<{
    category: string;
    items: Array<{
      name: string;
      quantity: number;
      unit: string;
      unitPriceCents: number;
      totalCents: number;
    }>;
    subtotalCents: number;
  }>;
  totalCents: number;
  eventId: string;
  durationMs: number;
}

// POST /api/v1/design/pipeline/boq-generate
interface BoqGenerateRequest {
  sceneId: string;
  contingencyPercent?: number;   // Default: 10
}
interface BoqGenerateResponse {
  boqId: string;
  lineItems: Array<{
    id: string;
    category: string;
    description: string;
    quantity: number;
    unit: string;
    unitPriceCents: number;
    lineTotalCents: number;
    aiConfidence: number;       // 0-100
  }>;
  subtotalCents: number;
  contingencyPercent: number;
  contingencyCents: number;
  totalCents: number;
  currency: string;
  generatedAt: string;
  eventId: string;
  durationMs: number;
}

// POST /api/v1/design/pipeline/compliance/zbc-1996
interface ComplianceCheckRequest {
  sceneId: string;
  buildingType: 'RESIDENTIAL' | 'COMMERCIAL' | 'INFRASTRUCTURE';
  region: string;
}
interface ComplianceCheckResponse {
  checkId: string;
  code: 'ZBC_1996';
  passed: boolean;
  violations: Array<{
    clause: string;
    description: string;
    severity: 'WARNING' | 'VIOLATION';
    affectedNodeIds: string[];
    recommendation?: string;
  }>;
  summary: string;
}

// ─── BIM / Export ───

// POST /api/v1/design/bim/convert-to-ifc
interface ConvertToIfcRequest {
  sceneId: string;
}
interface ConvertToIfcResponse {
  ifcUrl: string;
  ifcSizeBytes: number;
  convertedAt: string;
}

// POST /api/v1/design/bim/convert-to-xkt
interface ConvertToXktRequest {
  sceneId: string;
}
interface ConvertToXktResponse {
  xktUrl: string;
  xktSizeBytes: number;
  convertedAt: string;
}

// POST /api/v1/design/bim/export
interface ExportDesignRequest {
  sceneId: string;
  format: 'IFC' | 'XKT' | 'OBJ' | 'GLTF';
}
interface ExportDesignResponse {
  downloadUrl: string;
  format: string;
  sizeBytes: number;
}

// ─── Snapshots ───

// POST /api/v1/design/scenes/:sceneId/snapshots
interface CreateSnapshotRequest {
  label: string;
  cameraState?: Record<string, unknown>;
}
interface CreateSnapshotResponse {
  snapshotId: string;
  createdAt: string;
  eventId: string;
}

// GET /api/v1/design/scenes/:sceneId/snapshots
// Returns list of snapshots

// POST /api/v1/design/scenes/:sceneId/snapshots/:snapshotId/restore
interface RestoreSnapshotResponse {
  restoredNodeIds: string[];
  eventId: string;
  restoredAt: string;
}
```

### 10.9 Frontend Component Architecture

```
pages/
  DesignStudio.tsx
    └─ StudioShell (full-viewport, Deep Cobalt bg)
        ├─ TopBar (48px)
        │   ├─ ProjectName (editable, Space Grotesk, h4)
        │   ├─ StatusBadge (sync status: online/offline/pending)
        │   ├─ LanguageToggle (EN | SN)
        │   └─ ViewModeToggle (Design | BIM Viewer)
        │
        ├─ CanvasArea (flex-1, relative)
        │   └─ PascalViewer (wraps @pascal-app/viewer <Viewer>)
        │       ├─ Ambient light (hsl: 30, 20%, 80% — warm)
        │       ├─ Hemisphere light (sky: #87ceeb, ground: #d4a574)
        │       └─ Grid (Deep Cobalt #1a365d, 1m spacing)
        │
        ├─ FloatingToolsPalette (absolute, left, glassmorphism)
        │   ├─ ToolGroup: Select | Wall | Slab | Roof | Column | Beam | Opening
        │   ├─ Divider
        │   ├─ ToolGroup: Move | Rotate | Scale | Align | Mirror
        │   ├─ Divider
        │   ├─ ToolGroup: Undo | Redo | Delete | Duplicate
        │   ├─ Divider
        │   └─ PipelineStatus (circular ring, color-coded)
        │
        ├─ [slide-in] PropertiesPanel (right, 300px, white bg)
        │   ├─ Header (node type icon + name)
        │   ├─ Position (X/Y/Z inputs)
        │   ├─ Dimensions (W/D/H or Length/Width/Thickness)
        │   ├─ Rotation (X/Y/Z degrees)
        │   ├─ Material (color swatches: #1a365d, #d4a574, #64748b, ...)
        │   ├─ Structural (load bearing toggle)
        │   └─ Delete button (Rose, bottom)
        │
        ├─ [slide-in] PipelinePanel (right, 320px, white bg)
        │   ├─ Header (Cpu icon + "AI Pipeline" + stage count)
        │   ├─ StageCard: Structural Check
        │   │   ├─ Status icon (pending/running/passed/warning/critical)
        │   │   ├─ Expandable check list (load paths, deflection, ...)
        │   │   └─ Run button (if not passed)
        │   ├─ StageCard: Solar Analysis
        │   │   ├─ Status icon
        │   │   ├─ Insolation kWh, panel count, tilt recommendations
        │   │   └─ Run button (if not complete)
        │   ├─ StageCard: Material Estimate
        │   │   ├─ Status icon
        │   │   ├─ Material list with quantities + unit prices
        │   │   └─ Run button (if not complete)
        │   ├─ StageCard: BOQ Generation
        │   │   ├─ Status icon
        │   │   ├─ Total cost (monospace, Deep Cobalt, formatted cents)
        │   │   ├─ Category breakdown bars
        │   │   └─ Run button (if not complete)
        │   ├─ "Run All Stages" button (Warm Sand, shimmer)
        │   └─ Footer: "Powered by Generative AI — review before applying"
        │
        ├─ BottomBar (40px)
        │   ├─ Tool name label (e.g., "Wall Tool")
        │   ├─ Cursor coordinates (monospace: X: 12.45m Y: 3.20m Z: 0m)
        │   ├─ Zoom level
        │   ├─ WebGPU badge (if available — emerald)
        │   └─ Pipeline status (idle/running/complete)
        │
        └─ [modal] BimViewerModal (full-screen overlay)
            └─ XeokitViewer (wraps xeokit SDK)
                ├─ SceneCanvas (xeokit Viewer with XKTLoaderPlugin)
                ├─ Toolbar (floating, glassmorphism)
                │   ├─ ResetView | Fullscreen | XRay | Section | Measure | Properties
                │   └─ Export (IFC / XKT / OBJ)
                └─ StatusBar (model name, entity count, renderer)
```

### 10.10 Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `W` | Wall tool |
| `S` | Slab tool |
| `R` | Roof tool |
| `C` | Column tool |
| `B` | Beam tool |
| `O` | Opening tool |
| `V` | Select tool |
| `G` | Move tool |
| `E` | Rotate tool |
| `T` | Scale tool |
| `Delete` / `Backspace` | Delete selected node |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Ctrl+D` | Duplicate selected |
| `Ctrl+S` | Save scene snapshot |
| `P` | Toggle Properties Panel |
| `L` | Toggle Pipeline Panel |
| `B` | Open BIM Viewer modal |
| `Ctrl+Shift+E` | Export design |
| `Space` | Quick-select (cycle through overlapping objects) |
| `1`-`9` | Tool memory slot (customizable) |

### 10.11 Kafka Integration

**Produced** (topic: `design.event`):

| Events | Consumers |
|---|---|
| DESIGN_SCENE_CREATED, DESIGN_SCENE_UPDATED, DESIGN_SCENE_DELETED | AI Studio, Analytics, Notification |
| DESIGN_NODE_CREATED, DESIGN_NODE_MODIFIED, DESIGN_NODE_DELETED | AI Studio (context refresh), Analytics |
| DESIGN_SNAPSHOT_TAKEN, DESIGN_SNAPSHOT_RESTORED | Analytics |
| DESIGN_STRUCTURAL_CHECK_COMPLETED | Vault (budget risk scoring) |
| DESIGN_SOLAR_ANALYSIS_COMPLETED | AI Studio (energy context) |
| DESIGN_MATERIAL_ESTIMATE_COMPLETED | Vault (budget pre-fill) |
| DESIGN_BOQ_GENERATED | Vault (budget_lines creation) |
| DESIGN_COMPLIANCE_CHECKED | AI Studio (compliance context) |

**Produced** (topic: `design.pipeline`):

| Events | Consumers |
|---|---|
| PIPELINE_STARTED, PIPELINE_STAGE_COMPLETED, PIPELINE_STAGE_FAILED, PIPELINE_COMPLETED | Notification, Analytics |

**Produced** (topic: `design.boq`):

| Events | Consumers |
|---|---|
| BOQ_GENERATED | Vault (→ budget_lines), Supplier (material sourcing) |

**Consumed**:

| Topic | Events | Action |
|---|---|---|
| `project.lifecycle` | PROJECT_CREATED | Initialize empty DesignScene for project |
| `project.lifecycle` | PROJECT_UPDATED | Refresh scene context (location, region) |
| `budget.change` | BUDGET_LOCKED | Lock scene from further structural edits |

### 10.12 UX States

**Empty State** (no scene loaded):
```
┌──────────────────────────────────────┐
│  [HardHat icon, 64px, Warm Sand]     │
│                                      │
│  Start Sketching Your Dream Home     │
│  Select a template or start blank    │
│                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────┐ │
│  │3-Bedroom │ │2-Bedroom │ │Cottage│ │
│  │  House   │ │  House   │ │      │ │
│  └──────────┘ └──────────┘ └──────┘ │
│  ┌──────────┐ ┌──────────┐ ┌──────┐ │
│  │  Studio  │ │Commercial│ │Ware- │ │
│  │          │ │  Shop    │ │house │ │
│  └──────────┘ └──────────┘ └──────┘ │
│                                      │
│  [Start Blank] button (ghost style)  │
└──────────────────────────────────────┘
```

**Loading State** (canvas initializing):
```
[Skeleton overlay]
- TopBar skeleton: 3 shimmer bars
- ToolsPalette skeleton: 6 shimmer squares (44×44)
- Canvas skeleton: full-area shimmer with [Loader2 spinner + "Loading 3D editor…"]
- Progress bar (simulated 0-90%, accelerates at 70%)
- On complete: fade-out skeleton → fade-in canvas (500ms transition)
```

**Error State** (WebGL/WebGPU unavailable):
```
[EditorErrorFallback]
- AlertTriangle icon (Rose #e53e3e)
- "3D Editor Error"
- Message: "WebGL is required for 3D editing. Please use a modern browser."
- [Retry] button → re-initializes with WebGL2 fallback
- [Download Desktop App] link (future)
```

**Pipeline Error State** (calculation failure):
```
[PipelinePanel]
- StageCard shows FAILED status (Rose pulsing badge)
- Error detail: "Beam deflection calculation failed — span exceeds maximum (12m limit)"
- [Retry Stage] button → re-runs specific stage
- [Simplify Geometry] link → auto-reduces polygon count for calculation
```

**Sync Status Badge** (TopBar):
```
Connected:    Emerald dot + "Synced" (fade-in, 2s then hidden)
Offline:      Amber dot + "Offline — changes saved locally" (persistent)
Pending:      Amber dot with spinning ring + "Syncing (3 pending)…" (until flushed)
Error:        Rose dot + "Sync failed — tap to retry" (tap retries flush)
```

### 10.13 Definition of Done (Sprint 3)

- [ ] `/design-studio` route renders full-viewport 3D canvas with `@pascal-app/viewer` embedded
- [ ] FloatingToolsPalette renders left-anchored with glassmorphism styling (backdrop-blur, rgba white bg)
- [ ] All 7 primary tools (select, wall, slab, roof, column, beam, opening) functional
- [ ] Tools use Deep Cobalt (#1a365d) UI shell with Warm Sand (#d4a574) active state accents
- [ ] Every design mutation appends event to RxDB `design_events` BEFORE scene state update
- [ ] RxDB syncs unsynced events to `POST /api/v1/design/scenes/:id/events` on reconnect with exponential backoff
- [ ] TopBar shows sync status badge (Connected / Offline / Pending / Error)
- [ ] `POST /api/v1/design/pipeline/structural-check` returns load path, deflection, slenderness results
- [ ] `POST /api/v1/design/pipeline/solar-analysis` returns insolation, panel recommendations, shading
- [ ] `POST /api/v1/design/pipeline/material-estimate` returns material list with quantities and cents prices
- [ ] `POST /api/v1/design/pipeline/boq-generate` returns BOQ with line items, category breakdown, total in cents
- [ ] PipelinePanel shows 4-stage pipeline with per-stage status icons (pending/running/passed/warning/critical)
- [ ] "Run All Stages" button triggers sequential pipeline with progress streaming
- [ ] BimViewerModal renders full-screen xeokit viewer with loaded XKT model
- [ ] `POST /api/v1/design/bim/convert-to-xkt` converts scene JSON → XKT format
- [ ] Scene snapshots: `POST /snapshots` saves, `POST /snapshots/:id/restore` restores with event emission
- [ ] Empty state shows 6 quick-start template cards
- [ ] Keyboard shortcuts: W/S/R/C/B/O for tools, Delete removal, Ctrl+Z undo, Ctrl+D duplicate
- [ ] Measure tool shows distance/angle in BottomBar
- [ ] BottomBar shows tool name, cursor coordinates, zoom level, renderer badge
- [ ] Dark mode: all components have `dark:` variants with Cobalt Dark (`#0f2744`) canvas bg
- [ ] All UI text localized via `i18n.t("design-studio.*")` with English and Shona translations
- [ ] TypeScript: zero errors. ESLint: zero warnings. Unit tests: passing.
- [ ] RLS enforced: users see own scenes; contractors see only assigned project designs
- [ ] ZBC 1996 compliance check endpoint returns violations with clause references

### 10.14 Anti-Patterns Specific to Computational Design

| ID | Prohibition | Enforcement |
|---|---|---|
| AP-DES-01 | Never update scene state before event persistence | DzenRxDbSync must complete RxDB append before Zustand store commit |
| AP-DES-02 | Never deliver pipeline result before event persistence | PipelineController appends DESIGN_*_COMPLETED to EventStoreDB before returning response |
| AP-DES-03 | Never display unvalidated design in BIM viewer | BimViewerModal blocks if scene has not passed STRUCTURAL_CHECK stage |
| AP-DES-04 | Never mutate design_nodes directly without event | All node mutations must flow through DzenSceneBridge → RxDB event → API sync |
| AP-DES-05 | Never hardcode CWICR pricing in BOQ output | BOQ generation must fetch live prices via CWICR API; cached prices expire after 1 hour |
| AP-DES-06 | Never allow offline pipeline execution | Pipeline endpoints return 503 when offline; queued as PENDING_SYNC |
| AP-DES-07 | Never skip geometry validation on scene import | Imported IFC/XKT models must pass structural topology validation before editing |
| AP-DES-08 | Never allow unbounded scene node count | Client enforces 500-node limit; server rejects beyond 1000 with suggestion to split |
| AP-DES-09 | Never expose raw Claude skill system prompts | All skill prompts are server-side only; API returns structured JSON responses |
| AP-DES-10 | Never cache pipeline results across scene geometry changes | Scene node modification invalidates all cached pipeline results for that scene |

---

*project_constitution.md | Dzenhare Technical Governance*
*Version 8.0 | Ratified: June 2026 | Sprint 3 — Computational Design & BIM Pipeline*  
