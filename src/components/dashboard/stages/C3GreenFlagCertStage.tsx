import { useCallback, useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  ShieldCheck,
  Star,
  Clock,
  Users,
  Award,
  ExternalLink,
  CheckCircle2,
  FileCheck,
  Video,
  Calculator,
} from 'lucide-react';
import { useGreenFlagStore } from '@/stores/greenFlagStore';
import { useProjectStore } from '@/stores/projectStore';
import {
  CREDENTIAL_CHECKS,
  REBATE_TIERS,
  SAZ_CERTIFIED_PRODUCTS,
  ROLE_CERTIFICATIONS,
  certifyEntity,
  rebateForTier,
  rebateForContract,
  autoVerifyProduct,
  type CertificationInput,
  type CredentialSet,
} from '@/engine/greenflag/certification';
import type { ScoreTier, RoleCertRequirement } from '@/domain/greenflag';
import { StageScaffold } from './StageScaffold';
import { DataTable, DzCard, DzPill, FormField, GreenFlagBadge, Kicker, PageEnter } from '@/components/dzenhare';

/* -------------------------------------------------------------------------- */
/*  Constants                                                                */
/* -------------------------------------------------------------------------- */

const TIER_TONE: Record<ScoreTier, 'verified' | 'released' | 'neutral'> = {
  platinum: 'verified',
  gold: 'released',
  silver: 'neutral',
};

const TIER_LABEL: Record<ScoreTier, string> = {
  platinum: 'Platinum',
  gold: 'Gold',
  silver: 'Silver',
};

const KYC_STEPS = [
  { id: 'docs', label: 'Document Upload', description: 'Company registration, tax clearance, bank details' },
  { id: 'verify', label: 'ZIMRA / NSSA Verify', description: 'Automated KYC/AML credential verification' },
  { id: 'architect', label: 'Architect Registry (SI 56/2025)', description: 'ACZ-registered professional validation' },
  { id: 'score', label: 'Green Flag Scorecard', description: 'Public scorecard + tier + rebate issued' },
] as const;

/* -------------------------------------------------------------------------- */
/*  Sub-components                                                           */
/* -------------------------------------------------------------------------- */

function PublicScorecardCard({ input }: { input: CertificationInput }) {
  const r = certifyEntity(input);
  const sc = r.publicScorecard;

  return (
    <DzCard className="p-4">
      <Kicker>Public Scorecard</Kicker>
      <div className="mt-3 flex items-center gap-4">
        <GreenFlagBadge name={input.entityName || 'Entity'} verified={r.checks} />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-[var(--bg-tertiary)] p-3 text-center">
          <Clock className="mx-auto mb-1 h-4 w-4 text-emerald-400" />
          <p className="font-mono text-lg font-bold text-[var(--text-primary)]">{sc.onTimePct}%</p>
          <p className="text-[10px] text-[var(--text-muted)]">On-Time</p>
        </div>
        <div className="rounded-lg bg-[var(--bg-tertiary)] p-3 text-center">
          <Star className="mx-auto mb-1 h-4 w-4 text-gold" />
          <p className="font-mono text-lg font-bold text-[var(--text-primary)]">{sc.rating.toFixed(1)}★</p>
          <p className="text-[10px] text-[var(--text-muted)]">{sc.reviewCount} reviews</p>
        </div>
        <div className="rounded-lg bg-[var(--bg-tertiary)] p-3 text-center">
          <Users className="mx-auto mb-1 h-4 w-4 text-[var(--brand-accent)]" />
          <p className="font-mono text-lg font-bold text-[var(--text-primary)]">{sc.projectCount}</p>
          <p className="text-[10px] text-[var(--text-muted)]">Projects</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-[var(--bg-tertiary)] p-3">
          <p className="text-[10px] text-[var(--text-muted)]">WIPAA Health</p>
          <p className="font-mono text-sm font-bold text-[var(--text-primary)]">{sc.wipaaHealthPct}%</p>
        </div>
        <div className="rounded-lg bg-[var(--bg-tertiary)] p-3">
          <p className="text-[10px] text-[var(--text-muted)]">Quality</p>
          <p className="font-mono text-sm font-bold text-[var(--text-primary)]">{sc.qualityPct}%</p>
        </div>
      </div>
    </DzCard>
  );
}

