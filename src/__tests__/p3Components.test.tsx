// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { DigitalTwinViewer } from '@/components/p3/DigitalTwinViewer';
import { ProgressPanel } from '@/components/p3/ProgressPanel';
import { SiteVerificationPanel } from '@/components/p3/SiteVerificationPanel';
import { InspectionChecklistPanel } from '@/components/p3/InspectionChecklistPanel';
import { P3DigitalTwinStage } from '@/components/dashboard/stages/P3DigitalTwinStage';

afterEach(cleanup);

vi.mock('@/stores/projectStore', () => ({
  useProjectStore: Object.assign(
    (sel: (s: { currentProjectId: string | null }) => unknown) => sel({ currentProjectId: 'proj-1' }),
    { getState: () => ({ currentProjectId: 'proj-1' }) },
  ),
}));

const mockState: Record<string, unknown> = {
  digitalTwinTimeline: [],
  verificationReports: [],
  escrowMilestones: [],
  wipaaEntries: [],
  inspectionChecklists: [],
  isLoading: false,
  loadForProject: vi.fn(),
  addSnapshot: vi.fn(),
  addVerification: vi.fn(),
  addEscrowMilestone: vi.fn(),
  transitionEscrow: vi.fn(),
  addWipaaEntry: vi.fn(),
  addInspectionChecklist: vi.fn(),
  updateInspectionChecklist: vi.fn(),
};

vi.mock('@/stores/siteHawkStore', () => ({
  useSiteHawkStore: Object.assign(
    (sel: (s: typeof mockState) => unknown) => sel(mockState),
    { getState: () => mockState },
  ),
}));

vi.mock('@/stores/greenFlagStore', () => ({
  useGreenFlagStore: Object.assign(
    (sel: (s: { costBaselines: unknown[] }) => unknown) => sel({ costBaselines: [] }),
    { getState: () => ({ costBaselines: [] }) },
  ),
}));

beforeEach(() => {
  mockState.digitalTwinTimeline = [];
  mockState.verificationReports = [];
  mockState.escrowMilestones = [];
  mockState.wipaaEntries = [];
  mockState.inspectionChecklists = [];
  mockState.isLoading = false;
  vi.clearAllMocks();
});

describe('DigitalTwinViewer', () => {
  it('renders empty state when no snapshots', () => {
    render(<DigitalTwinViewer />);
    expect(screen.getByText(/No snapshots captured yet/i)).toBeTruthy();
  });

  it('renders KPI cards with zero counts', () => {
    render(<DigitalTwinViewer />);
    expect(screen.getByText('Snapshots')).toBeTruthy();
    expect(screen.getByText('Verified')).toBeTruthy();
  });

  it('shows capture form fields', () => {
    render(<DigitalTwinViewer />);
    expect(screen.getByText('Capture snapshot')).toBeTruthy();
    expect(screen.getByText('Site Photo Timeline')).toBeTruthy();
  });
});

describe('ProgressPanel', () => {
  it('renders KPI cards in empty state', () => {
    render(<ProgressPanel />);
    expect(screen.getByText('Completion')).toBeTruthy();
    expect(screen.getByText('Gross Margin')).toBeTruthy();
  });

  it('shows completion % KPI', () => {
    render(<ProgressPanel />);
    expect(screen.getByText('Completion')).toBeTruthy();
  });

  it('shows gross margin KPI', () => {
    render(<ProgressPanel />);
    expect(screen.getByText('Gross Margin')).toBeTruthy();
  });
});

describe('SiteVerificationPanel', () => {
  it('renders KPI cards in empty state', () => {
    render(<SiteVerificationPanel />);
    expect(screen.getByText('To Verify')).toBeTruthy();
    expect(screen.getByText('Matched')).toBeTruthy();
  });

  it('shows verification method selector', () => {
    render(<SiteVerificationPanel />);
    expect(screen.getByText('Run AI Vision Match')).toBeTruthy();
  });
});

describe('InspectionChecklistPanel', () => {
  it('renders empty state when no checklists', () => {
    render(<InspectionChecklistPanel />);
    expect(screen.getAllByText('Checklists').length).toBeGreaterThanOrEqual(2);
  });

  it('shows create form with category selector', () => {
    render(<InspectionChecklistPanel />);
    expect(screen.getByText('Create Inspection Checklist')).toBeTruthy();
    expect(screen.getByText('Category')).toBeTruthy();
  });

  it('shows milestone name field', () => {
    render(<InspectionChecklistPanel />);
    expect(screen.getByText('Milestone Name')).toBeTruthy();
  });

  it('shows KPI cards for checklists', () => {
    render(<InspectionChecklistPanel />);
    expect(screen.getAllByText('Checklists').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Signed Off')).toBeTruthy();
    expect(screen.getByText('In Progress')).toBeTruthy();
    expect(screen.getByText('Escrow Gate')).toBeTruthy();
  });
});

describe('P3DigitalTwinStage', () => {
  it('renders all four tab buttons', () => {
    render(<P3DigitalTwinStage />);
    expect(screen.getByText('Digital Twin')).toBeTruthy();
    expect(screen.getByText('Progress & BvA')).toBeTruthy();
    expect(screen.getByText('Site Verification')).toBeTruthy();
    expect(screen.getByText('Inspection Checklist')).toBeTruthy();
  });

  it('defaults to overview tab', () => {
    render(<P3DigitalTwinStage />);
    expect(screen.getByText('Snapshots')).toBeTruthy();
  });

  it('switches to progress tab on click', () => {
    render(<P3DigitalTwinStage />);
    fireEvent.click(screen.getByText('Progress & BvA'));
    expect(screen.getByText('Completion')).toBeTruthy();
  });

  it('switches to verification tab', () => {
    render(<P3DigitalTwinStage />);
    fireEvent.click(screen.getByText('Site Verification'));
    expect(screen.getByText('To Verify')).toBeTruthy();
  });

  it('switches to checklist tab', () => {
    render(<P3DigitalTwinStage />);
    fireEvent.click(screen.getByText('Inspection Checklist'));
    expect(screen.getByText('Create Inspection Checklist')).toBeTruthy();
  });
});
