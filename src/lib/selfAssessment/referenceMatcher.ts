import type { ReferenceCase } from '@/lib/reference/referenceCaseModel';
import { getReferenceCases } from '@/lib/reference/referenceProjectPack';
import type { AssessedProjectSnapshot, MatchedReferenceCase } from './selfAssessmentModel';

interface MatchWeights {
  typology: number;
  storeyProfile: number;
  workflowScope: number;
}

const DEFAULT_WEIGHTS: MatchWeights = {
  typology: 40,
  storeyProfile: 25,
  workflowScope: 35,
};

function scoreTypologyMatch(snapshot: AssessedProjectSnapshot, refCase: ReferenceCase): number {
  if (snapshot.typology === refCase.typology) return 1;
  const related: Partial<Record<string, string[]>> = {
    house: ['villa', 'townhouse'],
    villa: ['house', 'duplex'],
    duplex: ['house', 'townhouse'],
    apartment: ['mixed-use'],
    'mixed-use': ['apartment', 'commercial-office', 'retail'],
    clinic: ['school'],
    school: ['clinic'],
  };
  const relatedTypes = related[snapshot.typology] ?? [];
  return relatedTypes.includes(refCase.typology) ? 0.5 : 0;
}

function scoreStoreyMatch(snapshot: AssessedProjectSnapshot, refCase: ReferenceCase): number {
  if (snapshot.storeyProfile === refCase.storeyProfile) return 1;
  const order = ['single-storey', 'two-storey', 'multi-storey-3-5', 'multi-storey-6-plus'];
  const snapIdx = order.indexOf(snapshot.storeyProfile);
  const refIdx = order.indexOf(refCase.storeyProfile);
  if (snapIdx === -1 || refIdx === -1) return 0;
  const diff = Math.abs(snapIdx - refIdx);
  if (diff === 1) return 0.6;
  if (diff === 2) return 0.3;
  return 0;
}

function scoreWorkflowMatch(snapshot: AssessedProjectSnapshot, refCase: ReferenceCase): number {
  if (snapshot.workflowScope.length === 0 || refCase.workflowScope.length === 0) return 0;
  const snapSet = new Set(snapshot.workflowScope);
  const matches = refCase.workflowScope.filter(w => snapSet.has(w)).length;
  const union = new Set([...snapshot.workflowScope, ...refCase.workflowScope]).size;
  return union > 0 ? matches / union : 0;
}

export function matchReferenceCases(
  snapshot: AssessedProjectSnapshot,
  weights: MatchWeights = DEFAULT_WEIGHTS,
  maxResults = 3
): MatchedReferenceCase[] {
  const cases = getReferenceCases();
  const scored: { refCase: ReferenceCase; score: number; reasons: string[]; gaps: string[]; strengths: string[] }[] = [];

  for (const refCase of cases) {
    const typScore = scoreTypologyMatch(snapshot, refCase);
    const storeyScore = scoreStoreyMatch(snapshot, refCase);
    const workflowScore = scoreWorkflowMatch(snapshot, refCase);
    const total = (typScore * weights.typology + storeyScore * weights.storeyProfile + workflowScore * weights.workflowScope) / 100;
    const score = Math.round(total * 100);

    const reasons: string[] = [];
    const gaps: string[] = [];
    const strengths: string[] = [];

    if (typScore >= 1) {
      strengths.push(`Typology "${snapshot.typology}" matches "${refCase.typology}"`);
      reasons.push('typology match');
    } else if (typScore > 0) {
      reasons.push('typology related');
      strengths.push(`Typology "${snapshot.typology}" is related to "${refCase.typology}"`);
    } else {
      gaps.push(`Typology "${snapshot.typology}" differs from "${refCase.typology}"`);
      reasons.push('typology mismatch');
    }

    if (storeyScore >= 1) {
      strengths.push(`Storey profile "${snapshot.storeyProfile}" matches`);
      reasons.push('storey match');
    } else if (storeyScore > 0) {
      reasons.push('storey near-match');
      strengths.push(`Storey profile "${snapshot.storeyProfile}" is close to "${refCase.storeyProfile}"`);
    } else {
      gaps.push(`Storey profile "${snapshot.storeyProfile}" differs from "${refCase.storeyProfile}"`);
      reasons.push('storey mismatch');
    }

    if (workflowScore > 0.5) {
      strengths.push(`${Math.round(workflowScore * 100)}% workflow scope overlap`);
      reasons.push('workflow overlap');
    } else if (workflowScore > 0) {
      reasons.push('partial workflow overlap');
    } else {
      gaps.push('No workflow scope overlap');
      reasons.push('no workflow overlap');
    }

    scored.push({ refCase, score, reasons, gaps, strengths });
  }

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, maxResults).map(s => ({
    caseId: s.refCase.id,
    caseName: s.refCase.name,
    similarityScore: s.score,
    typologyMatch: scoreTypologyMatch(snapshot, s.refCase) >= 1,
    storeyMatch: scoreStoreyMatch(snapshot, s.refCase) >= 1,
    workflowMatch: s.refCase.workflowScope.filter(w => snapshot.workflowScope.includes(w)).length,
    gaps: s.gaps,
    strengths: s.strengths,
  }));
}