function RebateTierTable({ tier, contractDollars }: { tier: ScoreTier; contractDollars: number }) {
  const effective = rebateForContract(tier, contractDollars);

  return (
    <DzCard className="p-4">
      <Kicker>Dual-Source Rebate Tiers</Kicker>
      <p className="mt-2 text-xs text-[var(--text-muted)]">
        SADC market index + group-buy aggregator rebates by contract value.
      </p>
      <div className="mt-3 space-y-2">
        {REBATE_TIERS.map((t) => {
          const active = t.tier === tier;
          return (
            <div
              key={t.tier}
              className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs ${
                active
                  ? 'border-emerald-500/50 bg-emerald-500/10'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-tertiary)]'
              }`}
            >
              <div>
                <span className="font-semibold text-[var(--text-primary)]">{TIER_LABEL[t.tier]}</span>
                <span className="ml-2 text-[var(--text-muted)]">
                  ${t.minContractDollars / 1000}k–{t.maxContractDollars ? `$${t.maxContractDollars / 1000}k` : '∞'}
                </span>
              </div>
              <div className="text-right">
                <span className="font-mono font-bold text-[var(--text-primary)]">{t.totalPct}%</span>
                <span className="ml-1 text-[var(--text-muted)]">
                  ({t.marketIndexPct}% + {t.groupBuyPct}%)
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {contractDollars > 0 && (
        <p className="mt-2 text-[11px] text-[var(--text-muted)]">
          Effective for ${contractDollars.toLocaleString()} contract: {effective.totalPct}% ({effective.marketIndexPct}% market index + {effective.groupBuyPct}% group-buy)
        </p>
      )}
    </DzCard>
  );
}

function ProductCertsPanel({ projectId }: { projectId: string }) {
  const certs = useMemo(() => {
    return SAZ_CERTIFIED_PRODUCTS.map((p) =>
      autoVerifyProduct(p.name, projectId) ?? {
        id: `pc-manual-${p.number}`,
        projectId,
        productName: p.name,
        supplierId: `manual-${p.standard.toLowerCase()}`,
        supplierName: p.name.split(' ')[0],
        standard: p.standard,
        standardNumber: p.number,
        description: p.description,
        verified: false,
        verifiedAt: null,
      },
    );
  }, [projectId]);

  return (
    <DzCard className="p-4">
      <Kicker>Product Certifications (SAZ / SABS)</Kicker>
      <div className="mt-3 space-y-2">
        {certs.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] px-3 py-2"
          >
            <div>
              <p className="text-xs font-semibold text-[var(--text-primary)]">{c.productName}</p>
              <p className="text-[10px] text-[var(--text-muted)]">
                {c.standard} {c.standardNumber} — {c.description}
              </p>
            </div>
            {c.verified ? (
              <DzPill tone="verified">Certified</DzPill>
            ) : (
              <DzPill tone="neutral">Pending</DzPill>
            )}
          </div>
        ))}
      </div>
    </DzCard>
  );
}

function RoleCertsPanel() {
  const [roles, setRoles] = useState<RoleCertRequirement[]>(ROLE_CERTIFICATIONS);

  const toggle = useCallback((roleId: string) => {
    setRoles((prev) =>
      prev.map((r) =>
        r.id === roleId ? { ...r, completed: !r.completed, completedAt: r.completed ? null : new Date().toISOString() } : r,
      ),
    );
  }, []);

  const completedCount = roles.filter((r) => r.completed).length;

  return (
    <DzCard className="p-4">
      <Kicker>Role-Specific Certifications</Kicker>
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        {completedCount}/{roles.length} roles certified — 15-30 min video walkthrough + TCO calculator.
      </p>
      <div className="mt-3 space-y-2">
        {roles.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] px-3 py-2"
          >
            <div className="flex items-center gap-2">
              {r.completed ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <div className="h-4 w-4 rounded-full border-2 border-[var(--border-default)]" />
              )}
              <div>
                <p className="text-xs font-semibold text-[var(--text-primary)]">{r.label}</p>
                <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
                  <span className="flex items-center gap-0.5">
                    <Video className="h-3 w-3" /> {r.videoMinutes} min
                  </span>
                  {r.tcoRequired && (
                    <span className="flex items-center gap-0.5">
                      <Calculator className="h-3 w-3" /> TCO
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => toggle(r.id)}
              className={`rounded-md px-2 py-1 text-[10px] font-semibold transition-colors ${
                r.completed
                  ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {r.completed ? 'Certified' : 'Mark complete'}
            </button>
          </div>
        ))}
      </div>
    </DzCard>
  );
}

