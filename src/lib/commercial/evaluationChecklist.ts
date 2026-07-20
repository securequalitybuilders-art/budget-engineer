import { CAPABILITY_GROUPS } from './productPackagingModel';
import type { CapabilityGroupId } from './productPackagingModel';

export interface EvaluationChecklistItem {
  id: string;
  category: string;
  label: string;
  description: string;
  verificationMethod: string;
  relatedCapability: CapabilityGroupId | null;
}

export interface PilotRolloutStep {
  id: string;
  phase: string;
  label: string;
  description: string;
  dependsOn: string[];
  estimatedEffort: string;
}

export const EVALUATION_CHECKLIST: EvaluationChecklistItem[] = [
  { id: 'eval-1', category: 'Setup & Deployment', label: 'Verify deployment mode', description: 'Confirm the intended deployment mode (local workstation, office network, Docker, static hosting) and verify it works.', verificationMethod: 'Follow DEPLOYMENT_GUIDE.md for chosen mode', relatedCapability: null },
  { id: 'eval-2', category: 'Setup & Deployment', label: 'Confirm PWA offline operation', description: 'Verify the app loads and functions without network after first visit.', verificationMethod: 'Build, serve, open DevTools > Application > Service Workers > Offline, reload', relatedCapability: null },
  { id: 'eval-3', category: 'Setup & Deployment', label: 'Verify SPA routing fallback', description: 'Ensure all routes resolve correctly on the deployed platform.', verificationMethod: 'Navigate to /project/123, /academy, /portfolio. Verify no 404.', relatedCapability: null },
  { id: 'eval-4', category: 'Design Pipeline', label: 'Test AI brief-to-plan generation', description: 'Create a project via Project Wizard with a building type and verify plan output.', verificationMethod: 'Create project, go through brief stage, verify rooms/walls generated', relatedCapability: 'design-pipeline' },
  { id: 'eval-5', category: 'Design Pipeline', label: 'Test multi-storey planning', description: 'Add a second floor and verify floor-specific plan.', verificationMethod: 'Add floor in stage rail, switch floors, verify unique geometry', relatedCapability: 'design-pipeline' },
  { id: 'eval-6', category: 'CAD Editing', label: 'Test room editing', description: 'Add, move, resize, and delete rooms on the CAD canvas.', verificationMethod: 'Use CAD toolbar, verify changes render correctly', relatedCapability: 'cad-editing' },
  { id: 'eval-7', category: 'CAD Editing', label: 'Test undo/redo', description: 'Make several edits, undo, redo, verify state restores correctly.', verificationMethod: 'CTRL+Z / CTRL+SHIFT+Z multiple times', relatedCapability: 'cad-editing' },
  { id: 'eval-8', category: '3D BIM', label: 'Test 3D viewer', description: 'Toggle to 3D view and verify geometry renders.', verificationMethod: 'Click 3D toggle, verify walls/floors/roof appear', relatedCapability: 'bim-viewing' },
  { id: 'eval-9', category: '3D BIM', label: 'Test dollhouse/walkthrough', description: 'Explore dollhouse cutaway and first-person walkthrough.', verificationMethod: 'Toggle views, WASD walk in 3D mode', relatedCapability: 'bim-viewing' },
  { id: 'eval-10', category: 'Construction Drawings', label: 'Generate all 11 drawing types', description: 'Open Drawings panel and generate each drawing type.', verificationMethod: 'Verify SVG renders for each drawing type', relatedCapability: 'construction-drawings' },
  { id: 'eval-11', category: 'Construction Drawings', label: 'Test PDF/PNG export', description: 'Export a drawing to PDF and PNG.', verificationMethod: 'Open drawing, click export, verify file downloads', relatedCapability: 'construction-drawings' },
  { id: 'eval-12', category: 'DXF Pipeline', label: 'Test DXF export', description: 'Export to DXF and verify file output.', verificationMethod: 'Export DXF, open in CAD viewer or text editor to verify structure', relatedCapability: 'dxf-pipeline' },
  { id: 'eval-13', category: 'BOQ & Cost', label: 'Test BOQ generation', description: 'Navigate to Cost & Deliver stage and verify BOQ data appears.', verificationMethod: 'Check BOQ panel for quantity line items with regional pricing', relatedCapability: 'boq-cost-estimation' },
  { id: 'eval-14', category: 'BOQ & Cost', label: 'Test regional rate switching', description: 'Switch between Zimbabwe, South Africa, Kenya, and Global rate cards.', verificationMethod: 'Verify unit rates update per region', relatedCapability: 'boq-cost-estimation' },
  { id: 'eval-15', category: 'BOQ & Cost', label: 'Test CSV/HTML/PDF export', description: 'Export BOQ in all supported formats.', verificationMethod: 'Verify each file downloads with correct content', relatedCapability: 'boq-cost-estimation' },
  { id: 'eval-16', category: 'BOQ & Cost', label: 'Test Gantt and cashflow', description: 'Open programme and cashflow views.', verificationMethod: 'Verify Gantt renders and cashflow chart displays', relatedCapability: 'boq-cost-estimation' },
  { id: 'eval-17', category: 'Code Compliance', label: 'Test jurisdiction switching', description: 'Switch between ZBC, SANS 10400, Zambia, Botswana compliance rules.', verificationMethod: 'Run compliance check, verify rules match selected jurisdiction', relatedCapability: 'code-compliance' },
  { id: 'eval-18', category: 'Export/Import', label: 'Test project export and import', description: 'Export project as ZIP, delete project, import it back.', verificationMethod: 'Verify all project data restores correctly', relatedCapability: 'package-export' },
  { id: 'eval-19', category: 'Lifecycle', label: 'Test status transitions', description: 'Move project through lifecycle stages and verify status changes.', verificationMethod: 'Change status, verify dashboard updates', relatedCapability: 'lifecycle-workflow' },
  { id: 'eval-20', category: 'Validation', label: 'Check pilot readiness assessment', description: 'Run validation and view pilot readiness tier.', verificationMethod: 'Open validation panel, verify tier and reason displayed', relatedCapability: 'validation-pilot' },
  { id: 'eval-21', category: 'Diagnostics', label: 'Verify diagnostics panel', description: 'Open diagnostics panel (Ctrl+Shift+D) and verify build info and log.', verificationMethod: 'Check build version, time, and error log display', relatedCapability: null },
];

