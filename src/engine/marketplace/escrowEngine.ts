import { EscrowAgreement, EscrowMilestone, EscrowStatus, VerificationProof } from '../../domain/marketplace';

export function createEscrow(params: {
  projectId: string; providerId: string; clientId: string;
  totalAmount: number; currency?: string; milestones: { title: string; description: string; amount: number; dueDate: string }[];
}): EscrowAgreement {
  if (params.milestones.length === 0) throw new Error('Escrow requires at least one milestone');
  const totalMilestoneAmount = params.milestones.reduce((s, m) => s + m.amount, 0);
  if (Math.abs(totalMilestoneAmount - params.totalAmount) > 0.01)
    throw new Error(`Milestone amounts (${totalMilestoneAmount}) must equal totalAmount (${params.totalAmount})`);
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(), projectId: params.projectId, providerId: params.providerId,
    clientId: params.clientId, totalAmount: params.totalAmount,
    currency: params.currency ?? 'USD', status: 'locked', createdAt: now, updatedAt: now,
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

export function verifyMilestone(escrow: EscrowAgreement, milestoneId: string, verified: boolean): EscrowAgreement {
  const milestone = escrow.milestones.find(m => m.id === milestoneId);
  if (!milestone) throw new Error(`Milestone ${milestoneId} not found`);
  if (milestone.status !== 'completed') throw new Error('Cannot verify milestone that is not completed');
  const updatedMilestones = escrow.milestones.map(m =>
    m.id === milestoneId ? { ...m, status: verified ? ('verified' as const) : ('disputed' as const) } : m
  );
  const allReleased = updatedMilestones.every(m => m.status === 'verified' || m.status === 'released');
  const updatedStatus: EscrowStatus = allReleased ? 'released' : escrow.status;
  return { ...escrow, milestones: updatedMilestones, status: updatedStatus, updatedAt: new Date().toISOString() };
}

export function releaseFunds(escrow: EscrowAgreement, milestoneId: string): EscrowAgreement {
  const milestone = escrow.milestones.find(m => m.id === milestoneId);
  if (!milestone) throw new Error(`Milestone ${milestoneId} not found`);
  if (milestone.status !== 'verified') throw new Error('Only verified milestones can be released');
  const updatedMilestones = escrow.milestones.map(m =>
    m.id === milestoneId ? { ...m, status: 'released' as const } : m
  );
  const allReleased = updatedMilestones.every(m => m.status === 'verified' || m.status === 'released');
  const updatedStatus: EscrowStatus = allReleased ? 'released' : escrow.status;
  return { ...escrow, milestones: updatedMilestones, status: updatedStatus, updatedAt: new Date().toISOString() };
}

export function getTotalReleased(escrow: EscrowAgreement): number {
  return escrow.milestones.filter(m => m.status === 'released').reduce((s, m) => s + m.amount, 0);
}

export function getTotalLocked(escrow: EscrowAgreement): number {
  return escrow.milestones.filter(m => m.status === 'pending' || m.status === 'completed' || m.status === 'verified').reduce((s, m) => s + m.amount, 0);
}

export function getEscrowProgress(escrow: EscrowAgreement): number {
  if (escrow.milestones.length === 0) return 0;
  const released = getTotalReleased(escrow);
  return Math.round((released / escrow.totalAmount) * 100);
}
