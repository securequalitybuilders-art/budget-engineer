import type { ValidationDomain, ValidationResult, ValidationReport } from '@/lib/validation/validationEngine';
import { getBenchmarks, generateValidationReport, getKnownWeaknesses } from '@/lib/validation/validationEngine';
import { assessPilotReadiness } from '@/lib/validation/pilotReadinessEvaluator';
import type { PilotReadinessReport } from '@/lib/validation/pilotReadinessEvaluator';
import { getReferenceCases, getReferenceCaseById } from '@/lib/reference/referenceProjectPack';
import { matchReferenceCases } from './referenceMatcher';
import type {
  AssessedProjectSnapshot,
  SelfAssessedDomainRating,
  SelfAssessmentResult,
  SelfAssessmentSupervisionSummary,
  SelfAssessmentRiskArea,
  SelfAssessmentDeploymentContext,
} from './selfAssessmentModel';

function buildDomainRatings(
  _snapshot: AssessedProjectSnapshot,
  validationReport: ValidationReport
): SelfAssessedDomainRating[] {
  const allDomains: ValidationDomain[] = [
    'geometry-validity',
    'programme-layout-validity',
    'drawing-documentation-completeness',
    'package-completeness',
    'boq-procurement-linkage-integrity',
    'lifecycle-workflow-continuity',
    'export-import-integrity',
    'human-review-required',
  ];

  return allDomains.map(domain => {
    const result = validationReport.validationResults.find(r => r.domain === domain);
    const scorecard = validationReport.scorecards.find(s => {
      const bm = getBenchmarks().find(b => b.id === s.benchmarkId);
      return bm?.domains.includes(domain);
    });

    const status = result?.status ?? 'not-applicable';

    let rating: SelfAssessedDomainRating['rating'];
    let reason: string;
    let calibration: SelfAssessedDomainRating['calibration'];

    if (status === 'fail') {
      rating = 'weak';
      reason = result?.reason ?? 'Validation check failed';
      calibration = 'unverified-before-construction';
    } else if (status === 'warning') {
      rating = 'adequate';
      reason = result?.reason ?? 'Passed with warnings';
      calibration = 'heuristic-output';
    } else if (status === 'pass') {
      const score = scorecard?.overallScore ?? 100;
      if (score >= 80) {
        rating = 'strong';
        reason = `Score ${score}% — meets benchmark targets`;
        calibration = 'confirmed-behavior';
      } else {
        rating = 'adequate';
        reason = `Score ${score}% — within tolerance but below optimal`;
        calibration = 'heuristic-output';
      }
    } else {
      rating = 'not-rated';
      reason = 'No validation data for this domain';
      calibration = 'assumed-value';
    }

    return { domain, rating, status, reason, calibration };
  });
}

function buildSupervisionSummary(
  snapshot: AssessedProjectSnapshot,
  _validationReport: ValidationReport,
  pilotReport: PilotReadinessReport
): SelfAssessmentSupervisionSummary {
  const refCase = getReferenceCases().find(
    c => c.typology === snapshot.typology
  );

  const supervisionRequirements: string[] = [];
  if (pilotReport.reviewRequirements.length > 0) {
    supervisionRequirements.push(...pilotReport.reviewRequirements);
  }
  if (refCase) {
    for (const req of refCase.pilotReadiness.supervisionRequirements) {
      if (!supervisionRequirements.includes(req)) {
        supervisionRequirements.push(req);
      }
    }
  }

  const mandatoryReviewAreas: string[] = [];
  if (refCase) {
    for (const area of refCase.humanReviewAreas) {
      if (area.severity === 'mandatory') {
        mandatoryReviewAreas.push(area.area);
      }
    }
  }

  return {
    recommendedTier: pilotReport.tier,
    tierLabel: pilotReport.label,
    tierDescription: pilotReport.description,
    rationale: pilotReport.reason,
    supervisionRequirements,
    humanReviewCount: pilotReport.reviewRequirements.length + mandatoryReviewAreas.length,
    mandatoryReviewAreas,
  };
}

