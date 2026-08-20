/**
 * P4/P5/P6 component tests — Escrow Release, Variation Vault, WIPAA & Handover.
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('@/stores/projectStore', () => ({
  useProjectStore: (sel: (s: { projects: Array<{ id: string }>; currentProjectId: string }) => unknown) =>
    sel({ projects: [{ id: 'test-project' }], currentProjectId: 'test-project' }),
}));

const mockState: Record<string, unknown> = {
  escrowMilestones: [],
  escrowReleases: [],
  variationPenalties: [],
  wipaaEntries: [],
  isLoading: false,
  loadForProject: vi.fn(),
  addEscrowMilestone: vi.fn().mockResolvedValue(null),
  transitionEscrow: vi.fn().mockResolvedValue({ ok: true, reason: 'ok' }),
  addWipaaEntry: vi.fn().mockResolvedValue(null),
};

vi.mock('@/stores/siteHawkStore', () => ({
  useSiteHawkStore: (sel: (s: typeof mockState) => unknown) => sel(mockState),
}));

vi.mock('@/stores/greenFlagStore', () => ({
  useGreenFlagStore: (sel: (s: { costBaselines: unknown[] }) => unknown) =>
    sel({ costBaselines: [] }),
}));

import { P4EscrowReleaseStage } from '@/components/dashboard/stages/P4EscrowReleaseStage';
import { P5VariationVaultStage } from '@/components/dashboard/stages/P5VariationVaultStage';
import { P6WipaaHandoverStage } from '@/components/dashboard/stages/P6WipaaHandoverStage';

afterEach(() => cleanup());

beforeEach(() => {
  vi.clearAllMocks();
  mockState.escrowMilestones = [];
  mockState.escrowReleases = [];
  mockState.variationPenalties = [];
  mockState.wipaaEntries = [];
  mockState.isLoading = false;
});

// ─── P4 Escrow Release ──────────────────────────────────────────

describe('P4EscrowReleaseStage', () => {
  it('renders empty state when no milestones exist', () => {
    render(<P4EscrowReleaseStage />);
    expect(screen.getByText('No escrow milestones')).toBeTruthy();
    expect(screen.getByText(/Create escrow milestones tied to verified site progress/)).toBeTruthy();
  });

  it('loads data on mount', () => {
    render(<P4EscrowReleaseStage />);
    expect(mockState.loadForProject).toHaveBeenCalledWith('test-project');
  });

  it('renders summary cards when milestones exist', () => {
    mockState.escrowMilestones = [
      { id: 'em-1', projectId: 'test-project', milestoneName: 'Foundation', amountCents: 500000, status: 'pending', releaseDate: null, createdAt: '2026-06-15T09:00:00.000Z' },
    ];
    render(<P4EscrowReleaseStage />);
    expect(screen.getByText('Held in trust')).toBeTruthy();
    expect(screen.getAllByText('Released').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Pending')).toBeTruthy();
    expect(screen.getByText('Disputed')).toBeTruthy();
  });

  it('renders the Add milestone form when milestones exist', () => {
    mockState.escrowMilestones = [
      { id: 'em-1', projectId: 'test-project', milestoneName: 'Foundation', amountCents: 500000, status: 'pending', releaseDate: null, createdAt: '2026-06-15T09:00:00.000Z' },
    ];
    render(<P4EscrowReleaseStage />);
    expect(screen.getByText('Add milestone')).toBeTruthy();
    expect(screen.getByText('Escrow milestones')).toBeTruthy();
  });

  it('renders release log section when milestones exist', () => {
    mockState.escrowMilestones = [
      { id: 'em-1', projectId: 'test-project', milestoneName: 'Foundation', amountCents: 500000, status: 'pending', releaseDate: null, createdAt: '2026-06-15T09:00:00.000Z' },
    ];
    render(<P4EscrowReleaseStage />);
    expect(screen.getByText('Release log')).toBeTruthy();
    expect(screen.getByText(/No funds released yet/)).toBeTruthy();
  });

  it('shows Verify button for pending milestones', () => {
    mockState.escrowMilestones = [
      { id: 'em-p1', projectId: 'test-project', milestoneName: 'Foundation', amountCents: 1400000, status: 'pending', releaseDate: null, createdAt: '2026-06-15T09:00:00.000Z' },
    ];
    render(<P4EscrowReleaseStage />);
    expect(screen.getAllByText('Verify').length).toBeGreaterThanOrEqual(1);
  });

  it('shows Approve/Reject buttons for verified milestones', () => {
    mockState.escrowMilestones = [
      { id: 'em-v1', projectId: 'test-project', milestoneName: 'Shell', amountCents: 1650000, status: 'verified', releaseDate: null, createdAt: '2026-06-15T09:00:00.000Z' },
    ];
    render(<P4EscrowReleaseStage />);
    expect(screen.getAllByText('Approve').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Reject').length).toBeGreaterThanOrEqual(1);
  });

  it('renders release log entries when releases exist', () => {
    mockState.escrowMilestones = [{ id: 'em-1', projectId: 'test-project', milestoneName: 'Foundation', amountCents: 500000, status: 'released', releaseDate: '2026-07-01T12:00:00.000Z', createdAt: '2026-06-15T09:00:00.000Z' }];
    mockState.escrowReleases = [
      { id: 'er-1', projectId: 'test-project', milestoneId: 'em-1', amountCents: 500000, releasedBy: 'qs', releasedAt: '2026-07-01T12:00:00.000Z', proofRef: 'PR-001' },
    ];
    render(<P4EscrowReleaseStage />);
    expect(screen.getAllByText((_, el) => el?.textContent?.includes('PR-001') === true).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('qs')).toBeTruthy();
  });
});

// ─── P5 Variation Vault ──────────────────────────────────────────

describe('P5VariationVaultStage', () => {
  it('renders empty state when no penalties exist', () => {
    render(<P5VariationVaultStage />);
    expect(screen.getByText('No variations logged')).toBeTruthy();
    expect(screen.getByText(/Log change orders and run the 4-lens cost-impact analysis/)).toBeTruthy();
  });

  it('loads data on mount', () => {
    render(<P5VariationVaultStage />);
    expect(mockState.loadForProject).toHaveBeenCalledWith('test-project');
  });

  it('renders summary cards when penalties exist', () => {
    mockState.variationPenalties = [
      { id: 'vp-1', projectId: 'test-project', lens: 'red-pen', impactCents: 168000, penaltyCents: 10000, riskFlags: [], createdAt: '2026-07-01T12:00:00.000Z' },
    ];
    render(<P5VariationVaultStage />);
    expect(screen.getByText('Variations')).toBeTruthy();
    expect(screen.getByText('Total penalty')).toBeTruthy();
    expect(screen.getByText('Penalty rate')).toBeTruthy();
    expect(screen.getByText('Reversal risk')).toBeTruthy();
  });

  it('renders the 4-lens analysis form when penalties exist', () => {
    mockState.variationPenalties = [
      { id: 'vp-1', projectId: 'test-project', lens: 'red-pen', impactCents: 168000, penaltyCents: 10000, riskFlags: [], createdAt: '2026-07-01T12:00:00.000Z' },
    ];
    render(<P5VariationVaultStage />);
    expect(screen.getByText('4-lens analysis — run a variation')).toBeTruthy();
    expect(screen.getByText('Run 4-lens')).toBeTruthy();
    expect(screen.getAllByText('Red Pen').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('WIPAA')).toBeTruthy();
    expect(screen.getByText('True Ledger')).toBeTruthy();
    expect(screen.getByText('Budget Engineer')).toBeTruthy();
  });

  it('renders variation history when penalties exist', () => {
    mockState.variationPenalties = [
      { id: 'vp-1', projectId: 'test-project', lens: 'red-pen', impactCents: 168000, penaltyCents: 10000, riskFlags: [], createdAt: '2026-07-01T12:00:00.000Z' },
    ];
    render(<P5VariationVaultStage />);
    expect(screen.getByText('Variation history')).toBeTruthy();
  });

  it('disables Run 4-lens button when title is empty', () => {
    mockState.variationPenalties = [
      { id: 'vp-1', projectId: 'test-project', lens: 'red-pen', impactCents: 168000, penaltyCents: 10000, riskFlags: [], createdAt: '2026-07-01T12:00:00.000Z' },
    ];
    render(<P5VariationVaultStage />);
    const btn = screen.getByText('Run 4-lens');
    expect(btn.closest('button')!.disabled).toBe(true);
  });

  it('renders penalty data with risk flags', () => {
    mockState.variationPenalties = [
      { id: 'vp-1', projectId: 'test-project', lens: 'red-pen', impactCents: 168000, penaltyCents: 10000, riskFlags: ['Variance > 15%'], createdAt: '2026-07-01T12:00:00.000Z' },
    ];
    render(<P5VariationVaultStage />);
    expect(screen.getAllByText((_, el) => el?.textContent?.includes('flag') === true && el.textContent!.includes('1')).length).toBeGreaterThanOrEqual(1);
  });

  it('renders penalty rate as 25%', () => {
    mockState.variationPenalties = [
      { id: 'vp-1', projectId: 'test-project', lens: 'red-pen', impactCents: 168000, penaltyCents: 10000, riskFlags: [], createdAt: '2026-07-01T12:00:00.000Z' },
    ];
    render(<P5VariationVaultStage />);
    expect(screen.getByText('25%')).toBeTruthy();
  });
});

// ─── P6 WIPAA & Handover ─────────────────────────────────────────

describe('P6WipaaHandoverStage', () => {
  it('renders empty state when no WIPAA entries exist', () => {
    render(<P6WipaaHandoverStage />);
    expect(screen.getByText('No WIPAA data yet')).toBeTruthy();
    expect(screen.getByText(/Monthly WIPAA snapshots track true profitability/)).toBeTruthy();
  });

  it('loads data on mount', () => {
    render(<P6WipaaHandoverStage />);
    expect(mockState.loadForProject).toHaveBeenCalledWith('test-project');
  });

  it('renders summary cards when entries exist', () => {
    mockState.wipaaEntries = [
      { id: 'we-1', projectId: 'test-project', monthKey: '2026-06', billedCents: 100000, incurredCents: 100000, revenueEarnedCents: 100000, overUnderBilledCents: 0, status: 'on-track', escalationPct: 100, alertLevel: 'green', createdAt: '2026-07-01T12:00:00.000Z' },
    ];
    render(<P6WipaaHandoverStage />);
    expect(screen.getByText('Months tracked')).toBeTruthy();
    expect(screen.getByText('Latest alert')).toBeTruthy();
    expect(screen.getByText('Over/under billed')).toBeTruthy();
    expect(screen.getByText('Handover')).toBeTruthy();
  });

  it('renders the Add snapshot form when entries exist', () => {
    mockState.wipaaEntries = [
      { id: 'we-1', projectId: 'test-project', monthKey: '2026-06', billedCents: 100000, incurredCents: 100000, revenueEarnedCents: 100000, overUnderBilledCents: 0, status: 'on-track', escalationPct: 100, alertLevel: 'green', createdAt: '2026-07-01T12:00:00.000Z' },
    ];
    render(<P6WipaaHandoverStage />);
    expect(screen.getByText('Add snapshot')).toBeTruthy();
    expect(screen.getByText('WIPAA history')).toBeTruthy();
  });

  it('renders handover checklist section when entries exist', () => {
    mockState.wipaaEntries = [
      { id: 'we-1', projectId: 'test-project', monthKey: '2026-06', billedCents: 100000, incurredCents: 100000, revenueEarnedCents: 100000, overUnderBilledCents: 0, status: 'on-track', escalationPct: 100, alertLevel: 'green', createdAt: '2026-07-01T12:00:00.000Z' },
    ];
    render(<P6WipaaHandoverStage />);
    expect(screen.getByText('Handover checklist')).toBeTruthy();
    expect(screen.getByText('Digital')).toBeTruthy();
    expect(screen.getByText('Physical')).toBeTruthy();
  });

  it('disables Add snapshot button when month is empty', () => {
    mockState.wipaaEntries = [
      { id: 'we-1', projectId: 'test-project', monthKey: '2026-06', billedCents: 100000, incurredCents: 100000, revenueEarnedCents: 100000, overUnderBilledCents: 0, status: 'on-track', escalationPct: 100, alertLevel: 'green', createdAt: '2026-07-01T12:00:00.000Z' },
    ];
    render(<P6WipaaHandoverStage />);
    const btn = screen.getByText('Add snapshot');
    expect(btn.closest('button')!.disabled).toBe(true);
  });

  it('renders month count and GREEN alert for healthy data', () => {
    mockState.wipaaEntries = [
      { id: 'we-1', projectId: 'test-project', monthKey: '2026-06', billedCents: 100000, incurredCents: 100000, revenueEarnedCents: 100000, overUnderBilledCents: 0, status: 'on-track', escalationPct: 100, alertLevel: 'green', createdAt: '2026-07-01T12:00:00.000Z' },
      { id: 'we-2', projectId: 'test-project', monthKey: '2026-07', billedCents: 1176000, incurredCents: 1200000, revenueEarnedCents: 1180000, overUnderBilledCents: -4000, status: 'under-billed', escalationPct: 98, alertLevel: 'green', createdAt: '2026-08-01T12:00:00.000Z' },
    ];
    render(<P6WipaaHandoverStage />);
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('GREEN')).toBeTruthy();
  });

  it('shows red alert banner when red alerts exist', () => {
    mockState.wipaaEntries = [
      { id: 'we-r1', projectId: 'test-project', monthKey: '2026-05', billedCents: 50000, incurredCents: 100000, revenueEarnedCents: 60000, overUnderBilledCents: -50000, status: 'under-billed', escalationPct: 50, alertLevel: 'red', createdAt: '2026-06-01T12:00:00.000Z' },
      { id: 'we-g1', projectId: 'test-project', monthKey: '2026-06', billedCents: 100000, incurredCents: 100000, revenueEarnedCents: 100000, overUnderBilledCents: 0, status: 'on-track', escalationPct: 100, alertLevel: 'green', createdAt: '2026-07-01T12:00:00.000Z' },
    ];
    render(<P6WipaaHandoverStage />);
    expect(screen.getByText(/1 red alert/)).toBeTruthy();
    expect(screen.getByText(/escalation below 70%/)).toBeTruthy();
  });
});
