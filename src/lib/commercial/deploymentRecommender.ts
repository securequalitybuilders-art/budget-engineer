import { DEPLOYMENT_PROFILES } from './productPackagingModel';
import type { DeploymentMode, AudienceProfile } from './productPackagingModel';

export interface DeploymentRecommendation {
  recommendedProfile: DeploymentMode;
  alternativeProfiles: DeploymentMode[];
  rationale: string;
  supervisionLevel: 'unsupervised' | 'supervised-professional' | 'pilot-evaluation';
  constraints: string[];
}

const AUDIENCE_TO_PRIMARY_PROFILE: Record<AudienceProfile, DeploymentMode> = {
  student: 'local-workstation',
  evaluator: 'local-workstation',
  developer: 'static-hosting',
  architect: 'office-network',
  engineer: 'office-network',
  contractor: 'office-network',
  qs: 'office-network',
};

export function recommendDeployment(audiences: AudienceProfile[], teamSize: number, hasDocker: boolean, hasStaticHost: boolean): DeploymentRecommendation {
  const primary = audiences.length === 1
    ? AUDIENCE_TO_PRIMARY_PROFILE[audiences[0]]
    : teamSize <= 3 ? 'local-workstation' : 'office-network';

  const alternatives: DeploymentMode[] = [];
  if (hasDocker) alternatives.push('docker-hosted');
  if (hasStaticHost || primary === 'static-hosting') alternatives.push('static-hosting');
  if (primary !== 'local-workstation') alternatives.push('local-workstation');
  if (primary !== 'office-network') alternatives.push('office-network');

  const hasEvaluator = audiences.includes('evaluator');
  const hasStudent = audiences.includes('student');
  const isProfessional = (['architect', 'engineer', 'contractor', 'qs'] as AudienceProfile[]).some(a => audiences.includes(a));

  let supervisionLevel: 'unsupervised' | 'supervised-professional' | 'pilot-evaluation';
  let rationale: string;

  if (hasStudent) {
    supervisionLevel = 'unsupervised';
    rationale = 'Student/evaluation use on local workstation. No professional outputs expected.';
  } else if (hasEvaluator && !isProfessional) {
    supervisionLevel = 'pilot-evaluation';
    rationale = 'Evaluation context with no professional deliverables. Supervised pilot mode recommended.';
  } else if (isProfessional && teamSize > 1) {
    supervisionLevel = 'supervised-professional';
    rationale = `Professional team (${teamSize} users) requires supervised deployment with human review in the loop.`;
  } else if (isProfessional) {
    supervisionLevel = 'supervised-professional';
    rationale = 'Solo professional use requires supervised deployment with human review.';
  } else {
    supervisionLevel = 'pilot-evaluation';
    rationale = 'Mixed audience. Recommend pilot evaluation before professional deployment.';
  }

  const constraints: string[] = [
    'All outputs require licensed professional review before use in real projects.',
    'No multi-user sync — each browser has its own IndexedDB database.',
    'Data is bound to the browser profile — export projects for backup.',
    'No cloud storage, no telemetry, no automatic backups.',
  ];

  if (teamSize > 1) {
    constraints.push('Team coordination requires manual project export/import between users.');
  }

  const profile = DEPLOYMENT_PROFILES.find(p => p.id === primary);
  if (profile) {
    constraints.push(...profile.limitations);
  }

  return {
    recommendedProfile: primary,
    alternativeProfiles: alternatives.slice(0, 3),
    rationale,
    supervisionLevel,
    constraints: [...new Set(constraints)],
  };
}

export function formatRecommendationHtml(rec: DeploymentRecommendation): string {
  const profile = DEPLOYMENT_PROFILES.find(p => p.id === rec.recommendedProfile);
  const superBadge = rec.supervisionLevel === 'supervised-professional' ? 'Supervised Professional' :
    rec.supervisionLevel === 'pilot-evaluation' ? 'Pilot Evaluation' : 'Unsupervised';
  const superColor = rec.supervisionLevel === 'supervised-professional' ? '#6366f1' :
    rec.supervisionLevel === 'pilot-evaluation' ? '#f59e0b' : '#22c55e';

  let html = `<h2>Deployment Recommendation</h2>
<div style="display:flex;align-items:center;gap:8px;margin:8px 0">
<strong style="font-size:11px">Recommended: ${profile?.label ?? rec.recommendedProfile}</strong>
<span style="background:${superColor}20;color:${superColor};border:1px solid ${superColor}40;border-radius:4px;padding:2px 8px;font-size:9px;font-weight:600">${superBadge}</span>
</div>
<p style="font-size:10px;color:#555">${rec.rationale}</p>`;

  if (rec.alternativeProfiles.length > 0) {
    html += `<p style="font-size:9px;color:#888"><strong>Alternatives:</strong> ${rec.alternativeProfiles.map(id => DEPLOYMENT_PROFILES.find(p => p.id === id)?.label ?? id).join(', ')}</p>`;
  }

  html += `<h3>Constraints</h3><ul style="margin:4px 0;padding-left:16px">`;
  for (const c of rec.constraints) {
    html += `<li style="font-size:9px;color:#c62828">${c}</li>`;
  }
  html += `</ul>`;

  return html;
}