function KycWorkflowSteps({ activeStep }: { activeStep: number }) {
  return (
    <DzCard className="p-4">
      <Kicker>KYC/AML Workflow</Kicker>
      <div className="mt-3 flex items-start gap-0">
        {KYC_STEPS.map((step, i) => {
          const isActive = i === activeStep;
          const isDone = i < activeStep;
          return (
            <div key={step.id} className="flex flex-1 items-start">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                    isDone
                      ? 'bg-emerald-500 text-white'
                      : isActive
                        ? 'bg-[var(--brand-accent)] text-[var(--brand-primary)]'
                        : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
                  }`}
                >
                  {isDone ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                </div>
                <p className="mt-1.5 text-center text-[10px] font-semibold text-[var(--text-primary)]">{step.label}</p>
                <p className="mt-0.5 text-center text-[9px] text-[var(--text-muted)] max-w-[100px]">{step.description}</p>
              </div>
              {i < KYC_STEPS.length - 1 && (
                <div className={`mx-1 mt-4 h-0.5 flex-1 rounded ${isDone ? 'bg-emerald-500' : 'bg-[var(--border-default)]'}`} />
              )}
            </div>
          );
        })}
      </div>
    </DzCard>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main stage                                                               */
/* -------------------------------------------------------------------------- */

export function C3GreenFlagCertStage() {
  const projectId = useProjectStore((s) => s.currentProjectId);
  const { contractorScorecards, supplierScorecards, isLoading, loadForProject, certifyContractor, certifySupplier } =
    useGreenFlagStore(
      useShallow((s) => ({
        contractorScorecards: s.contractorScorecards,
        supplierScorecards: s.supplierScorecards,
        isLoading: s.isLoading,
        loadForProject: s.loadForProject,
        certifyContractor: s.certifyContractor,
        certifySupplier: s.certifySupplier,
      })),
    );

  const [kind, setKind] = useState<'contractor' | 'supplier'>('contractor');
  const [entityName, setEntityName] = useState('');
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [architectNo, setArchitectNo] = useState('');
  const [rating, setRating] = useState(4.5);
  const [projectCount, setProjectCount] = useState(3);
  const [onTimePct, setOnTimePct] = useState(90);
  const [wipaaPct, setWipaaPct] = useState(80);
  const [qualityPct, setQualityPct] = useState(92);
  const [reviewCount, setReviewCount] = useState(24);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (projectId) loadForProject(projectId);
  }, [projectId, loadForProject]);

  const toggleCheck = useCallback((id: string) => {
    setChecks((c) => ({ ...c, [id]: !c[id] }));
  }, []);

  const previewInput: CertificationInput = useMemo(
    () => ({
      projectId: projectId ?? 'preview',
      entityId: `preview-${kind}`,
      entityName: entityName || 'Candidate',
      credentials: { ...checks, architectRegistrationNumber: architectNo || undefined } as CredentialSet,
      rating,
      projectCount,
      onTimeDeliveryPct: onTimePct,
      wipaaPct,
      qualityPct,
      reviewCount,
      kind,
    }),
    [projectId, kind, entityName, checks, architectNo, rating, projectCount, onTimePct, wipaaPct, qualityPct, reviewCount],
  );

  const previewResult = useMemo(() => certifyEntity(previewInput), [previewInput]);

  const kycStep = useMemo(() => {
    const checked = Object.values(checks).filter(Boolean).length;
    const total = CREDENTIAL_CHECKS.length;
    if (checked === 0) return 0;
    if (checked < total - 1) return 1;
    if (architectNo && !previewResult.architectRegistered) return 2;
    if (previewResult.score >= 80) return 3;
    return 2;
  }, [checks, architectNo, previewResult]);

  const handleCertify = useCallback(async () => {
    if (!projectId || busy || !entityName.trim()) return;
    setBusy(true);
    try {
      if (kind === 'contractor') await certifyContractor(previewInput);
      else await certifySupplier(previewInput);
      setEntityName('');
      setChecks({});
      setArchitectNo('');
    } finally {
      setBusy(false);
    }
  }, [projectId, busy, kind, entityName, previewInput, certifyContractor, certifySupplier]);

  const cards = kind === 'contractor' ? contractorScorecards : supplierScorecards;

  const normalizedCards = useMemo(
    () =>
      cards.map((c) => ({
        id: c.id,
        entityName: 'contractorName' in c ? c.contractorName : c.supplierName,
        tier: c.tier,
        score: c.score,
        rebatePct: c.rebatePct,
        verified: c.verified,
      })),
    [cards],
  );

  return (
    <StageScaffold
      stageId="c3-green-flag-cert"
      icon={ShieldCheck}
      empty={!isLoading && contractorScorecards.length === 0 && supplierScorecards.length === 0}
      emptyTitle="No certified entities yet"
      emptyMessage="Run the KYC/AML credential checklist and SI 56/2025 Architect Registry validation to produce Green Flag scorecards."
    >
      <PageEnter className="space-y-4">
        {/* KYC Workflow Stepper */}
        <KycWorkflowSteps activeStep={kycStep} />

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Left: Certification Form */}
          <DzCard className="p-4">
            <div className="flex items-center justify-between">
              <Kicker>Certify an entity</Kicker>
              <div className="flex gap-1 rounded-lg border border-[var(--border-subtle)] p-0.5">
                {(['contractor', 'supplier'] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKind(k)}
                    className={`rounded-md px-3 py-1 text-xs font-semibold capitalize transition-colors ${
                      kind === k ? 'bg-[var(--brand-primary)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>

            <FormField
              id="c3-name"
              label={`${kind} name`}
              className="mt-3"
              value={entityName}
              onChange={(e) => setEntityName(e.target.value)}
            />

            <div className="mt-4 grid grid-cols-2 gap-3">
              <FormField
                id="c3-rating"
                label="Rating (0–5)"
                type="number"
                min={0}
                max={5}
                step={0.1}
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
              />
              <FormField
                id="c3-projects"
                label="Project count"
                type="number"
                min={0}
                value={projectCount}
                onChange={(e) => setProjectCount(Number(e.target.value))}
              />
              <FormField
                id="c3-ontime"
                label="On-time delivery %"
                type="number"
                min={0}
                max={100}
                value={onTimePct}
                onChange={(e) => setOnTimePct(Number(e.target.value))}
              />
              <FormField
                id="c3-wipaa"
                label="WIPAA %"
                type="number"
                min={0}
                max={100}
                value={wipaaPct}
                onChange={(e) => setWipaaPct(Number(e.target.value))}
              />
              <FormField
                id="c3-quality"
                label="Quality %"
                type="number"
                min={0}
                max={100}
                value={qualityPct}
                onChange={(e) => setQualityPct(Number(e.target.value))}
              />
              <FormField
                id="c3-reviews"
                label="Review count"
                type="number"
                min={0}
                value={reviewCount}
                onChange={(e) => setReviewCount(Number(e.target.value))}
              />
            </div>

            {/* KYC/AML Credential Checklist */}
            <p className="mb-2 mt-4 text-xs font-semibold text-[var(--text-secondary)]">
              <FileCheck className="mr-1 inline h-3.5 w-3.5" />
              Credential checklist (KYC/AML)
            </p>
            <div className="space-y-1.5">
              {CREDENTIAL_CHECKS.map((c) =>
                c.id === 'architect-registry' ? (
                  <div key={c.id} className="flex items-center gap-2">
                    <input
                      id="c3-arch"
                      type="checkbox"
                      className="h-4 w-4 accent-[var(--brand-accent)]"
                      checked={Boolean(checks[c.id])}
                      onChange={() => toggleCheck(c.id)}
                    />
                    <label htmlFor="c3-arch" className="flex-1 text-xs text-[var(--text-secondary)]">{c.label}</label>
                    <input
                      aria-label="SI 56 registration number"
                      placeholder="ACZ-…"
                      className="w-28 rounded-md border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1 font-mono text-xs text-[var(--text-primary)]"
                      value={architectNo}
                      onChange={(e) => setArchitectNo(e.target.value)}
                    />
                  </div>
                ) : (
                  <label key={c.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[var(--brand-accent)]"
                      checked={Boolean(checks[c.id])}
                      onChange={() => toggleCheck(c.id)}
                    />
                    <span className="text-xs text-[var(--text-secondary)]">{c.label}</span>
                    <span className="ml-auto text-[10px] text-[var(--text-muted)]">+{c.points}</span>
                  </label>
                ),
              )}
            </div>

            <button
              type="button"
              onClick={handleCertify}
              disabled={busy || !entityName.trim() || !projectId}
              className="mt-4 w-full rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50"
            >
              {busy ? 'Certifying…' : 'Certify & issue Green Flag'}
            </button>
          </DzCard>

          {/* Right: Live Preview */}
          <DzCard className="p-4">
            <Kicker>Live preview — {kind} scorecard</Kicker>
            <div className="mt-3 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/10 font-display text-xl font-bold text-[var(--brand-accent)]">
                {previewResult.tier.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <p className="font-display text-lg font-bold text-[var(--text-primary)]">{entityName || 'Candidate'}</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {previewResult.score}/100 · {previewResult.tier} · {previewResult.rebatePct}% rebate
                </p>
                {previewResult.architectRegistered && previewResult.architectName && (
                  <p className="mt-0.5 text-[11px] font-mono text-emerald-400">
                    <Award className="mr-0.5 inline h-3 w-3" />
                    SI 56: {previewResult.architectName}
                  </p>
                )}
              </div>
            </div>
            <ul className="mt-3 space-y-1">
              {CREDENTIAL_CHECKS.filter((c) => checks[c.id]).map((c) => (
                <li key={c.id} className="flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
                  <span>✓ {c.label}</span>
                  <span className="text-[var(--text-muted)]">+{c.points}</span>
                </li>
              ))}
              {architectNo && previewResult.architectRegistered && (
                <li className="flex items-center justify-between text-[11px] text-emerald-400">
                  <span>✓ SI 56/2025: {previewResult.architectName}</span>
                  <span>+14</span>
                </li>
              )}
              {architectNo && !previewResult.architectRegistered && (
                <li className="text-[11px] text-safetyOrange">
                  ✗ SI 56: {architectNo} — not found in ACZ registry
                </li>
              )}
            </ul>
            <p className="mt-3 text-xs text-[var(--text-muted)]">
              Score: 10/10/8-point credentials + 14 registered architect + 5 rating + 5 projects + 6 on-time + 2 WIPAA.
            </p>
          </DzCard>
        </div>

        {/* Public Scorecard */}
        <PublicScorecardCard input={previewInput} />

        {/* Rebate Tiers + Product/Role Certs */}
        <div className="grid gap-4 lg:grid-cols-2">
          <RebateTierTable tier={previewResult.tier} contractDollars={150_000} />
          {projectId && <ProductCertsPanel projectId={projectId} />}
        </div>

        <RoleCertsPanel />

        {/* Scorecards table */}
        <DzCard className="p-4">
          <div className="flex items-center justify-between">
            <Kicker>Scorecards — {cards.length} certified</Kicker>
            <a
              href="#"
              className="flex items-center gap-1 text-xs text-[var(--brand-accent)] hover:underline"
              onClick={(e) => e.preventDefault()}
            >
              <ExternalLink className="h-3 w-3" /> View on public profile
            </a>
          </div>
          <DataTable
            columns={[
              { key: 'entityName', header: 'Entity' },
              {
                key: 'tier',
                header: 'Tier',
                render: (r) => <DzPill tone={TIER_TONE[r.tier]}>{r.tier}</DzPill>,
              },
              { key: 'score', header: 'Score', align: 'right', render: (r) => `${r.score}/100` },
              { key: 'rebatePct', header: 'Rebate', align: 'right', render: (r) => `${r.rebatePct}%` },
              { key: 'verified', header: 'Flag', render: (r) => (r.verified ? <DzPill tone="verified">Green Flag</DzPill> : <DzPill tone="disputed">Not verified</DzPill>) },
            ]}
            rows={normalizedCards}
            rowKey={(r) => r.id}
            className="mt-2"
          />
          {normalizedCards.length > 0 && (
            <p className="mt-2 text-[11px] text-[var(--text-muted)]">
              Tier rebates: silver {rebateForTier('silver')}% · gold {rebateForTier('gold')}% · platinum {rebateForTier('platinum')}%
            </p>
          )}
        </DzCard>
      </PageEnter>
    </StageScaffold>
  );
}
