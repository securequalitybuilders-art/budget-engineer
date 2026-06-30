# DzeNhare Budget Engineer — Project Constitution

> **Version:** 1.0.0  
> **Authority:** Non-negotiable. All code contributors and AI agents must obey these rules. Violations must be flagged and reverted.

---

## ARTICLE I: NON-NEGOTIABLE RULES

### I.1 No Paid APIs
**No code path may call a paid external API.** This includes:

- OpenAI (any endpoint)
- Anthropic (any endpoint)
- Google Gemini API
- Vercel AI SDK
- Any API requiring a credit card or API key billed by usage
- Any API that sends user data to a third-party server

**Allowed:**
- Free open-source models via Transformers.js (local browser ONNX runtime)
- WebLLM (local WebGPU LLM inference)
- Deterministic rule-based computation
- Template-based generation
- Free tier of services with no usage limits (e.g., IndexedDB, localStorage)

### I.2 Offline-First
The application must function fully with zero network connectivity.

- All application data in IndexedDB via Dexie.js
- All computation in Web Workers (no server round-trips)
- All AI inference must have a deterministic fallback when GPU is unavailable
- `navigator.onLine` may enhance experience but must never be required

### I.3 Open Source Only
- Zero proprietary SDKs or libraries
- Zero npm packages with restrictive licenses (no SSPL, no BUSL)
- Prefer MIT, Apache 2.0, BSD, ISC, or public domain
- All code in this repository is MIT licensed

### I.4 Build Integrity
- `npm install` must succeed with zero errors
- `npm run typecheck` must pass with zero errors
- `npm run build` must produce a deployable production build
- `npm run lint` must pass with zero warnings

---

## ARTICLE II: DATA INTEGRITY RULES

### II.1 Schema Versioning
- Every IndexedDB object store must have a version number
- Migrations must be backward-compatible or include migration functions
- Database schema version = integer incremented per change in `db.ts`

### II.2 Validation Gates
- Every write to IndexedDB must pass schema validation
- Use Zod or Valibot for runtime validation of all persisted data
- Invalid data must be rejected with a descriptive error
- Validation runs both on write and on read (defense in depth)

### II.3 Referential Integrity
- All entity references (e.g., `projectId` on BOQ) must point to existing entities
- Cascade deletes: deleting a project deletes all its children (building, BOQ, transactions)
- Orphaned records must be detected and logged

### II.4 Conflict Prevention
- No two entities may share the same `id` (use UUID v4 or nanoid)
- Optimistic concurrency: use `version` field to detect stale writes
- Stale writes must be rejected with `VersionConflictError`

---

## ARTICLE III: AUDIT RULES

### III.1 Universal Transaction Log
Every data mutation MUST generate a transaction event with:

```
Transaction {
  id: string (UUID v4)
  projectId: string
  action: string (e.g., "cad.wall.create", "boq.item.update")
  entityType: string (e.g., "Wall", "BOQItem")
  entityId: string
  before: object | null  (previous state, null on create)
  after: object | null    (new state, null on delete)
  diff: object            (JSON Patch or deep diff)
  userId: string          ("local" for single-user)
  timestamp: string       (ISO 8601 UTC)
  checksum: string        (SHA-256 of all above fields)
}
```

### III.2 Checksum Verification
- Every transaction event includes a SHA-256 checksum of its JSON-serialized fields
- Transaction log integrity can be verified by recomputing checksums
- Tampered transactions must be flagged in the UI with a warning banner

### III.3 Immutability
- Transaction events are append-only
- No update or delete of a transaction event
- Transaction log is a separate IndexedDB table with `++id` as auto-increment

### III.4 Time Travel
- Users can restore the project state to any point in the transaction log
- Restore replays all transactions from the beginning up to the selected point
- The restore itself generates a new transaction event

---

## ARTICLE IV: MONEY RULES

### IV.1 Integer Arithmetic
- All monetary values stored as integers in the smallest currency unit (cents, satoshis, etc.)
- `Money.amount` is always an integer
- No floating-point operations on money values
- Use `BigInt` for large sums to avoid JavaScript `Number` precision limits

### IV.2 Currency Awareness
- Every monetary value must specify a currency using ISO 4217 code
- Default currency: USD (configurable in project settings)
- Exchange rates stored as `{ from, to, rate, timestamp }`
- Exchange rate conversions must be logged in transaction history