function buildRisks(
  _snapshot: AssessedProjectSnapshot,
  validationReport: ValidationReport,
  pilotReport: PilotReadinessReport
): SelfAssessmentRiskArea[] {
  const risks: SelfAssessmentRiskArea[] = [];

  for (const b of pilotReport.blockers) {
    risks.push({
      area: b.split(']')[0]?.replace('[', '') ?? 'Unknown',
      description: b,
      impact: 'high',
      calibration: 'unverified-before-construction',
      recommendation: 'Resolve blocker before proceeding. Professional review required.',
    });
  }

  for (const w of pilotReport.warnings) {
    risks.push({
      area: w.split(']')[0]?.replace('[', '') ?? 'Unknown',
      description: w,
      impact: 'medium',
      calibration: 'heuristic-output',
      recommendation: 'Review warning and confirm applicability to project context.',
    });
  }

  for (const weakness of validationReport.weaknesses) {
    if (weakness.status === 'open') {
      risks.push({
        area: weakness.area,
        description: weakness.description,
        impact: weakness.impact as 'low' | 'medium' | 'high',
        calibration: 'assumed-value',
        recommendation: weakness.mitigation,
      });
    }
  }

  return risks;
}

function buildDeploymentContext(
  snapshot: AssessedProjectSnapshot,
  pilotReport: PilotReadinessReport
): SelfAssessmentDeploymentContext {
  const matched = matchReferenceCases(snapshot, undefined, 3);

  const recommendedFor: string[] = [];
  const notRecommendedFor: string[] = [];

  if (pilotReport.tier === 'pilot-deployment' || pilotReport.tier === 'supervised-professional') {
    recommendedFor.push(`Internal capability assessment for "${snapshot.typology}" projects`);
    recommendedFor.push('Professional review preparation and gap analysis');
    recommendedFor.push('Supervisor-guided project planning and documentation review');
  } else if (pilotReport.tier === 'internal-only') {
    recommendedFor.push('Internal team training and workflow familiarization');
    recommendedFor.push('Pre-design exploration and what-if analysis');
  }

  if (pilotReport.tier === 'blocked') {
    notRecommendedFor.push('Any real project use until blockers are resolved');
  }

  for (const mc of matched) {
    const refCase = getReferenceCaseById(mc.caseId);
    if (refCase && mc.similarityScore < 50) {
      notRecommendedFor.push(`Direct application of "${refCase.name}" assumptions to this project`);
    }
  }

  if (matched.length === 0 || matched[0].similarityScore < 30) {
    notRecommendedFor.push('Using reference case outputs without professional adjustment');
  }

  const limitations: string[] = [];
  for (const mc of matched) {
    for (const gap of mc.gaps) {
      limitations.push(gap);
    }
  }

  return { recommendedFor, notRecommendedFor, limitations };
}

export function runSelfAssessment(snapshot: AssessedProjectSnapshot): SelfAssessmentResult {
  const matched = matchReferenceCases(snapshot);

  const scorecards = getBenchmarks().map(bm => ({
    id: `sa-${bm.id}-${Date.now()}`,
    benchmarkId: bm.id,
    benchmarkName: bm.name,
    category: bm.category,
    metrics: [],
    overallScore: 80,
    overallAcceptance: 'pass' as const,
    calibratedAt: new Date().toISOString(),
    notes: `Self-assessment placeholder for "${snapshot.projectName}"`,
  }));

  const validationResults: ValidationResult[] = matched.flatMap(mc => {
    const refCase = getReferenceCaseById(mc.caseId);
    if (!refCase) return [];
    return refCase.validationLinks.map(link => ({
      domain: link.domain,
      status: link.expectedOutcome.startsWith('Pass') ? 'pass' as const : 'warning' as const,
      reason: link.expectedOutcome,
      details: [`Based on reference case "${refCase.name}"`],
      requiresHumanReview: link.domain === 'human-review-required',
      humanReviewNote: link.domain === 'human-review-required' ? `Reference case indicates: ${link.expectedOutcome}` : undefined,
    }));
  });

  if (validationResults.length === 0) {
    for (const domain of [
      'geometry-validity',
      'programme-layout-validity',
      'drawing-documentation-completeness',
      'package-completeness',
    ] as ValidationDomain[]) {
      validationResults.push({
        domain,
        status: 'not-applicable',
        reason: 'No matching reference case for this domain',
        details: ['Self-assessment requires matched reference cases for domain coverage'],
        requiresHumanReview: false,
      });
    }
  }

  const weaknesses = getKnownWeaknesses();
  const validationReport = generateValidationReport(scorecards, [], weaknesses, validationResults);
  const pilotReport = assessPilotReadiness(validationReport);

  const domainRatings = buildDomainRatings(snapshot, validationReport);
  const supervision = buildSupervisionSummary(snapshot, validationReport, pilotReport);
  const risks = buildRisks(snapshot, validationReport, pilotReport);
  const deploymentContext = buildDeploymentContext(snapshot, pilotReport);

  return {
    snapshot,
    domainRatings,
    matchedCases: matched,
    supervision,
    risks,
    deploymentContext,
    generatedAt: new Date().toISOString(),
  };
}
