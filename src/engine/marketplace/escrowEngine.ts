import { EscrowAgreement, EscrowMilestone, EscrowStatus, VerificationProof } from '../../domain/marketplace';

export function createEscrow(params: {
  projectId: string; providerId: string; clientId: string; contractReference?: string;
  totalAmount: number; currency?: string; terms?: string; disputeResolution?: string;
  milestones: { title: string; description: string; amount: number; dueDate: string }[];
}): EscrowAgreement {
  if (params.milestones.length === 0) throw new Error('Escrow requires at least one milestone');
  const totalMilestoneAmount = params.milestones.reduce((s, m) => s + m.amount, 0);
  if (Math.abs(totalMilestoneAmount - params.totalAmount) > 0.01)
    throw new Error(`Milestone amounts (${totalMilestoneAmount}) must equal totalAmount (${params.totalAmount})`);
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(), projectId: params.projectId, providerId: params.providerId,
    clientId: params.clientId, contractReference: params.contractReference,
    totalAmount: params.totalAmount, currency: params.currency ?? 'USD',
    terms: params.terms ?? 'Standard milestone-based release', disputeResolution: params.disputeResolution,
    status: 'locked', createdAt: now, updatedAt: now,
    milestones: params.milestones.map(m => ({
      id: crypto.randomUUID(), escrowId: '', title: m.title, description: m.description,
      amount: m.amount, dueDate: m.dueDate, status: 'pending' as const, verificationProof: [],
    })),
  };
}

export function completeMilestone(escrow: EscrowAgreement, milestoneId: string, proof?: Omit<VerificationProof, 'id' | 'milestoneId' | 'uploadedAt'>): EscrowAgreement {
  const milestone = escrow.milestones.find(m => m.id === milestoneId);
  if (!milestone) throw new Error(`Milestone ${milestoneId} not found`);
  if (milestone.status !== 'pending') throw new Error(`Milestone ${milestoneId} is already ${milestone.status}`);
  const now = new Date().toISOString();
  const updatedMilestones = escrow.milestones.map(m => {
    if (m.id !== milestoneId) return m;
    const updatedProof = proof ? [...(m.verificationProof ?? []), { ...proof, id: crypto.randomUUID(), milestoneId, uploadedAt: now }] : m.verificationProof;
    return { ...m, status: 'completed' as const, completedAt: now, verificationProof: updatedProof };
  });
  return { ...escrow, milestones: updatedMilestones, updatedAt: now };
}

export function verifyMilestone(escrow: EscrowAgreement, milestoneId: string, verified: boolean, reason?: string): EscrowAgreement {
  const milestone = escrow.milestones.find(m => m.id === milestoneId);
  if (!milestone) throw new Error(`Milestone ${milestoneId} not found`);
  if (milestone.status !== 'completed') throw new Error('Cannot verify milestone that is not completed');
  const updatedMilestones = escrow.milestones.map(m =>
    m.id === milestoneId ? { ...m, status: verified ? ('verified' as const) : ('disputed' as const), disputedReason: verified ? undefined : (reason ?? 'Disputed by client') } : m
  );
  const allReleased = updatedMilestones.every(m => m.status === 'verified' || m.status === 'released');
  const hasDisputed = updatedMilestones.some(m => m.status === 'disputed');
  const updatedStatus: EscrowStatus = allReleased ? 'released' : hasDisputed ? 'disputed' : escrow.status;
  return { ...escrow, milestones: updatedMilestones, status: updatedStatus, updatedAt: new Date().toISOString() };
}

export function releaseFunds(escrow: EscrowAgreement, milestoneId: string, approvedBy?: string): EscrowAgreement {
  const milestone = escrow.milestones.find(m => m.id === milestoneId);
  if (!milestone) throw new Error(`Milestone ${milestoneId} not found`);
  if (milestone.status !== 'verified') throw new Error('Only verified milestones can be released');
  const now = new Date().toISOString();
  const updatedMilestones = escrow.milestones.map(m =>
    m.id === milestoneId ? { ...m, status: 'released' as const, releasedAt: now, approvedBy } : m
  );
  const allReleased = updatedMilestones.every(m => m.status === 'verified' || m.status === 'released');
  const updatedStatus: EscrowStatus = allReleased ? 'released' : escrow.status;
  return { ...escrow, milestones: updatedMilestones, status: updatedStatus, updatedAt: now, completedAt: allReleased ? now : undefined };
}

export function getTotalReleased(escrow: EscrowAgreement): number {
  return escrow.milestones.filter(m => m.status === 'released').reduce((s, m) => s + m.amount, 0);
}

