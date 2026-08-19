import { useCallback, useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  Users,
  Check,
  Shield,
  ArrowRight,
  ArrowLeft,
  FileText,
  Landmark,
} from 'lucide-react';
import type { BoqResult } from '@/adapters/designToBoq';
import { useGreenFlagStore } from '@/stores/greenFlagStore';
import { useProjectStore } from '@/stores/projectStore';
import {
  ASSEMBLY_PATHS,
  bestFitContractor,
  FORTRESS_FEE_RANGE_PCT,
  MILESTONE_SPLIT,
  money,
  MATERIALS_TRANSPARENCY,
  MATERIALS_TOTAL_CENTS,
  FORCE_MAJEURE_CLAUSE,
  ACCELERATED_TIERS,
  WIZARD_STEPS,
  type WizardStep,
  type BestFitOptions,
} from '@/engine/greenflag/teamAssembly';
import type { AssemblyPath, ContractorCandidate, TeamAssignment } from '@/domain/greenflag';
import { StageScaffold } from './StageScaffold';
import {
  DataTable,
  DzCard,
  DzPill,
  FormField,
  Kicker,
  PageEnter,
  ContractorMatchCard,
  MaterialsTransparencyPanel,
} from '@/components/dzenhare';

// ---------------------------------------------------------------------------
// TeamAssemblyWizard — DREAM → PLAN → PICK → BUILD → MOVE IN
// ---------------------------------------------------------------------------

const CONTRACT_LOCK_DAYS = 30;
const contractLockDate = new Date(Date.now() + CONTRACT_LOCK_DAYS * 86_400_000).toISOString().slice(0, 10);

