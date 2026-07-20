export type CapabilityGroupId =
  | 'design-pipeline'
  | 'cad-editing'
  | 'bim-viewing'
  | 'interior-design'
  | 'site-analysis'
  | 'image-import'
  | 'construction-drawings'
  | 'dxf-pipeline'
  | 'presentation-boards'
  | 'engineering-analysis'
  | 'boq-cost-estimation'
  | 'code-compliance'
  | 'procurement-delivery'
  | 'assurance-handover'
  | 'lifecycle-workflow'
  | 'package-export'
  | 'validation-pilot'
  | 'plugin-sdk';

export type MaturityLevel = 'foundation' | 'emerging' | 'established' | 'mature';

export interface CapabilityGroup {
  id: CapabilityGroupId;
  label: string;
  description: string;
  maturity: MaturityLevel;
  requiresHumanReview: boolean;
  humanReviewNote: string;
  workflowStages: string[];
  dependencies: CapabilityGroupId[];
}

export type DeploymentMode = 'local-workstation' | 'office-network' | 'docker-hosted' | 'static-hosting';

export type AudienceProfile = 'architect' | 'engineer' | 'contractor' | 'developer' | 'qs' | 'student' | 'evaluator';

export interface DeploymentProfile {
  id: DeploymentMode;
  label: string;
  description: string;
  infrastructure: string;
  audience: AudienceProfile[];
  supportedModes: string[];
  limitations: string[];
}

export interface UseContext {
  id: string;
  label: string;
  description: string;
  audience: AudienceProfile[];
  suitableFor: string[];
  notSuitableFor: string[];
}