export function getTotalLocked(escrow: EscrowAgreement): number {
  return escrow.milestones.filter(m => m.status === 'pending' || m.status === 'completed' || m.status === 'verified').reduce((s, m) => s + m.amount, 0);
}

export function getTotalDisputed(escrow: EscrowAgreement): number {
  return escrow.milestones.filter(m => m.status === 'disputed').reduce((s, m) => s + m.amount, 0);
}

export function getEscrowProgress(escrow: EscrowAgreement): number {
  if (escrow.milestones.length === 0 || escrow.totalAmount === 0) return 0;
  const released = getTotalReleased(escrow);
  return Math.round((released / escrow.totalAmount) * 100);
}

export function getNextMilestone(escrow: EscrowAgreement): EscrowMilestone | undefined {
  return escrow.milestones.find(m => m.status === 'pending');
}

export function getOverdueMilestones(escrow: EscrowAgreement): EscrowMilestone[] {
  const now = new Date();
  return escrow.milestones.filter(m => (m.status === 'pending' || m.status === 'completed') && new Date(m.dueDate) < now);
}

export function getMilestoneTimeline(escrow: EscrowAgreement): { milestone: EscrowMilestone; durationDays: number; delayDays: number }[] {
  return escrow.milestones.map(m => {
    const completed = m.completedAt ? new Date(m.completedAt) : null;
    const due = new Date(m.dueDate);
    const planned = new Date(escrow.createdAt);
    const durationDays = Math.ceil((due.getTime() - planned.getTime()) / 86400000);
    const delayDays = completed && completed > due ? Math.ceil((completed.getTime() - due.getTime()) / 86400000) : 0;
    return { milestone: m, durationDays, delayDays };
  });
}

export function getEscrowSummary(escrow: EscrowAgreement): { total: number; released: number; locked: number; disputed: number; progress: number; nextMilestone: EscrowMilestone | undefined; overdueCount: number } {
  return {
    total: escrow.totalAmount, released: getTotalReleased(escrow),
    locked: getTotalLocked(escrow), disputed: getTotalDisputed(escrow),
    progress: getEscrowProgress(escrow),
    nextMilestone: getNextMilestone(escrow), overdueCount: getOverdueMilestones(escrow).length,
  };
}

export interface ExecutionSyncInput {
  tasks: { id: string; title: string; plannedDays: number; actualDays: number; dependencies: string[] }[];
  budgetCategories: { category: string; budgeted: number; actual: number }[];
  qualityMetrics: { metric: string; score: number; target: number }[];
  resources: { role: string; required: number; assigned: number }[];
  totalBudget: number;
  projectId: string;
  providerId: string;
  clientId: string;
}

export function createEscrowFromExecution(input: ExecutionSyncInput): EscrowAgreement {
  const milestones = input.tasks.map(t => ({
    title: t.title,
    description: `Task: ${t.title} (${t.plannedDays} days planned, ${t.actualDays} actual)`,
    amount: Math.round(input.totalBudget * (t.plannedDays / input.tasks.reduce((s, x) => s + x.plannedDays, 0))),
    dueDate: new Date(Date.now() + t.plannedDays * 86400000).toISOString().split('T')[0],
  }));
  return createEscrow({
    projectId: input.projectId,
    providerId: input.providerId,
    clientId: input.clientId,
    totalAmount: milestones.reduce((s, m) => s + m.amount, 0),
    milestones,
  });
}

export function autoReleaseCompletedMilestones(escrow: EscrowAgreement, tasks: { id: string; title: string; actualDays: number; completed: boolean }[]): { escrow: EscrowAgreement; releases: string[] } {
  const releases: string[] = [];
  let updated = { ...escrow, milestones: escrow.milestones.map(m => ({ ...m })) };

  for (const task of tasks) {
    if (!task.completed) continue;
    const milestone = updated.milestones.find(m => m.title === task.title && m.status === 'pending');
    if (!milestone) continue;

    updated = completeMilestone(updated, milestone.id, {
      type: 'signoff',
      url: '#auto-verified',
      uploadedBy: 'system',
      notes: `Auto-verified: task "${task.title}" completed in ${task.actualDays} days`,
    });
    releases.push(`Completed: "${task.title}"`);

    updated = verifyMilestone(updated, milestone.id, true);
    releases.push(`Verified: "${task.title}"`);

    updated = releaseFunds(updated, milestone.id, 'auto-system');
    releases.push(`Released: "${task.title}" ($${milestone.amount.toLocaleString()})`);
  }

  return { escrow: updated, releases };
}
