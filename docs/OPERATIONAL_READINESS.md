# Operational Readiness — Budget Engineer

> **Version:** v4.0.0  
> **Updated:** 2026-07-19

---

## 1. Data Storage Model

Budget Engineer uses a **local-first data architecture**:

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Primary storage** | IndexedDB (via Dexie.js) | All project data: geometry, drawings, BOQ, settings, lifecycle state |
| **Local state** | Zustand + Immer | In-memory application state (persisted to IndexedDB) |
| **Settings** | localStorage | Theme preference, user role, display settings |
| **Static assets** | Service worker cache (Cache API) | App shell, JavaScript, CSS, fonts, WASM |

### What This Means

- **All data stays on the device.** No data is transmitted to any server.
- **Data is bound to the browser profile.** Clearing browser data will delete projects.
- **Data does not sync across devices.** Each browser has its own independent IndexedDB.
- **Storage limits** vary by browser (typically 50 MB–500 MB for IndexedDB). Large projects with many drawings and images may approach limits on mobile browsers.

### Storage Location by Browser

| Browser | IndexedDB Location |
|---------|-------------------|
| Chrome | `AppData/Local/Google/Chrome/User Data/Default/IndexedDB/` |
| Firefox | `AppData/Roaming/Mozilla/Firefox/Profiles/*/storage/default/` |
| Edge | `AppData/Local/Microsoft/Edge/User Data/Default/IndexedDB/` |
| Safari | `~/Library/Safari/LocalStorage/` (partial) |

---

## 2. Backup Guidance

Budget Engineer does **not** perform automatic backups. Users are responsible for their own data.

### Recommended Backup Strategy

1. **Export each project as a `.beproj` ZIP file** from the Portfolio page or project dashboard.
2. Store exported files in a secure location (cloud storage, network drive, version control).
3. For active projects, export weekly or after significant milestones.
4. Test restore by importing an export into a clean browser profile periodically.

### What a Project Export Contains

- Building graph (rooms, walls, openings, levels)
- BOQ data with quantities and pricing
- 2D CAD geometry and annotations
- 3D BIM state where applicable
- Drawing configurations
- Interior design data (fixtures, finishes, schedules)
- Site analysis parameters
- Lifecycle workflow state (milestones, approvals, NCRs, RFIs)
- Project metadata and settings

### What a Project Export Does NOT Contain

- Browser-specific IndexedDB metadata (not needed for restore)
- Service worker cache (regenerated on first load)
- Browser settings or extensions

---

## 3. Restore / Import Guidance

### Importing a Project

1. Open Budget Engineer.
2. Navigate to the Portfolio page or dashboard.
3. Click **Import Project** or use the project import workflow.
4. Select the `.beproj` file.
5. The system validates the file structure, schema version, and required fields.
6. On success, the project appears in your project list.

### What to Verify After Import

- [ ] All rooms and walls display correctly in the CAD editor
- [ ] BOQ data shows correct quantities and pricing
- [ ] 3D model renders (if applicable)
- [ ] Drawings generate correctly
- [ ] Lifecycle status is preserved
- [ ] Milestones and approvals are intact

### Troubleshooting Import

| Issue | Likely Cause | Action |
|-------|-------------|--------|
| "Invalid file format" | Not a valid `.beproj` ZIP | Verify file extension and content |
| "Schema version mismatch" | Export from different version | Check version compatibility |
| Missing geometry data | Corrupted export | Re-export from source if available |
| Partial restore | Browser storage quota exceeded | Free up IndexedDB space, retry |

---

## 4. Diagnostics Usage

The **Diagnostics Panel** provides real-time operational insight:

**Open:** `Ctrl+Shift+D` or Sidebar → Diagnostics

### Error Log Tab

- Displays captured errors, warnings, and info messages
- Each entry shows: level, timestamp, message, optional stack trace
- Maximum 200 entries (oldest are pruned)
- **Export**: Download diagnostics as JSON for support
- **Clear**: Remove all entries

### Build Info Tab

| Field | Description |
|-------|-------------|
| **Build Version** | Current version from `package.json` |
| **Build Time** | ISO timestamp of the build |
| **User Agent** | Browser and OS identification |
| **Online** | Whether the browser reports network connectivity |
| **Storage (localStorage)** | Current localStorage usage |

### Diagnostic Export Format

The exported JSON includes:
```json
{
  "version": "4.0.0",
  "buildTime": "2026-07-19T...",
  "userAgent": "...",
  "online": true,
  "log": [...],
  "timestamp": "2026-07-19T..."
}
```

---

## 5. Validation & Pilot Readiness

Budget Engineer includes a structured **validation and pilot-readiness evaluation** system:

### Validation Benchmarks

18 automated benchmarks across 5 categories (plan, BOQ, schedule, programme, code-check) measure output quality against expected values with defined tolerances.

### Pilot Readiness Tiers

| Tier | Meaning | Action Required |
|------|---------|-----------------|
| **Pilot Deployment** | Ready for limited pilot with monitored usage | Proceed with supervised rollout |
| **Supervised Professional** | Professional supervision required | Assign qualified reviewer |
| **Internal Only** | Suitable for development testing only | Restrict to internal team |
| **Blocked** | Critical issues prevent deployment | Resolve failures first |

