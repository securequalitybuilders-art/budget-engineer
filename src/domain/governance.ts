export type ApprovalState = 'draft' | 'in_review' | 'approved' | 'rejected';

export type GovernanceComment = {
  id: string;
  author: string;
  role?: string;
  message: string;
  timestamp: string;
  action?: string;
  reason?: string;
};

export type GovernanceRecord = {
  projectId: string;
  approvalState: ApprovalState;
  versionLabel: string;
  owner: string;
  reviewers: string[];
  comments: GovernanceComment[];
  lastUpdated: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
};
