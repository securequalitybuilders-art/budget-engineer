import type { StoredAssessment } from '@/stores/selfAssessmentStore';
import type { AssessedProjectSnapshot } from './selfAssessmentModel';

export interface StaleCheckResult {
  isStale: boolean;
  changedFields: { field: string; from: string; to: string }[];
  recommendation: string;
}

export interface ComparisonDiff {
  field: string;
  before: string;
  after: string;
  changeType: 'improved' | 'declined' | 'changed' | 'added' | 'removed' | 'unchanged';
}

export interface AssessmentComparisonResult {
  beforeName: string;
  afterName: string;
  beforeDate: string;
  afterDate: string;
  tier: ComparisonDiff[];
  domains: ComparisonDiff[];
  risks: ComparisonDiff[];
  matchedCases: ComparisonDiff[];
  supervision: ComparisonDiff[];
  deployment: ComparisonDiff[];
}

export function checkStaleness(
  saved: AssessedProjectSnapshot,
  current: Partial<AssessedProjectSnapshot>
): StaleCheckResult {
  const changedFields: { field: string; from: string; to: string }[] = [];

  if (current.typology !== undefined && current.typology !== saved.typology) {
    changedFields.push({ field: 'Typology', from: saved.typology, to: current.typology });
  }
  if (current.storeyProfile !== undefined && current.storeyProfile !== saved.storeyProfile) {
    changedFields.push({ field: 'Storey Profile', from: saved.storeyProfile, to: current.storeyProfile });
  }
  if (current.workflowScope !== undefined) {
    const savedWf = [...saved.workflowScope].sort().join(',');
    const curWf = [...current.workflowScope].sort().join(',');
    if (savedWf !== curWf) {
      changedFields.push({ field: 'Workflow Scope', from: savedWf, to: curWf });
    }
  }
  if (current.projectName !== undefined && current.projectName !== saved.projectName) {
    changedFields.push({ field: 'Project Name', from: saved.projectName, to: current.projectName });
  }

  const isStale = changedFields.length > 0;
  const recommendation = isStale
    ? 'The project snapshot has changed since this assessment was created. Run a new assessment to reflect current project context.'
    : 'Assessment is current.';

  return { isStale, changedFields, recommendation };
}

function tierOrder(tier: string): number {
  const order: Record<string, number> = {
    'blocked': 0,
    'internal-only': 1,
    'supervised-professional': 2,
    'pilot-deployment': 3,
  };
  return order[tier] ?? -1;
}

export function compareAssessments(
  before: StoredAssessment,
  after: StoredAssessment
): AssessmentComparisonResult {
  const diffs: AssessmentComparisonResult = {
    beforeName: before.name,
    afterName: after.name,
    beforeDate: before.createdAt,
    afterDate: after.createdAt,
    tier: [],
    domains: [],
    risks: [],
    matchedCases: [],
    supervision: [],
    deployment: [],
  };

  const bTier = before.result.supervision.recommendedTier;
  const aTier = after.result.supervision.recommendedTier;
  if (bTier !== aTier) {
    const orderDiff = tierOrder(aTier) - tierOrder(bTier);
    diffs.tier.push({
      field: 'Readiness Tier',
      before: bTier,
      after: aTier,
      changeType: orderDiff > 0 ? 'improved' : 'declined',
    });
  }

  const bDomains = before.result.domainRatings;
  const aDomains = after.result.domainRatings;
  for (const aDom of aDomains) {
    const bDom = bDomains.find(d => d.domain === aDom.domain);
    if (!bDom) {
      diffs.domains.push({ field: aDom.domain, before: '—', after: aDom.rating, changeType: 'added' });
    } else if (bDom.rating !== aDom.rating) {
      const order = ['not-rated', 'weak', 'adequate', 'strong'];
      const isBetter = order.indexOf(aDom.rating) > order.indexOf(bDom.rating);
      diffs.domains.push({
        field: aDom.domain,
        before: bDom.rating,
        after: aDom.rating,
        changeType: isBetter ? 'improved' : 'declined',
      });
    }
  }
  for (const bDom of bDomains) {
    if (!aDomains.find(d => d.domain === bDom.domain)) {
      diffs.domains.push({ field: bDom.domain, before: bDom.rating, after: '—', changeType: 'removed' });
    }
  }

  const bRiskAreas = before.result.risks.map(r => r.area);
  const aRiskAreas = after.result.risks.map(r => r.area);
  for (const aRisk of after.result.risks) {
    if (!bRiskAreas.includes(aRisk.area)) {
      diffs.risks.push({ field: aRisk.area, before: '—', after: `${aRisk.impact}`, changeType: 'added' });
    }
  }
  for (const bRisk of before.result.risks) {
    if (!aRiskAreas.includes(bRisk.area)) {
      diffs.risks.push({ field: bRisk.area, before: `${bRisk.impact}`, after: '—', changeType: 'removed' });
    }
  }

  const bCases = before.result.matchedCases;
  const aCases = after.result.matchedCases;
  for (const aMc of aCases) {
    const bMc = bCases.find(m => m.caseId === aMc.caseId);
    if (!bMc) {
      diffs.matchedCases.push({ field: aMc.caseName, before: '—', after: `${aMc.similarityScore}%`, changeType: 'added' });
    } else if (bMc.similarityScore !== aMc.similarityScore) {
      diffs.matchedCases.push({
        field: aMc.caseName,
        before: `${bMc.similarityScore}%`,
        after: `${aMc.similarityScore}%`,
        changeType: aMc.similarityScore > bMc.similarityScore ? 'improved' : 'declined',
      });
    }
  }
  for (const bMc of bCases) {
    if (!aCases.find(m => m.caseId === bMc.caseId)) {
      diffs.matchedCases.push({ field: bMc.caseName, before: `${bMc.similarityScore}%`, after: '—', changeType: 'removed' });
    }
  }

  const bReq = before.result.supervision.supervisionRequirements;
  const aReq = after.result.supervision.supervisionRequirements;
  if (bReq.length !== aReq.length) {
    diffs.supervision.push({
      field: 'Supervision Requirements',
      before: `${bReq.length} item(s)`,
      after: `${aReq.length} item(s)`,
      changeType: aReq.length > bReq.length ? 'declined' : 'improved',
    });
  }

  const bRec = before.result.deploymentContext.recommendedFor;
  const aRec = after.result.deploymentContext.recommendedFor;
  if (bRec.length !== aRec.length) {
    diffs.deployment.push({
      field: 'Recommended For',
      before: `${bRec.length} item(s)`,
      after: `${aRec.length} item(s)`,
      changeType: aRec.length > bRec.length ? 'improved' : 'declined',
    });
  }

  const bNot = before.result.deploymentContext.notRecommendedFor;
  const aNot = after.result.deploymentContext.notRecommendedFor;
  if (bNot.length !== aNot.length) {
    diffs.deployment.push({
      field: 'Not Recommended For',
      before: `${bNot.length} item(s)`,
      after: `${aNot.length} item(s)`,
      changeType: aNot.length > bNot.length ? 'declined' : 'improved',
    });
  }

  return diffs;
}