### IV.3 Deterministic Math
- All financial calculations must be deterministic (same input → same output)
- No rounding modes — always round down for costs, round up for taxes
- Rounding must happen at the final step, not intermediate steps
- Display precision: 2 decimal places for major currencies

### IV.4 Auditable Totals
- Grand total must equal: `subtotal + taxes + contingency + overhead`
- Each component must have its own line item and breakdown
- Every total must be traceable to individual BOQ items

---

## ARTICLE V: GEOMETRY RULES

### V.1 Unit System
- Internal unit: millimeters (mm) for all linear measurements
- Area: square millimeters (mm²) internally, converted on display
- Volume: cubic millimeters (mm³) internally, converted on display
- Angles: radians throughout (convert to degrees only for UI display)

### V.2 Precision
- 2D coordinates: integers (snap to integer grid by default)
- 3D coordinates: float64 (IEEE 754 double)
- Use `Math.round`/`Math.floor` appropriately for snapping
- Avoid repeated floating-point operations that accumulate error

### V.3 Topology
- Walls: defined by centerline path + thickness
- Slabs: defined by polygon outline + thickness
- Openings: defined by bounding box on host element
- Faces: counter-clockwise winding order (OpenGL convention)
- All polygons must be simple (no self-intersection)

### V.4 Validation
- Every geometric entity must pass validity check on creation
- Invalid geometry (zero-length walls, self-intersecting polygons) must be rejected
- Geometry validation functions must be pure and testable

---

## ARTICLE VI: EXPORT RULES

### VI.1 Fidelity
- Exports must match the internal data exactly (no rounding, no approximation)
- Currency formatting must match the source project settings
- All measurements must include units in the export

### VI.2 Format Standards
- PDF: PDF/A-1b compliant where possible
- XLSX: Open XML Spreadsheet format (via SheetJS community edition)
- DXF: AutoCAD R12 compatible (minimum)
- IFC: IFC2x3 or IFC4 (schema determined at runtime)
- CSV: RFC 4180 compliant
- JSON: valid JSON with datetime in ISO 8601

### VI.3 Privacy
- No user data may be sent to any external service during export
- All exports must be generated entirely client-side
- Export files must not contain tracking, analytics, or watermarks

---

## ARTICLE VII: ARCHITECTURE RULES

### VII.1 Separation of Concerns
- UI components must never directly mutate data (must go through stores)
- Engines must be pure functions with no side effects
- Web Workers must communicate via structured clone (no shared memory)
- Persistence layer must be swappable (Dexie now, future: SQLite via sql.js)

### VII.2 Error Handling
- Every async operation must have try/catch
- Errors must be typed (custom error classes)
- User-facing errors must be human-readable
- Technical errors must be logged to console with stack traces (dev mode only)

### VII.3 State Flow
```
User Action → Zustand Action → (optional) Web Worker → Dexie Write → Transaction Event → UI Update
```

- No component may write directly to IndexedDB
- No component may import engine functions directly (must go through store)
- UI reads from Zustand stores (not from IndexedDB)

---

## ARTICLE VIII: ANTI-PATTERNS

### These are explicitly forbidden:

| Anti-Pattern | Instead Use |
|---|---|
| `any` type in TypeScript | `unknown` with type narrowing |
| Inline styles | Tailwind utility classes |
| Class components | Functional components |
| Direct DOM manipulation | React state + refs |
| `localStorage` for project data | IndexedDB via Dexie |
| Server-side rendering (SSR) | Client-side rendering (CSR) |
| Fetching data from network | Local IndexedDB queries |
| Secret keys in source code | `.env` (with verification it's not committed) |
| Hardcoded rates/prices | User-configurable settings |
| Global variables | Zustand stores |
| `setTimeout` for sync/state | Zustand subscriptions |
| Direct mutation of state | Immer or spread operators |
| `alert()` / `confirm()` | Custom modal/dialog components |
| CSS-in-JS libraries | Tailwind CSS |
| npm packages with paid tiers Check | Read license carefully |
| `eval()` or `new Function()` | Zéro tolerance |
| `document.write()` | Zéro tolerance |
| `innerHTML` with user content | `textContent` or sanitized dangerouslySetInnerHTML |
