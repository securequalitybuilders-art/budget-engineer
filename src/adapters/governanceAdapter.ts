import type { DesignOption } from '@/domain/boq';
import type { ProjectTransaction } from '@/types';

export interface GovernanceChecklistItem {
  label: string;
  satisfied: boolean;
  description: string;
}

export interface GovernanceRoleDescription {
  role: string;
  description: string;
}

export interface GovernanceSummary {
  status: 'draft' | 'ready_for_review' | 'reviewed' | 'exported';
  checklistItems: GovernanceChecklistItem[];
  roleDescriptions: GovernanceRoleDescription[];
  fingerprint: string | null;
  generatedAt: string | null;
  lastSaved: string | null;
  snapshotCount: number;
  recentTransactions: ProjectTransaction[];
  recommendations: string[];
  warnings: string[];
}

interface GovernanceInput {
  selectedDesign?: DesignOption | null;
  hasBim?: boolean;
  hasBoq?: boolean;
  hasAnalysis?: boolean;
  transactions?: ProjectTransaction[];
  projectCreatedAt?: string;
  projectUpdatedAt?: string;
}

function simpleFingerprint(design: DesignOption): string {
  const parts = [
    design.id,
    design.name,
    design.grossFloorArea.toFixed(2),
    String(design.floors),
    String(design.elements.length),
    design.elements.map((e) => `${e.type}:${e.quantity}`).sort().join(';'),
  ];
  let hash = 5381;
  const s = parts.join('|');
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) + hash) ^ s.charCodeAt(i);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function buildGovernanceSummary(input: GovernanceInput): GovernanceSummary {
  const {
    selectedDesign,
    hasBim,
    hasBoq,
    hasAnalysis,
    transactions = [],
    projectCreatedAt,
    projectUpdatedAt,
  } = input;

  const hasDesign = !!selectedDesign;

  const checklistItems: GovernanceChecklistItem[] = [
    { label: 'Design option generated', satisfied: hasDesign, description: 'At least one design option exists from the AI brief.' },
    { label: '2D plan available', satisfied: hasDesign, description: '2D floor plan canvas is populated.' },
    { label: '3D BIM available', satisfied: !!hasBim, description: '3D BIM model has been generated.' },
    { label: 'Engineering analysis available', satisfied: !!hasAnalysis, description: 'Engineering analysis has been run.' },
    { label: 'BOQ generated', satisfied: !!hasBoq, description: 'Bill of quantities has been costed.' },
    { label: 'Export available', satisfied: !!hasBoq, description: 'BOQ export (CSV/HTML/Print) is ready.' },
    { label: 'Professional review required', satisfied: false, description: 'For final construction, consult a registered architect, engineer, and quantity surveyor.' },
  ];

  const satisfiedCount = checklistItems.filter((i) => i.satisfied).length;

  let status: GovernanceSummary['status'] = 'draft';
  if (satisfiedCount >= 5) status = 'ready_for_review';
  if (satisfiedCount >= 6) status = 'reviewed';
  if (transactions.some((t) => t.action === 'EXPORT')) status = 'exported';

  const roleDescriptions: GovernanceRoleDescription[] = [
    { role: 'Owner', description: 'Can generate designs, edit, export, and manage the project.' },
    { role: 'Reviewer', description: 'Can review designs and export documents.' },
    { role: 'Viewer', description: 'Can view project data only. No edits or exports.' },
  ];

  const fingerprint = hasDesign ? simpleFingerprint(selectedDesign) : null;

  const recentTransactions = transactions.slice(0, 5);

  const recommendations: string[] = [];
  if (!hasDesign) recommendations.push('Start by generating a design option from the AI Brief panel.');
  if (hasDesign && !hasBim) recommendations.push('Switch to 3D BIM view to generate the BIM model.');
  if (hasDesign && !hasBoq) recommendations.push('Generate a BOQ to see cost estimates.');
  if (hasDesign && !hasAnalysis) recommendations.push('Run engineering analysis for structural insights.');

  const warnings: string[] = [];
  if (hasDesign) {
    warnings.push('This is a local demo. No real authentication or backend is attached.');
    warnings.push('Always consult a registered professional for final construction.');
  }

  return {
    status,
    checklistItems,
    roleDescriptions,
    fingerprint,
    generatedAt: projectCreatedAt ?? null,
    lastSaved: projectUpdatedAt ?? null,
    snapshotCount: 0,
    recentTransactions,
    recommendations,
    warnings,
  };
}