export const CAPABILITY_GROUPS: CapabilityGroup[] = [
  {
    id: 'design-pipeline',
    label: 'Design Pipeline',
    description: 'Six-stage workspace (Brief → Concept → Design → Engineering → Docs & BIM → Cost & Deliver) with AI-assisted brief-to-plan generation, typology-aware room programs, and multi-storey planning.',
    maturity: 'mature',
    requiresHumanReview: true,
    humanReviewNote: 'AI-generated plans require architect review and adjustment. Verify room sizes, adjacencies, and circulation.',
    workflowStages: ['brief', 'concept', 'design'],
    dependencies: [],
  },
  {
    id: 'cad-editing',
    label: '2D CAD Editor',
    description: 'Interactive plan canvas with draw/move/resize/delete for rooms, doors, windows. Snap-to-grid, keyboard nudge, live dimensions, unlimited undo/redo, touch editing.',
    maturity: 'mature',
    requiresHumanReview: false,
    humanReviewNote: '',
    workflowStages: ['design'],
    dependencies: ['design-pipeline'],
  },
  {
    id: 'bim-viewing',
    label: '3D BIM Viewer',
    description: 'React Three Fiber 3D viewer with walls, slabs, doors, windows, roof. Dollhouse cutaway, click-to-fly, first-person walkthrough, parametric canopy roof. GLB export.',
    maturity: 'established',
    requiresHumanReview: false,
    humanReviewNote: '',
    workflowStages: ['design', 'engineering'],
    dependencies: ['design-pipeline'],
  },
  {
    id: 'interior-design',
    label: 'Interior Design Studio',
    description: '62 fixtures across 14 room templates. Material/finish scheduling, interior canvas, BOQ integration for finishes and fixtures.',
    maturity: 'established',
    requiresHumanReview: true,
    humanReviewNote: 'Fixture placement and finish selections should be reviewed against client brief and budget.',
    workflowStages: ['design', 'engineering'],
    dependencies: ['design-pipeline'],
  },
  {
    id: 'site-analysis',
    label: 'Environmental & Site Analysis',
    description: 'Heliodon engine, sun-path computation, shadow casting, wind analysis, composite orientation optimization. SVG diagrams.',
    maturity: 'established',
    requiresHumanReview: true,
    humanReviewNote: 'Site analysis outputs are advisory. Verify against actual site conditions and professional survey.',
    workflowStages: ['engineering'],
    dependencies: ['design-pipeline'],
  },
  {
    id: 'image-import',
    label: 'Image-to-Floor-Plan Import',
    description: 'Guided import workflow: upload → calibrate scale → detect walls (offline OpenCV.js/WASM) → review → edit. Confidence tracking with manual clean-up. DXF import also supported.',
    maturity: 'established',
    requiresHumanReview: true,
    humanReviewNote: 'Wall detection is assistive. Review all detected geometry and correct before use.',
    workflowStages: ['concept', 'design'],
    dependencies: [],
  },
  {
    id: 'construction-drawings',
    label: 'Construction Drawings',
    description: '11 SVG-rendered drawing types: Floor Plan, Site Plan, Foundation, Roof, RCP, Electrical, Plumbing, HVAC, Front/Side Elevation, Section A-A. A1 presentation sheet. PDF/PNG export.',
    maturity: 'mature',
    requiresHumanReview: true,
    humanReviewNote: 'Drawings are draft-quality. Professional review and stamping required for permit submission.',
    workflowStages: ['docs-bim', 'cost-deliver'],
    dependencies: ['design-pipeline', 'cad-editing'],
  },
  {
    id: 'dxf-pipeline',
    label: 'Professional DXF Pipeline',
    description: 'AIA-standard layer naming, configurable dimension styles, A4–A0 sheet sizes, paper-space layout, block INSERT entities. DXF roundtrip tested.',
    maturity: 'mature',
    requiresHumanReview: true,
    humanReviewNote: 'DXF output should be opened and verified in target CAD software before distribution.',
    workflowStages: ['docs-bim'],
    dependencies: ['construction-drawings'],
  },
  {
    id: 'presentation-boards',
    label: 'Presentation Boards',
    description: 'Board editor with 1–9 cell grid on A1/A0 sheets. Text annotations, arrow callouts, freehand markup. Capture 2D/3D snapshots. Export SVG/PNG/PDF.',
    maturity: 'established',
    requiresHumanReview: true,
    humanReviewNote: 'Board content should be reviewed for completeness and accuracy before presentation.',
    workflowStages: ['cost-deliver'],
    dependencies: ['construction-drawings', 'cad-editing'],
  },
  {
    id: 'engineering-analysis',
    label: 'Engineering Analysis',
    description: '7 calculators (load combos, footing sizing, rebar spec, beam analysis). 3 BIM clash rules. Solar orientation. MEP takeoff. Structural/MEP pre-design support.',
    maturity: 'established',
    requiresHumanReview: true,
    humanReviewNote: 'All engineering calculations are preliminary. Final design and signoff require a registered professional engineer.',
    workflowStages: ['engineering'],
    dependencies: ['design-pipeline'],
  },
  {
    id: 'boq-cost-estimation',
    label: 'BOQ, Cost Estimation & Planning',
    description: 'Geometry-derived quantities, regional rate cards (Zimbabwe, South Africa, Kenya, Global), schedules, Gantt programme, cashflow analysis. Export to CSV, HTML, PDF.',
    maturity: 'mature',
    requiresHumanReview: true,
    humanReviewNote: 'Cost estimates are early-stage and use regional defaults. Not suitable for procurement or tendering without QS review.',
    workflowStages: ['engineering', 'cost-deliver'],
    dependencies: ['design-pipeline', 'engineering-analysis'],
  },
  {
    id: 'code-compliance',
    label: 'Building Code Compliance',
    description: '28 rules across 4 jurisdictions: Zimbabwe (ZBC), South Africa (SANS 10400), Zambia (CAP 295), Botswana. Jurisdiction picker in Analysis and BOQ panels.',
    maturity: 'emerging',
    requiresHumanReview: true,
    humanReviewNote: 'Compliance checks are approximate and for early guidance only. Always verify with a local authority or registered professional.',
    workflowStages: ['engineering', 'docs-bim'],
    dependencies: ['design-pipeline', 'engineering-analysis'],
  },
  {
    id: 'procurement-delivery',
    label: 'Procurement & Delivery Workflow',
    description: 'Sheet revision workflow, package creation with issue-type/submission-category support, transmittal generation, drawing register.',
    maturity: 'established',
    requiresHumanReview: true,
    humanReviewNote: 'All deliverables require professional review and signoff before submission.',
    workflowStages: ['cost-deliver'],
    dependencies: ['construction-drawings', 'boq-cost-estimation'],
  },
  {
    id: 'assurance-handover',
    label: 'Assurance & Handover Workflow',
    description: 'Project intake and assurance logic, feasibility/go-no-go, milestone release, NCR/RFI/snag tracking, handover documentation, project controls.',
    maturity: 'established',
    requiresHumanReview: true,
    humanReviewNote: 'Assurance workflows support professional decision-making but do not replace contractual or legal signoff processes.',
    workflowStages: ['cost-deliver'],
    dependencies: ['procurement-delivery'],
  },
  {
    id: 'lifecycle-workflow',
    label: 'Lifecycle Workflow & Continuity',
    description: 'Cross-stage workflow orchestration with dependency awareness, status transitions, health summaries, and project lifecycle dashboards.',
    maturity: 'established',
    requiresHumanReview: true,
    humanReviewNote: 'Lifecycle status indicators are informational. Professional judgment governs all phase transitions.',
    workflowStages: ['brief', 'concept', 'design', 'engineering', 'docs-bim', 'cost-deliver'],
    dependencies: ['assurance-handover', 'procurement-delivery'],
  },
  {
    id: 'package-export',
    label: 'Package Export & Submission Packaging',
    description: 'Discipline/schedule-aware package assembly with deterministic sheet numbering, export naming, issue tracking, and submission category support. ZIP with manifest.',
    maturity: 'established',
    requiresHumanReview: true,
    humanReviewNote: 'Verify all package contents before submission. Package assembly is assistive, not authoritative.',
    workflowStages: ['cost-deliver'],
    dependencies: ['procurement-delivery', 'construction-drawings'],
  },
  {
    id: 'validation-pilot',
    label: 'Validation & Pilot Calibration',
    description: 'Benchmark-driven validation (18 benchmarks), calibration scorecards, regression detection, pilot-readiness evaluation (4 deployment tiers), calibration transparency labelling.',
    maturity: 'emerging',
    requiresHumanReview: true,
    humanReviewNote: 'Validation outputs support release decisions. They do not constitute formal certification or signoff.',
    workflowStages: ['cost-deliver'],
    dependencies: ['package-export'],
  },
  {
    id: 'plugin-sdk',
    label: 'Plugin SDK',
    description: 'Local-first plugin system with lifecycle hooks (onProjectOpen, onProjectSave, etc.), typed permissions, and React panel API. All plugins build-time bundled.',
    maturity: 'foundation',
    requiresHumanReview: false,
    humanReviewNote: '',
    workflowStages: [],
    dependencies: [],
  },
];

