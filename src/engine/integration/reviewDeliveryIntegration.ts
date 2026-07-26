import type { ReviewReport, ReviewDecision } from '@/engine/review/reviewEngine';
import type { DeliveryProject, ReleasePackage, IssueState, PackageType } from '@/domain/delivery';
import { issuePackage, reviseSheet } from '@/engine/delivery/deliveryWorkflowEngine';

export interface ReviewDeliveryResult {
  delivery: DeliveryProject;
  packageNotes: string;
  updatedPackage: ReleasePackage | null;
}

const ISSUE_STATE_AFTER_REVIEW: Record<ReviewDecision, IssueState | null> = {
  'pass': 'for-construction',
  'conditional-pass': 'for-construction',
  'revise': 'in-progress',
  'fail': 'draft',
};

const ISSUE_STATE_BEFORE_REVIEW: IssueState = 'for-review';

function shouldPackageBeIssued(reviewDecision: ReviewDecision): boolean {
  return reviewDecision === 'pass' || reviewDecision === 'conditional-pass';
}

function shouldPackageBeRevised(reviewDecision: ReviewDecision): boolean {
  return reviewDecision === 'revise';
}

function shouldPackageBeBlocked(reviewDecision: ReviewDecision): boolean {
  return reviewDecision === 'fail';
}

export function applyReviewToDelivery(
  report: ReviewReport,
  delivery: DeliveryProject,
  targetPackageId?: string
): ReviewDeliveryResult {
  const { decision } = report;
  const updatedDelivery = { ...delivery, packages: [...delivery.packages], updatedAt: new Date().toISOString() };
  let updatedPackage: ReleasePackage | null = null;
  let packageNotes = '';

  const targetPkg = targetPackageId
    ? delivery.packages.find(p => p.id === targetPackageId) ?? null
    : delivery.packages.find(p => p.status === 'draft' || p.status === 'revised') ?? null;

  if (targetPkg) {
    if (shouldPackageBeIssued(decision)) {
      updatedPackage = issuePackage({
        ...targetPkg,
        checkedBy: report.reviewer,
        approvedBy: report.reviewer,
        transmittalNote: [
          `Review decision: ${decision}`,
          `Reviewer: ${report.reviewer}`,
          `Date: ${report.reviewedAt.slice(0, 10)}`,
          ...(decision === 'conditional-pass' ? ['Conditions: Review findings must be addressed before next stage.'] : []),
          `Issues found: ${report.summary.totalIssues} (${report.summary.critical} critical, ${report.summary.major} major)`,
        ].join('\n'),
      });
      const idx = updatedDelivery.packages.findIndex(p => p.id === targetPkg.id);
      if (idx >= 0) {
        updatedDelivery.packages[idx] = updatedPackage;
      }
      packageNotes = `Package "${targetPkg.name}" issued following ${decision} review.${decision === 'conditional-pass' ? ' Conditions: Review findings must be addressed before next stage.' : ''}`;
    } else if (shouldPackageBeRevised(decision)) {
      const revisedSheets = updatedDelivery.sheets.map(s => reviseSheet(s, `Revision after ${decision} review: ${report.notes || 'See review report'}`, report.reviewer));
      updatedDelivery.sheets = revisedSheets;
      updatedPackage = {
        ...targetPkg,
        status: 'revised' as const,
        revision: `P${String(parseInt((targetPkg.revision.match(/\d+/) ?? ['0'])[0]) + 1).padStart(2, '0')}`,
        updatedAt: new Date().toISOString(),
      };
      const idx = updatedDelivery.packages.findIndex(p => p.id === targetPkg.id);
      if (idx >= 0) {
        updatedDelivery.packages[idx] = updatedPackage;
      }
      packageNotes = `Package "${targetPkg.name}" revised after ${decision} review. ${report.summary.totalIssues} issue(s) to resolve.`;
    } else if (shouldPackageBeBlocked(decision)) {
      packageNotes = `Package "${targetPkg.name}" blocked. Review failed with ${report.summary.critical} critical and ${report.summary.major} major issues.`;
      updatedPackage = targetPkg;
    }
  } else {
    packageNotes = `No suitable package found for review decision "${decision}".`;
  }

    if (shouldPackageBeIssued(decision)) {
      if (updatedDelivery.currentIssueState === ISSUE_STATE_BEFORE_REVIEW) {
        updatedDelivery.currentIssueState = ISSUE_STATE_AFTER_REVIEW[decision] as IssueState;
      }
    } else if (shouldPackageBeRevised(decision)) {
      updatedDelivery.currentIssueState = ISSUE_STATE_AFTER_REVIEW['revise'] as IssueState;
    } else if (shouldPackageBeBlocked(decision)) {
      updatedDelivery.currentIssueState = 'draft';
    }

  updatedDelivery.drawingRegister = delivery.sheets.map(s => ({
    sheetId: s.id,
    sheetNumber: s.sheetNumber,
    sheetTitle: s.sheetTitle,
    discipline: s.discipline,
    status: s.status,
    revision: s.currentRevision,
    date: s.updatedAt.slice(0, 10),
    fileRef: `${s.sheetNumber}_${s.currentRevision}`,
  }));

  return {
    delivery: updatedDelivery,
    packageNotes,
    updatedPackage,
  };
}

export function suggestPackageTypeForReview(report: ReviewReport): PackageType {
  const hasCritical = report.summary.critical > 0;
  const hasMajor = report.summary.major > 0;
  if (hasCritical) return 'issue-for-review';
  if (hasMajor) return 'issue-for-review';
  if (report.decision === 'pass') return 'issue-for-construction';
  return 'issue-for-review';
}

export function getReviewSummaryForTransmittal(report: ReviewReport): string {
  const lines = [
    `Review Report: ${report.id}`,
    `Decision: ${report.decision}`,
    `Score: ${report.summary.score}%`,
    `Issues: ${report.summary.totalIssues} total (${report.summary.critical} critical, ${report.summary.major} major, ${report.summary.minor} minor, ${report.summary.info} info)`,
    `Reviewer: ${report.reviewer}`,
    `Date: ${report.reviewedAt.slice(0, 10)}`,
    `Jurisdiction: ${report.jurisdiction}`,
  ];
  return lines.join('\n');
}
