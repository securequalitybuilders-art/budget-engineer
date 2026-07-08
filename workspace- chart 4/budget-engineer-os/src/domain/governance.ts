export interface GovernanceComment {
  id: string;
  author: string;
  role?: string;
  message: string;
  timestamp: number;
  action?: string;
  reason?: string;
}

export interface GovernanceRecord {
  projectId: string;
  approvalState: 'draft' | 'in_review' | 'approved' | 'rejected';
  versionLabel: string;
  owner: string;
  reviewers: string[];
  comments: GovernanceComment[];
  lastUpdated: number;
  approvedBy?: string;
  approvedAt?: number;
  rejectedBy?: string;
  rejectedAt?: number;
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: number;
}