export const DEPLOYMENT_PROFILES: DeploymentProfile[] = [
  {
    id: 'local-workstation',
    label: 'Local Workstation',
    description: 'Single-user development or evaluation running directly in the browser via `npm run dev` or production build preview. All data stored in IndexedDB in the browser profile.',
    infrastructure: 'Node.js 20+, npm 9+, modern browser (Chrome/Firefox/Edge/Safari)',
    audience: ['architect', 'engineer', 'contractor', 'developer', 'qs', 'student', 'evaluator'],
    supportedModes: ['development', 'evaluation', 'professional-use', 'pilot-use'],
    limitations: [
      'Data bound to browser profile — not shared across devices',
      'IndexedDB storage limit varies by browser (typically 50–500 MB)',
      'No built-in backup — use project export for data portability',
    ],
  },
  {
    id: 'office-network',
    label: 'Office / Local-Network Deployment',
    description: 'Multi-user supervised deployment via static hosting on a local server or intranet. Each user runs their own browser instance. No server-side data aggregation.',
    infrastructure: 'Static file server (nginx, Apache, IIS) or Node.js preview server on local network',
    audience: ['architect', 'engineer', 'contractor', 'qs'],
    supportedModes: ['supervised-professional-use', 'pilot-use', 'evaluation'],
    limitations: [
      'No shared database — each browser has its own IndexedDB',
      'No user accounts, authentication, or multi-user sync',
      'Professional supervision required for team use',
      'All outputs require human review before external distribution',
    ],
  },
  {
    id: 'docker-hosted',
    label: 'On-Prem / Docker Deployment',
    description: 'Containerized deployment via Docker Compose with nginx. Suitable for internal team use, demo environments, or evaluation. Includes gzip compression and static caching.',
    infrastructure: 'Docker, Docker Compose. Runs nginx on port 8080 (configurable).',
    audience: ['architect', 'engineer', 'contractor', 'developer', 'evaluator'],
    supportedModes: ['supervised-professional-use', 'evaluation', 'pilot-use'],
    limitations: [
      'Same browser-isolated data model as other static deployments',
      'No cloud synchronization or centralized storage',
      'Not designed for high-availability or auto-scaling scenarios',
      'Professional supervision required for team use',
    ],
  },
  {
    id: 'static-hosting',
    label: 'Static Hosting (Vercel / Netlify / Cloudflare)',
    description: 'Production deployment on any static hosting platform. SPA routing fallback required. PWA support for offline use. Suitable for live demos, pilot rollouts, and professional use.',
    infrastructure: 'Vercel, Netlify, Cloudflare Pages, GitHub Pages, or any static host with SPA fallback',
    audience: ['architect', 'engineer', 'contractor', 'developer', 'evaluator'],
    supportedModes: ['professional-use', 'pilot-use', 'evaluation', 'demo'],
    limitations: [
      'Same local-first data model — no cloud database',
      'HTTPS recommended for PWA service worker registration',
      'No multi-user collaboration or sync capability',
      'All professional use requires licensed human professionals in the loop',
    ],
  },
];