function StepIndicator({ current, steps }: { current: WizardStep; steps: typeof WIZARD_STEPS }) {
  const idx = steps.findIndex((s) => s.id === current);
  return (
    <div className="flex items-center gap-1">
      {steps.map((step, i) => (
        <div key={step.id} className="flex items-center">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold transition-colors ${
              i < idx
                ? 'bg-forest text-white dark:bg-gold dark:text-[#1a1a1a]'
                : i === idx
                  ? 'bg-[var(--brand-accent)] text-white'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
            }`}
          >
            {i < idx ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : i + 1}
          </div>
          {i < steps.length - 1 && (
            <div className={`mx-1 h-0.5 w-6 ${i < idx ? 'bg-forest dark:bg-gold' : 'bg-[var(--bg-tertiary)]'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PLAN step — path selector
// ---------------------------------------------------------------------------

function PlanStep({
  path,
  setPath,
  onNext,
}: {
  path: AssemblyPath;
  setPath: (p: AssemblyPath) => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-4">
      <DzCard className="p-4">
        <Kicker>Choose how the build is run</Kicker>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Three assembly paths — pick the one that fits your build style.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {ASSEMBLY_PATHS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPath(p.id)}
              className={`rounded-xl border p-4 text-left transition-all ${
                path === p.id
                  ? 'border-[var(--brand-accent)] bg-[var(--brand-primary)]/10 shadow-sm'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/40 hover:border-[var(--brand-primary)]/50'
              }`}
            >
              <p className="font-display text-sm font-bold text-[var(--text-primary)]">{p.label}</p>
              <p className="mt-1 text-[11px] text-[var(--text-muted)]">{p.description}</p>
              <ul className="mt-3 space-y-1">
                {p.includes.map((i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[11px] text-[var(--text-secondary)]">
                    <Check className="mt-0.5 h-3 w-3 shrink-0 text-[var(--brand-accent)]" aria-hidden="true" />
                    {i}
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>
      </DzCard>

      <DzCard className="p-4">
        <Kicker>Milestone split (P4P)</Kicker>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {MILESTONE_SPLIT.map((m) => (
            <div key={m.name} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/50 px-3 py-2">
              <p className="text-[11px] text-[var(--text-muted)]">{m.name}</p>
              <p className="font-mono text-lg font-bold tabular-nums text-[var(--text-primary)]">{m.pct}%</p>
            </div>
          ))}
        </div>
      </DzCard>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onNext}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand-primary)] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110"
        >
          Next: Pick <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PICK step — contractor match card
// ---------------------------------------------------------------------------

function PickStep({
  best,
  search,
  setSearch,
  ownerName,
  setOwnerName,
  onNext,
  onBack,
}: {
  best: ReturnType<typeof bestFitContractor>;
  search: string;
  setSearch: (v: string) => void;
  ownerName: string;
  setOwnerName: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-4">
      <DzCard className="p-4">
        <Kicker>Match your contractor</Kicker>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <FormField
            id="c2-search"
            label="Specialisation"
            hint="e.g. Structural, Masonry, Finishes"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <FormField
            id="c2-owner"
            label="Your name"
            hint="For the contract"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
          />
        </div>
      </DzCard>

      {best ? (
        <ContractorMatchCard
          name={best.candidate.name}
          category={best.candidate.specialization}
          rating={best.candidate.rating}
          reviews={best.candidate.reviews}
          wipaaScore={best.candidate.wipaaPct}
          metrics={[
            { key: 'location', icon: 'location', label: 'Proximity', value: `${best.candidate.distanceKm}km away` },
            { key: 'portfolio', icon: 'portfolio', label: 'Specialization', value: best.candidate.specialization },
            { key: 'timeline', icon: 'timeline', label: 'Available', value: best.candidate.availableFrom },
            { key: 'trend', icon: 'trend', label: 'Projects', value: `${best.candidate.projectCount} completed` },
          ]}
          onApprove={onNext}
          onAlternatives={() => {}}
          onViewProjects={() => {}}
        />
      ) : (
        <DzCard className="p-6 text-center">
          <Users className="mx-auto h-8 w-8 text-[var(--text-muted)]" aria-hidden="true" />
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            No verified contractors in the hub for &ldquo;{search}&rdquo;.
          </p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Build the Resource Hub (C1) first — or try a different specialisation.
          </p>
        </DzCard>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-default)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!best}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand-primary)] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50"
        >
          Next: Build <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BUILD step — materials transparency + contract
// ---------------------------------------------------------------------------

function BuildStep({
  path,
  best,
  totalCents,
  onLock,
  locked,
  onBack,
}: {
  path: AssemblyPath;
  best: ReturnType<typeof bestFitContractor>;
  totalCents: number;
  onLock: () => void;
  locked: boolean;
  onBack: () => void;
}) {
  const tier = path === 'for-them'
    ? ACCELERATED_TIERS[2]
    : path === 'together'
      ? ACCELERATED_TIERS[0]
      : null;

  return (
    <div className="space-y-4">
      <MaterialsTransparencyPanel
        materials={MATERIALS_TRANSPARENCY}
        totalCents={MATERIALS_TOTAL_CENTS}
        lockedUntil={contractLockDate}
      />

      <DzCard className="p-4">
        <Kicker>Contract & payment structure</Kicker>
        <div className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">Contract value</span>
            <span className="font-mono tabular-nums text-[var(--text-primary)]">{money(totalCents)}</span>
          </div>
          {tier && (
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">{tier.label} fee</span>
              <span className="font-mono tabular-nums text-[var(--brand-accent)]">{tier.feePct}%</span>
            </div>
          )}
          {path !== 'alone' && (
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Fortress range</span>
              <span className="font-mono tabular-nums text-[var(--brand-accent)]">
                {FORTRESS_FEE_RANGE_PCT.min}–{FORTRESS_FEE_RANGE_PCT.max}%
              </span>
            </div>
          )}
          <div className="border-t border-[var(--border-subtle)] pt-2">
            <p className="mb-2 text-xs font-semibold text-[var(--text-secondary)]">Milestone split (P4P)</p>
            {MILESTONE_SPLIT.map((m) => (
              <div key={m.name} className="flex justify-between text-xs">
                <span className="text-[var(--text-muted)]">{m.name}</span>
                <span className="font-mono tabular-nums text-[var(--text-primary)]">{m.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </DzCard>

      <DzCard className="p-4">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-[var(--brand-accent)]" aria-hidden="true" />
          <Kicker>Force majeure clause</Kicker>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">{FORCE_MAJEURE_CLAUSE}</p>
      </DzCard>

      {best && path === 'together' && (
        <DzCard className="p-4">
          <Kicker>Why {best.candidate.name.split(' ')[0]}?</Kicker>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {best.reasons.map((r) => (
              <div key={r} className="flex items-start gap-2 rounded-lg bg-[var(--bg-tertiary)]/60 px-3 py-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden="true" />
                <span className="text-xs text-[var(--text-secondary)]">{r}</span>
              </div>
            ))}
          </div>
        </DzCard>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-default)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
        </button>
        <button
          type="button"
          onClick={onLock}
          disabled={locked}
          className="inline-flex items-center gap-2 rounded-lg bg-forest px-5 py-2.5 text-sm font-semibold text-white transition-all duration-150 hover:scale-[1.02] hover:bg-[#145A44] active:scale-[0.98] disabled:opacity-50 dark:bg-gold dark:text-[#1a1a1a] dark:hover:bg-[#d8b338]"
        >
          {locked ? (
            <><Check className="h-4 w-4" aria-hidden="true" /> Team locked</>
          ) : (
            <><FileText className="h-4 w-4" aria-hidden="true" /> Lock team & generate contract</>
          )}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MOVE-IN step — locked team summary
// ---------------------------------------------------------------------------

function MoveInStep({
  assignment,
  path,
}: {
  assignment: TeamAssignment;
  path: AssemblyPath;
}) {
  return (
    <PageEnter className="space-y-4">
      <DzCard className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <Kicker>Team locked</Kicker>
            <p className="mt-1 font-display text-lg font-bold text-[var(--text-primary)]">
              {assignment.contractorName ?? 'Self-build (owner-led)'}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              path <span className="font-semibold text-[var(--brand-accent)]">{path}</span> · contract{' '}
              <span className="font-mono">{assignment.contractRef}</span>
            </p>
          </div>
          <DzPill tone="verified">Locked</DzPill>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {assignment.milestoneSplit.map((m) => (
            <div key={m.name} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/50 px-3 py-2">
              <p className="text-[11px] text-[var(--text-muted)]">{m.name}</p>
              <p className="font-mono text-sm font-bold tabular-nums text-[var(--text-primary)]">{m.pct}%</p>
            </div>
          ))}
        </div>
        <ul className="mt-3 space-y-1">
          {assignment.terms.map((t) => (
            <li key={t} className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
              <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-400" aria-hidden="true" />
              {t}
            </li>
          ))}
        </ul>
      </DzCard>

      <MaterialsTransparencyPanel
        materials={MATERIALS_TRANSPARENCY}
        totalCents={MATERIALS_TOTAL_CENTS}
        lockedUntil={contractLockDate}
      />

      <DzCard className="p-4">
        <div className="flex items-center gap-2">
          <Landmark className="h-4 w-4 text-[var(--brand-accent)]" aria-hidden="true" />
          <Kicker>Contract generated</Kicker>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">{FORCE_MAJEURE_CLAUSE}</p>
        <div className="mt-3 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-center">
          <p className="text-sm font-semibold text-emerald-400">Your build team is locked and the contract is ready.</p>
        </div>
      </DzCard>
    </PageEnter>
  );
}

// ---------------------------------------------------------------------------
// Main stage component
// ---------------------------------------------------------------------------

export function C2TeamAssemblyStage({ boq }: { boq: BoqResult | null }) {
  const projectId = useProjectStore((s) => s.currentProjectId);
  const projectName = useProjectStore((s) => s.currentProject?.name ?? 'Budget Engineer Project');
  const { resources, teamAssignments, isLoading, loadForProject, assignTeam } = useGreenFlagStore(
    useShallow((s) => ({
      resources: s.resources,
      teamAssignments: s.teamAssignments,
      isLoading: s.isLoading,
      loadForProject: s.loadForProject,
      assignTeam: s.assignTeam,
    })),
  );

  const [step, setStep] = useState<WizardStep>('plan');
  const [path, setPath] = useState<AssemblyPath>('alone');
  const [ownerName, setOwnerName] = useState('');
  const [search, setSearch] = useState('Structural');
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (projectId) loadForProject(projectId);
  }, [projectId, loadForProject]);

  const totalCents = boq ? Math.round(boq.summary.grandTotal * 100) : 4_120_000;

  const contractors = useMemo(
    () => resources.filter((r) => r.category === 'contractor') as unknown as ContractorCandidate[],
    [resources],
  );

  const bestFitOptions: BestFitOptions = useMemo(() => ({ specialization: search, availableFrom: '2026-07-01' }), [search]);
  const best = useMemo(
    () => (contractors.length ? bestFitContractor(contractors, bestFitOptions) : null),
    [contractors, bestFitOptions],
  );

  const current = teamAssignments[0];

  const handleLock = useCallback(() => {
    if (!projectId || locked) return;
    setLocked(true);
    setStep('move-in');
    void assignTeam(projectId, {
      path,
      ownerName: ownerName.trim() || 'Project Owner',
      projectName,
      contractor: best?.candidate ?? null,
      totalCents,
    });
  }, [projectId, locked, path, ownerName, projectName, best, totalCents, assignTeam]);

  const nextStep = useCallback(() => {
    const idx = WIZARD_STEPS.findIndex((s) => s.id === step);
    if (idx < WIZARD_STEPS.length - 1) setStep(WIZARD_STEPS[idx + 1].id);
  }, [step]);
  const prevStep = useCallback(() => {
    const idx = WIZARD_STEPS.findIndex((s) => s.id === step);
    if (idx > 0) setStep(WIZARD_STEPS[idx - 1].id);
  }, [step]);

  // If already locked, show the locked view directly
  if (current) {
    return (
      <StageScaffold
        stageId="c2-team-assembly"
        icon={Users}
        empty={false}
      >
        <PageEnter className="space-y-4">
          <div className="flex items-center justify-between">
            <StepIndicator current="move-in" steps={WIZARD_STEPS} />
          </div>
          <MoveInStep assignment={current} path={current.path} />
        </PageEnter>
      </StageScaffold>
    );
  }

  return (
    <StageScaffold
      stageId="c2-team-assembly"
      icon={Users}
      empty={!isLoading && resources.length === 0}
      emptyTitle="No contractors discovered"
      emptyMessage="Build the Resource Hub (C1) first — Team Assembly matches verified contractors from the hub."
    >
      <PageEnter className="space-y-4">
        <div className="flex items-center justify-between">
          <StepIndicator current={step} steps={WIZARD_STEPS} />
          <span className="text-xs font-semibold text-[var(--text-muted)]">
            {WIZARD_STEPS.find((s) => s.id === step)?.description}
          </span>
        </div>

        {step === 'plan' && <PlanStep path={path} setPath={setPath} onNext={nextStep} />}
        {step === 'pick' && (
          <PickStep
            best={best}
            search={search}
            setSearch={setSearch}
            ownerName={ownerName}
            setOwnerName={setOwnerName}
            onNext={nextStep}
            onBack={prevStep}
          />
        )}
        {step === 'build' && (
          <BuildStep
            path={path}
            best={best}
            totalCents={totalCents}
            onLock={handleLock}
            locked={locked}
            onBack={prevStep}
          />
        )}
        {step === 'move-in' && (
          <>
            <DzCard className="p-4 text-center">
              <Check className="mx-auto h-8 w-8 text-emerald-400" aria-hidden="true" />
              <p className="mt-2 font-display text-lg font-bold text-[var(--text-primary)]">Team assembly complete</p>
              <p className="text-sm text-[var(--text-muted)]">Your build team is locked. Proceed to Build & Comply (C3).</p>
            </DzCard>
          </>
        )}

        {contractors.length > 0 && step === 'plan' && (
          <DzCard className="p-4">
            <Kicker>Candidate pool (from Resource Hub)</Kicker>
            <DataTable
              columns={[
                { key: 'name', header: 'Contractor' },
                { key: 'specialization', header: 'Specialisation' },
                { key: 'rating', header: 'Rating', render: (r) => `${r.rating.toFixed(1)}★` },
                { key: 'wipaaPct', header: 'WIPAA', align: 'right', render: (r) => `${r.wipaaPct}%` },
                { key: 'trueProfitabilityPct', header: 'True profit', align: 'right', render: (r) => `${r.trueProfitabilityPct}%` },
                { key: 'verified', header: '', render: () => <DzPill tone="verified">Hub verified</DzPill> },
              ]}
              rows={contractors}
              rowKey={(r) => r.id}
              className="mt-2"
            />
          </DzCard>
        )}
      </PageEnter>
    </StageScaffold>
  );
}
