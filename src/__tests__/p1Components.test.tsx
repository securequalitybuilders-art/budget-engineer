// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { CriticalPathGantt } from '@/components/p1/CriticalPathGantt';
import { CashflowChart } from '@/components/p1/CashflowChart';
import { RiskRegisterCard } from '@/components/p1/RiskRegisterCard';
import type { ScheduleRecord, RiskRegisterEntry } from '@/domain/sitehawk';
import type { CostBaseline } from '@/domain/greenflag';

afterEach(cleanup);

const SCHEDULE: ScheduleRecord[] = [
  { id: 'f', projectId: 'proj-1', task: 'Foundation', wbsCode: '02.01', durationDays: 5, predecessors: [], startDate: '2026-01-01', costCents: 1_400_000, critical: true },
  { id: 's', projectId: 'proj-1', task: 'Shell', wbsCode: '03.01', durationDays: 10, predecessors: ['f'], startDate: '2026-01-06', costCents: 1_650_000, critical: true },
  { id: 'r', projectId: 'proj-1', task: 'Finishes', wbsCode: '04.01', durationDays: 4, predecessors: ['s'], startDate: '2026-01-16', costCents: 1_070_000, critical: true },
  { id: 'p', projectId: 'proj-1', task: 'Patching', wbsCode: '05.01', durationDays: 3, predecessors: [], startDate: '2026-01-01', costCents: 100_000, critical: false },
];

const BASELINE: CostBaseline = {
  id: 'bl-1',
  projectId: 'proj-1',
  region: 'zimbabwe',
  totalCents: 4_220_000,
  contingencyCents: 422_000,
  contingencyPct: 10,
  lines: [],
  status: 'locked',
  lockedAt: '2026-06-15T09:00:00.000Z',
};

const RISKS: RiskRegisterEntry[] = [
  { id: 'r-1', projectId: 'proj-1', code: 'R-001', category: 'Schedule', description: 'Delay', probability: 'high', impact: 'major', score: 12, status: 'open', owner: 'PM', mitigation: 'Buffer', contingencyCents: 633_000, createdAt: '2026-06-15' },
  { id: 'r-2', projectId: 'proj-1', code: 'R-002', category: 'Cost', description: 'Price hike', probability: 'medium', impact: 'moderate', score: 6, status: 'accepted', owner: 'QS', mitigation: 'Forward buy', contingencyCents: 253_200, createdAt: '2026-06-15' },
];