### Calibration Transparency

Each benchmark metric is labelled with its evidence basis:
- `[VERIFIED]` — checked against real project data
- `[HEURISTIC]` — derived from empirical formulas
- `[ASSUMED]` — based on industry defaults
- `[UNVERIFIED]` — not yet verified against real data

See in-app **Validation Summary** panel and **Product Package** panel for detailed reports.

---

## 6. Role / Access Model

Budget Engineer uses a **local, non-authenticated role model**:

| Role | Capabilities |
|------|-------------|
| **Owner** | Full access: edit, review, approve, reject, comment |
| **Reviewer** | Review, reject, comment — no structural edits |
| **Viewer** | Read-only access to project data |

**Important:** This is a local simulation role system, not a multi-user authentication or authorization system. Roles are set per browser instance and do not enforce access across devices.

---

## 7. Plugin / Extension Boundaries

The Plugin SDK supports build-time, local-first extensions:

### Supported
- Lifecycle hooks: `onProjectOpen`, `onProjectSave`, `onBuildingGraphChange`, `onBoqGenerate`, `onExport`, `onImport`, `onCanvasRender`, `onAppStart`
- Typed permissions: `read:project`, `write:project`, `read:buildingGraph`, `write:buildingGraph`, `read:boq`, `write:boq`, `export:file`, `ui:addPanel`
- Custom React panels

### Not Supported
- Runtime plugin download or marketplace
- Remote plugin execution
- Plugins with network access beyond browser CSP
- Plugins that modify core domain models

See [PLUGIN_SDK.md](PLUGIN_SDK.md) for full documentation.

---

## 8. Security Notes

- **Content-Security-Policy** restricts script sources to `'self'`
- **No telemetry, analytics, or data collection** of any kind
- **No user data leaves the browser** unless the user explicitly exports
- **Import validation** checks JSON structure, schema version, and required fields
- **CSV export escaping** prevents injection
- **Dependency audit** (`npm audit`) runs in CI at `--audit-level=high`

See [SECURITY_NOTES.md](SECURITY_NOTES.md) for the full threat model.

---

## 9. Performance Considerations

| Area | Guidance |
|------|----------|
| **First load** | Larger bundle due to 3D and CAD libraries; subsequent loads are cached |
| **Large projects** | Projects with 50+ rooms or extensive drawing sets may be slower on low-end devices |
| **Mobile** | Dashboard and review work well on phones; CAD editing best on tablet or desktop |
| **Browser memory** | 3D viewer and CAD editor use significant memory on complex models |
| **Storage** | IndexedDB quotas vary; export and archive completed projects |

See [PERFORMANCE_NOTES.md](PERFORMANCE_NOTES.md) for detailed performance baseline.

---

## 10. Supervised Professional Use

### Required Human Review Areas

The following capabilities produce outputs that require professional human review before use:

| Capability | Review Note |
|-----------|-------------|
| Design Pipeline | AI-generated plans require architect review |
| Interior Design | Fixture/finish selections need client/budget verification |
| Site Analysis | Advisory only — verify against actual site conditions |
| Image Import | Wall detection is assistive — review all detected geometry |
| Construction Drawings | Draft quality — professional stamping required for permits |
| DXF Pipeline | Verify output in target CAD software before distribution |
| Presentation Boards | Review for completeness and accuracy |
| Engineering Analysis | Preliminary — final design needs registered professional |
| BOQ/Cost Estimation | Early-stage — not suitable for tendering without QS review |
| Code Compliance | Approximate — verify with local authority |
| Procurement/Delivery | Professional signoff required before submission |
| Assurance/Handover | Supports decisions but does not replace legal signoff |
| Lifecycle Workflow | Status indicators are informational |
| Package Export | Verify all contents before submission |
| Validation/Pilot | Supports decisions — does not constitute certification |

### When to Seek External Professional Signoff

- **Structural design and calculations** — registered structural engineer
- **Building code compliance** — local authority or accredited inspector
- **Permit drawing sets** — registered architect or architectural technologist
- **Fire safety design** — fire engineer
- **Quantity surveying for tender** — professional quantity surveyor
- **MEP design for construction** — registered mechanical/electrical engineer

---

## 11. Evaluation Checklist

A systematic 21-item evaluation checklist is available in the in-app **Product Package** panel. It covers:

- Setup & deployment verification
- Design pipeline testing
- CAD editing and 3D BIM
- Construction drawings and DXF
- BOQ, cost, and planning
- Code compliance and export/import
- Lifecycle and validation
- Diagnostics

---

## 12. Pilot Rollout Plan

A 10-step phased rollout plan is available in the in-app **Product Package** panel:

1. **Preparation (3 steps):** Define scope, choose deployment, install and verify
2. **Onboarding (2 steps):** Team orientation, reference project
3. **Execution (2 steps):** Supervised pilot, collect feedback
4. **Evaluation (3 steps):** Review outcomes, decide to expand/continue/pause
