/**
 * P2 component tests — Resource Schedule, Procurement Hub, Logistics Tracker,
 * Fleet Management, Real-Time Job Costing.
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';

vi.mock('@/stores/projectStore', () => ({
  useProjectStore: (sel: (s: { projects: Array<{ id: string }>; currentProjectId: string }) => unknown) =>
    sel({ projects: [{ id: 'test-project' }], currentProjectId: 'test-project' }),
}));

const mockState = {
  resourceSchedules: [],
  logistics: [],
  truckLocations: [],
  drivers: [],
  pos: [],
  invoices: [],
  equipmentSlots: [],
  isLoading: false,
  loadForProject: vi.fn(),
  addLogistics: vi.fn(),
  stepLogistics: vi.fn(),
  advanceTruck: vi.fn(),
};

vi.mock('@/stores/siteHawkStore', () => ({
  useSiteHawkStore: (sel: (s: typeof mockState) => unknown) => sel(mockState),
}));

vi.mock('@/stores/greenFlagStore', () => ({
  useGreenFlagStore: (sel: (s: { costBaselines: unknown[] }) => unknown) =>
    sel({ costBaselines: [] }),
}));

import { ResourceSchedulePanel } from '@/components/p2/ResourceSchedulePanel';
import { ProcurementHub } from '@/components/p2/ProcurementHub';
import { LogisticsTracker } from '@/components/p2/LogisticsTracker';
import { FleetManagement } from '@/components/p2/FleetManagement';
import { RealTimeJobCostingPanel } from '@/components/p2/RealTimeJobCostingPanel';
import { P2SiteMobilizationStage } from '@/components/dashboard/stages/P2SiteMobilizationStage';

afterEach(() => cleanup());

beforeEach(() => {
  vi.clearAllMocks();
  mockState.resourceSchedules = [];
  mockState.logistics = [];
  mockState.truckLocations = [];
  mockState.drivers = [];
  mockState.pos = [];
  mockState.invoices = [];
  mockState.equipmentSlots = [];
});

describe('ResourceSchedulePanel', () => {
  it('renders empty state', () => {
    render(<ResourceSchedulePanel />);
    expect(screen.getByText('Trade Shifts')).toBeTruthy();
    expect(screen.getByText('Equipment Slots')).toBeTruthy();
    expect(screen.getByText('Material Slots')).toBeTruthy();
    expect(screen.getByText('Total Cost')).toBeTruthy();
  });

  it('loads data on mount', () => {
    render(<ResourceSchedulePanel />);
    expect(mockState.loadForProject).toHaveBeenCalledWith('test-project');
  });
});

describe('ProcurementHub', () => {
  it('renders empty state', () => {
    render(<ProcurementHub />);
    // "Purchase Orders" appears in both Kicker and h3 heading
    expect(screen.getAllByText('Purchase Orders').length).toBeGreaterThanOrEqual(1);
    // "Invoices" appears in both Kicker and h3 heading
    expect(screen.getAllByText('Invoices').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('PO Total')).toBeTruthy();
  });
});

describe('LogisticsTracker', () => {
  it('renders empty state', () => {
    render(<LogisticsTracker />);
    expect(screen.getByText('Trucks En Route')).toBeTruthy();
    // "Live Truck Map" is the h3 heading
    expect(screen.getByText('Live Truck Map')).toBeTruthy();
    expect(screen.getByText('Truck Fleet')).toBeTruthy();
  });

  it('renders SVG site map', () => {
    const { container } = render(<LogisticsTracker />);
    const svgs = container.querySelectorAll('svg[role="img"]');
    expect(svgs.length).toBeGreaterThanOrEqual(1);
  });
});

describe('FleetManagement', () => {
  it('renders empty state', () => {
    render(<FleetManagement />);
    expect(screen.getByText('Drivers')).toBeTruthy();
    expect(screen.getByText('En Route')).toBeTruthy();
    expect(screen.getByText('Driver Roster')).toBeTruthy();
  });
});

describe('RealTimeJobCostingPanel', () => {
  it('renders empty state', () => {
    render(<RealTimeJobCostingPanel />);
    expect(screen.getByText('Budget')).toBeTruthy();
    expect(screen.getByText('Committed (POs)')).toBeTruthy();
    expect(screen.getByText('Spent (Paid)')).toBeTruthy();
    expect(screen.getByText('Pending Invoices')).toBeTruthy();
    expect(screen.getByText('Cost Breakdown')).toBeTruthy();
  });
});

describe('P2SiteMobilizationStage', () => {
  it('renders all tabs', () => {
    render(<P2SiteMobilizationStage />);
    // Tab labels appear as button text
    expect(screen.getByRole('button', { name: /Resource Schedule/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Procurement Hub/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Logistics Tracker/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Fleet Management/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Job Costing/ })).toBeTruthy();
  });

  it('shows resource schedule by default', () => {
    render(<P2SiteMobilizationStage />);
    expect(screen.getByText('Trade Shifts')).toBeTruthy();
  });

  it('switches to logistics tab', async () => {
    render(<P2SiteMobilizationStage />);
    screen.getByRole('button', { name: /Logistics Tracker/ }).click();
    await waitFor(() => {
      expect(screen.getByText('Live Truck Map')).toBeTruthy();
    });
  });

  it('switches to procurement tab', async () => {
    render(<P2SiteMobilizationStage />);
    screen.getByRole('button', { name: /Procurement Hub/ }).click();
    await waitFor(() => {
      expect(screen.getByText('PO Total')).toBeTruthy();
    });
  });

  it('switches to fleet tab', async () => {
    render(<P2SiteMobilizationStage />);
    screen.getByRole('button', { name: /Fleet Management/ }).click();
    await waitFor(() => {
      expect(screen.getByText('Driver Roster')).toBeTruthy();
    });
  });

  it('switches to job costing tab', async () => {
    render(<P2SiteMobilizationStage />);
    screen.getByRole('button', { name: /Job Costing/ }).click();
    await waitFor(() => {
      expect(screen.getByText('Budget')).toBeTruthy();
    });
  });
});