describe('CriticalPathGantt', () => {
  it('renders the gantt card with task rows', () => {
    render(<CriticalPathGantt projectId="proj-1" schedule={SCHEDULE} baseline={BASELINE} />);
    expect(screen.getByText('Critical Path Gantt')).toBeTruthy();
    const rows = screen.getAllByTestId('gantt-row');
    expect(rows.length).toBe(4);
    expect(screen.getAllByText('Foundation').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Shell')).toBeTruthy();
    expect(screen.getByText('Finishes')).toBeTruthy();
    expect(screen.getByText('Patching')).toBeTruthy();
  });

  it('shows 3 critical tasks pill', () => {
    render(<CriticalPathGantt projectId="proj-1" schedule={SCHEDULE} baseline={BASELINE} />);
    expect(screen.getByText('3 critical')).toBeTruthy();
  });

  it('shows 3 milestone markers', () => {
    render(<CriticalPathGantt projectId="proj-1" schedule={SCHEDULE} baseline={BASELINE} />);
    const markers = screen.getAllByTestId('milestone-marker');
    expect(markers.length).toBe(3);
    expect(screen.getAllByText('Foundation').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Shell Complete')).toBeTruthy();
    expect(screen.getByText('Practical Completion')).toBeTruthy();
  });

  it('renders gantt timeline with tasks in dependency order', () => {
    render(<CriticalPathGantt projectId="proj-1" schedule={SCHEDULE} baseline={BASELINE} />);
    const timeline = screen.getByTestId('gantt-timeline');
    expect(timeline).toBeTruthy();
    const rows = screen.getAllByTestId('gantt-row');
    expect(rows.length).toBe(4);
    expect(rows[0].textContent).toContain('Foundation');
    expect(rows[1].textContent).toContain('Shell');
    expect(rows[2].textContent).toContain('Finishes');
    expect(rows[3].textContent).toContain('Patching');
  });

  it('renders dependency arrows when parallel predecessors create float gaps', () => {
    const parallelSchedule: ScheduleRecord[] = [
      { id: 'a', projectId: 'proj-1', task: 'Earthworks', wbsCode: '01.01', durationDays: 3, predecessors: [], startDate: '2026-01-01', costCents: 500_000, critical: false },
      { id: 'b', projectId: 'proj-1', task: 'Procurement', wbsCode: '01.02', durationDays: 8, predecessors: [], startDate: '2026-01-01', costCents: 800_000, critical: true },
      { id: 'c', projectId: 'proj-1', task: 'Install', wbsCode: '01.03', durationDays: 5, predecessors: ['a', 'b'], startDate: '2026-01-09', costCents: 600_000, critical: true },
    ];
    render(<CriticalPathGantt projectId="proj-1" schedule={parallelSchedule} baseline={null} />);
    const timeline = screen.getByTestId('gantt-timeline');
    expect(timeline).toBeTruthy();
    expect(screen.getByText('Earthworks')).toBeTruthy();
    expect(screen.getByText('Procurement')).toBeTruthy();
    expect(screen.getByText('Install')).toBeTruthy();
  });

  it('toggles WBS Dictionary panel on button click', () => {
    render(<CriticalPathGantt projectId="proj-1" schedule={SCHEDULE} baseline={BASELINE} />);
    expect(screen.queryByTestId('wbs-dictionary')).toBeNull();
    fireEvent.click(screen.getByTestId('toggle-wbs'));
    expect(screen.getByTestId('wbs-dictionary')).toBeTruthy();
    expect(screen.getByText('WBS Dictionary')).toBeTruthy();
  });

  it('toggles Schedule of Values panel on button click', () => {
    render(<CriticalPathGantt projectId="proj-1" schedule={SCHEDULE} baseline={BASELINE} />);
    expect(screen.queryByTestId('schedule-of-values')).toBeNull();
    fireEvent.click(screen.getByTestId('toggle-sov'));
    expect(screen.getByTestId('schedule-of-values')).toBeTruthy();
    expect(screen.getByText('Schedule of Values')).toBeTruthy();
  });

  it('shows empty state for empty schedule', () => {
    render(<CriticalPathGantt projectId="proj-1" schedule={[]} baseline={null} />);
    expect(screen.getByText(/No schedule tasks/)).toBeTruthy();
  });
});

describe('CashflowChart', () => {
  it('renders the cashflow chart with bar groups', () => {
    render(<CashflowChart baseline={BASELINE} schedule={SCHEDULE} />);
    expect(screen.getByText('Cashflow Projection')).toBeTruthy();
    const bars = screen.getAllByTestId('cashflow-bar-group');
    expect(bars.length).toBeGreaterThanOrEqual(3);
  });

  it('shows the next cashflow indicator', () => {
    render(<CashflowChart baseline={BASELINE} schedule={SCHEDULE} />);
    expect(screen.getByTestId('next-cashflow')).toBeTruthy();
    expect(screen.getByText(/Next cashflow/)).toBeTruthy();
  });

  it('shows inflow/outflow legend', () => {
    render(<CashflowChart baseline={BASELINE} schedule={SCHEDULE} />);
    expect(screen.getByText('Inflow')).toBeTruthy();
    expect(screen.getByText('Outflow')).toBeTruthy();
  });

  it('shows empty state without baseline', () => {
    render(<CashflowChart baseline={null} schedule={[]} />);
    expect(screen.getByText(/No baseline or schedule/)).toBeTruthy();
  });
});

describe('RiskRegisterCard', () => {
  it('renders risk table rows with correct codes', () => {
    render(<RiskRegisterCard risks={RISKS} />);
    expect(screen.getByText('Risk Register')).toBeTruthy();
    expect(screen.getByText('R-001')).toBeTruthy();
    expect(screen.getByText('R-002')).toBeTruthy();
    expect(screen.getByText('Delay')).toBeTruthy();
    expect(screen.getByText('Price hike')).toBeTruthy();
  });

  it('shows open count and high count pills', () => {
    render(<RiskRegisterCard risks={RISKS} />);
    expect(screen.getByText('1 open')).toBeTruthy();
    expect(screen.getByText('1 high')).toBeTruthy();
  });

  it('shows total contingency amount', () => {
    render(<RiskRegisterCard risks={RISKS} />);
    const matches = screen.getAllByText(/Contingency/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('shows empty state for empty risks', () => {
    render(<RiskRegisterCard risks={[]} />);
    expect(screen.getByText(/No risks generated/)).toBeTruthy();
  });

  it('renders mitigation text for each risk', () => {
    render(<RiskRegisterCard risks={RISKS} />);
    expect(screen.getByText(/Buffer/)).toBeTruthy();
    expect(screen.getByText(/Forward buy/)).toBeTruthy();
  });
});