export const PILOT_ROLLOUT_STEPS: PilotRolloutStep[] = [
  { id: 'pilot-1', phase: 'Preparation', label: 'Define evaluation scope', description: 'Identify which workflows, building types, and team members will participate in the pilot.', dependsOn: [], estimatedEffort: '1–2 days' },
  { id: 'pilot-2', phase: 'Preparation', label: 'Choose deployment mode', description: 'Select local workstation, office network, Docker, or static hosting based on team size and infrastructure.', dependsOn: ['pilot-1'], estimatedEffort: '0.5–1 day' },
  { id: 'pilot-3', phase: 'Preparation', label: 'Install and verify deployment', description: 'Follow DEPLOYMENT_GUIDE.md to set up the chosen deployment mode. Verify all team members can access.', dependsOn: ['pilot-2'], estimatedEffort: '1 day' },
  { id: 'pilot-4', phase: 'Preparation', label: 'Review validation report', description: 'Run validation benchmarks and review the pilot-readiness assessment. Understand current capability maturity and limitations.', dependsOn: ['pilot-3'], estimatedEffort: '0.5 day' },
  { id: 'pilot-5', phase: 'Onboarding', label: 'Team orientation', description: 'Brief team on Budget Engineer capabilities, human-review requirements, and supervised-use expectations.', dependsOn: ['pilot-4'], estimatedEffort: '0.5 day' },
  { id: 'pilot-6', phase: 'Onboarding', label: 'Start with reference project', description: 'Use a known reference project to validate workflow fit and output quality before using on live work.', dependsOn: ['pilot-5'], estimatedEffort: '1–2 days' },
  { id: 'pilot-7', phase: 'Execution', label: 'Run supervised pilot projects', description: 'Apply on 1–3 real or simulation projects with professional supervision. Document findings.', dependsOn: ['pilot-6'], estimatedEffort: '1–4 weeks' },
  { id: 'pilot-8', phase: 'Execution', label: 'Collect feedback and issues', description: 'Track issues, workflow gaps, and quality observations per capability group.', dependsOn: ['pilot-7'], estimatedEffort: 'Ongoing' },
  { id: 'pilot-9', phase: 'Evaluation', label: 'Review pilot outcomes', description: 'Compare against evaluation checklist. Determine which capability groups meet quality thresholds for broader use.', dependsOn: ['pilot-8'], estimatedEffort: '1–2 days' },
  { id: 'pilot-10', phase: 'Evaluation', label: 'Make rollout decision', description: 'Based on pilot outcomes, decide: expand to more projects, extend pilot, or pause adoption. Document reasoning.', dependsOn: ['pilot-9'], estimatedEffort: '0.5 day' },
];