export const USE_CONTEXTS: UseContext[] = [
  {
    id: 'solo-architect',
    label: 'Solo Architect / Designer',
    description: 'Individual architect using Budget Engineer for concept-to-design development, early-stage BOQ, and construction drawing support.',
    audience: ['architect'],
    suitableFor: ['Design development', 'Client presentations', 'Early cost advice', 'Drawing coordination'],
    notSuitableFor: ['Final structural design', 'Certified code compliance', 'Permit-set production without professional review'],
  },
  {
    id: 'small-firm',
    label: 'Small Engineering / Architecture Firm',
    description: 'Small practice using Budget Engineer for multi-disciplinary pre-design, procurement preparation, and project lifecycle tracking under professional supervision.',
    audience: ['architect', 'engineer', 'qs'],
    suitableFor: ['Pre-design coordination', 'BOQ and schedule preparation', 'Procurement support', 'Milestone tracking'],
    notSuitableFor: ['Multi-user real-time collaboration', 'Centralized project database', 'Automated code certification'],
  },
  {
    id: 'contractor-preconstruction',
    label: 'Contractor Preconstruction Team',
    description: 'Contractor team using Budget Engineer for early-stage cost advice, schedule planning, and procurement-linked delivery workflows.',
    audience: ['contractor', 'qs'],
    suitableFor: ['Early cost estimation', 'Tender preparation support', 'Construction programme planning', 'Subcontractor coordination'],
    notSuitableFor: ['Final tender pricing without QS review', 'Legal contractual documentation', 'Site management or progress payments'],
  },
  {
    id: 'developer-feasibility',
    label: 'Developer / Investor Feasibility',
    description: 'Developer evaluating project feasibility with rapid plan generation, cost estimation, and site analysis — before engaging full professional team.',
    audience: ['developer'],
    suitableFor: ['Feasibility studies', 'Concept comparison', 'Budget estimating', 'Site potential assessment'],
    notSuitableFor: ['Detailed design and construction documents', 'Final cost planning', 'Regulatory submissions'],
  },
  {
    id: 'educational',
    label: 'Educational / Academic Use',
    description: 'Architecture and engineering students learning the design-to-construction pipeline through hands-on project work.',
    audience: ['student'],
    suitableFor: ['Design studio projects', 'Construction technology coursework', 'Building science exploration', 'Portfolio development'],
    notSuitableFor: ['Professional practice', 'Real project documentation', 'Code compliance certification'],
  },
  {
    id: 'pilot-evaluation',
    label: 'Pilot Evaluation / Supervised Rollout',
    description: 'Organizations evaluating Budget Engineer for professional adoption. Uses validation reports, pilot-readiness assessment, and supervised-use guidance to determine fit.',
    audience: ['architect', 'engineer', 'contractor', 'developer', 'evaluator'],
    suitableFor: ['Capability assessment', 'Workflow compatibility testing', 'Supervised pilot projects', 'Rollout planning'],
    notSuitableFor: ['Unsupervised production use', 'Mission-critical project delivery without professional oversight'],
  },
];

export function getCapabilityGroup(id: CapabilityGroupId): CapabilityGroup | undefined {
  return CAPABILITY_GROUPS.find(g => g.id === id);
}

export function getCapabilitiesByMaturity(maturity: MaturityLevel): CapabilityGroup[] {
  return CAPABILITY_GROUPS.filter(g => g.maturity === maturity);
}

export function getCapabilitiesRequiringHumanReview(): CapabilityGroup[] {
  return CAPABILITY_GROUPS.filter(g => g.requiresHumanReview);
}

export function getDeploymentProfile(id: DeploymentMode): DeploymentProfile | undefined {
  return DEPLOYMENT_PROFILES.find(p => p.id === id);
}

export function getUseContext(id: string): UseContext | undefined {
  return USE_CONTEXTS.find(c => c.id === id);
}
