// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProjectWizard } from '@/pages/ProjectWizard';

vi.mock('@/stores/projectStore', () => ({
  useProjectStore: () => ({
    createProject: vi.fn().mockResolvedValue({ id: 'project-123' }),
    updateBrief: vi.fn().mockResolvedValue(undefined),
  }),
}));

afterEach(() => {
  cleanup();
});

function renderWizard() {
  return render(
    <MemoryRouter initialEntries={['/new']}>
      <ProjectWizard />
    </MemoryRouter>
  );
}

function clickAction() {
  const create = screen.queryByRole('button', { name: /create project/i });
  if (create) {
    fireEvent.click(create);
    return 'create';
  }
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  return 'next';
}

async function advance(steps: number) {
  for (let i = 0; i < steps; i++) {
    const approve = screen.queryByText('Approve & lock build plan');
    if (approve) fireEvent.click(approve);
    const confirm = screen.queryByText('Confirm materials & team');
    if (confirm) fireEvent.click(confirm);
    const action = clickAction();
    if (action === 'create') {
      await new Promise((r) => setTimeout(r, 0));
    }
  }
}

async function seedNameAndBudget() {
  await advance(1);
  fireEvent.change(screen.getByLabelText(/project name/i), { target: { value: 'My Harare home' } });
  fireEvent.change(screen.getByLabelText(/total budget/i), { target: { value: '45000' } });
}

describe('ProjectWizard dream journey', { timeout: 30_000 }, () => {
  it('starts on the Dream welcome step with profile cards', () => {
    renderWizard();
    expect(screen.getByText('Who is building?')).toBeTruthy();
    expect(screen.getByText('First-Time Home Builder')).toBeTruthy();
    expect(screen.getByText('Dream')).toBeTruthy();
  });

  it('walks the Dream phase through brief, funding and feasibility', async () => {
    renderWizard();
    await advance(1);

    expect(screen.getByText('Dream Brief')).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/project name/i), { target: { value: 'My Harare home' } });
    fireEvent.change(screen.getByLabelText(/total budget/i), { target: { value: '45000' } });
    await advance(1);

    expect(screen.getByText('Funding Check')).toBeTruthy();
    expect(screen.getByLabelText(/main funding source/i)).toBeTruthy();
    await advance(1);

    expect(screen.getByText('Feasibility Go / No-Go')).toBeTruthy();
    expect(screen.getByText(/ROM best/i)).toBeTruthy();
  });

  it('creates the project when activating a plan', async () => {
    renderWizard();
    await seedNameAndBudget();
    await advance(3);

    expect(screen.getByText('Activate')).toBeTruthy();
    fireEvent.click(screen.getByText('Red Pen'));
    fireEvent.click(screen.getByRole('button', { name: /create project/i }));

    expect(await screen.findByText('Review 3 AI sketches')).toBeTruthy();
  });

  it('gates the approve-build-plan button until the plan is locked', async () => {
    renderWizard();
    await seedNameAndBudget();
    await advance(8);

    expect(screen.getByText('Approve Build Plan')).toBeTruthy();
    const next = screen.getByRole('button', { name: 'Next' });
    expect((next as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByText('Approve & lock build plan'));
    expect((screen.getByRole('button', { name: 'Next' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('shows the recommended contractor and gates materials confirmation', async () => {
    renderWizard();
    await seedNameAndBudget();
    await advance(9);

    expect(screen.getByText('Your matched contractor')).toBeTruthy();
    expect(screen.getByText('Kudakwashe Chirinda')).toBeTruthy();
    expect(screen.getByText('Recommended')).toBeTruthy();
    await advance(1);

    expect(screen.getByText('Materials & team')).toBeTruthy();
    expect(screen.getByText('Willdale')).toBeTruthy();
    const next = screen.getByRole('button', { name: 'Next' });
    expect((next as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByText('Confirm materials & team'));
    expect((screen.getByRole('button', { name: 'Next' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('shows 3 build milestones with 35/40/25 splits', async () => {
    renderWizard();
    await seedNameAndBudget();
    await advance(11);

    expect(screen.getByText('Your 3 milestones')).toBeTruthy();
    expect(screen.getAllByText(/Foundation & Bones/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/Wall Plate & Shell/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/Finishes & Keys/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/35% of total/i)).toBeTruthy();
    expect(screen.getByText(/40% of total/i)).toBeTruthy();
    expect(screen.getByText(/25% of total/i)).toBeTruthy();
  });

  it('ends on Move In with the contingency spend-down and rating', async () => {
    renderWizard();
    await seedNameAndBudget();
    await advance(12);

    expect(screen.getAllByText('Move In').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/Contingency spend-down/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Solar geyser/i)).toBeTruthy();
    expect(screen.getByText(/Borehole/i)).toBeTruthy();
    expect(screen.getByText('Digital handover pack')).toBeTruthy();
    expect(screen.getByText('Finish & open my project')).toBeTruthy();
  });
});