export function formatChecklistHtml(checklistState: Record<string, { checked: boolean; notes: string }>): string {
  const total = EVALUATION_CHECKLIST.length;
  const checked = Object.values(checklistState).filter(s => s.checked).length;
  const pct = total > 0 ? Math.round((checked / total) * 100) : 0;

  let html = `<h2>Evaluation Checklist</h2>
<p style="font-size:10px;color:#555">${checked}/${total} items completed (${pct}%).</p>
<table>
<thead><tr><th style="width:30px">Done</th><th>Category</th><th>Item</th><th>Notes</th></tr></thead><tbody>`;

  for (const item of EVALUATION_CHECKLIST) {
    const state = checklistState[item.id];
    const done = state?.checked ?? false;
    const notes = state?.notes ?? '';
    html += `<tr>
<td style="text-align:center">${done ? '✓' : '—'}</td>
<td><span style="font-size:8px;color:#888">${item.category}</span></td>
<td><strong>${item.label}</strong><br><span style="font-size:8px;color:#888">${item.description}</span></td>
<td style="font-size:8px;color:#888">${notes || '—'}</td>
</tr>`;
  }

  html += `</tbody></table>`;
  return html;
}

export function formatSupervisedGuidanceHtml(): string {
  const guidance = getSupervisedUseGuidance();
  const lines = guidance.split('\n');
  let html = `<h2>Supervised Professional Use Guidelines</h2>`;

  for (const line of lines) {
    if (line.startsWith('# ')) continue;
    if (line.startsWith('## ')) {
      html += `<h3>${line.replace('## ', '')}</h3>`;
    } else if (line.startsWith('- **')) {
      const match = line.match(/- \*\*(.+?)\*\*: (.+)/);
      if (match) {
        html += `<li style="font-size:9px;margin:2px 0"><strong>${match[1]}:</strong> ${match[2]}</li>`;
      } else {
        html += `<li style="font-size:9px">${line.replace('- ', '')}</li>`;
      }
    } else if (line.match(/^\d+\./)) {
      html += `<li style="font-size:9px;margin:2px 0">${line.replace(/^\d+\.\s*/, '')}</li>`;
    } else if (line.trim()) {
      html += `<p style="font-size:10px;color:#555">${line}</p>`;
    }
  }

  return html;
}

export function formatPilotRolloutHtml(): string {
  let html = `<h2>Pilot Rollout Plan</h2>`;
  const phases = ['Preparation', 'Onboarding', 'Execution', 'Evaluation'] as const;

  for (const phase of phases) {
    const steps = PILOT_ROLLOUT_STEPS.filter(s => s.phase === phase);
    if (steps.length === 0) continue;
    html += `<h3>${phase}</h3><ul style="margin:4px 0;padding-left:16px">`;
    for (const step of steps) {
      html += `<li style="font-size:9px;margin:2px 0"><strong>${step.label}</strong> (${step.estimatedEffort}): ${step.description}</li>`;
    }
    html += `</ul>`;
  }

  return html;
}

export function getSupervisedUseGuidance(): string {
  return `# Supervised Professional Use Guidelines

## What Supervised Use Means

Supervised professional use means that all Budget Engineer outputs must be reviewed, verified, and signed off by a qualified human professional before being used for any real-world decision, submission, or construction activity.

## Required Human Review Areas

The following capability groups produce outputs that require professional review:

${CAPABILITY_GROUPS.filter(g => g.requiresHumanReview).map(g => `- **${g.label}**: ${g.humanReviewNote || 'Professional review required.'}`).join('\n')}

## Operational Boundaries

1. **No automated signoff**: Budget Engineer does not and cannot provide certified professional signoff for any discipline.
2. **No code compliance certification**: Compliance checks are approximate and advisory only.
3. **No structural certification**: All engineering calculations are preliminary.
4. **No multi-user sync**: The platform is local-first. Team coordination uses project export/import.
5. **Data responsibility**: Users are responsible for backing up their own data via project export.

## Recommended Supervision Process

1. Professional reviews all generated outputs before use.
2. Outputs are clearly marked as "DRAFT — PROFESSIONAL REVIEW REQUIRED" when exported.
3. Human-review-required flags in capability manifests are respected.
4. A registered professional provides final signoff for each discipline's deliverables.
5. Pilot-readiness assessments are consulted before expanding use to new workflows.`;
}
