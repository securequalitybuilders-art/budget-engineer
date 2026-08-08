import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { useProjectStore } from '@/stores/projectStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  ChevronLeft,
  ChevronRight,
  Building2,
  Home,
  School,
  Briefcase,
  Stethoscope,
  CheckCircle2,
  Shield,
  Sparkles,
  MapPin,
  Package,
  Hammer,
  KeyRound,
} from 'lucide-react';
import type { UserProfile, Region, Currency } from '@/types';
import { cn } from '@/lib/utils';
import {
  DREAM_PHASES,
  JOURNEY_STEPS,
  FUNDING_SOURCES,
  FINISH_CATALOG,
  MATERIALS_LINES,
  SPEND_DOWN_OPTIONS,
  buildBuildPlan,
  buildConceptOptions,
  contractorMatch,
  feasibilityVerdict,
  formatMoney,
  rateBand,
  romEstimateForType,
  type FinishOption,
} from '@/engine/onboarding/dreamJourney';

const profiles: { value: UserProfile; label: string; icon: typeof Home; desc: string }[] = [
  { value: 'first-time', label: 'First-Time Home Builder', icon: Home, desc: 'Guided step-by-step in plain English' },
  { value: 'aspirational', label: 'Aspirational Builder', icon: Building2, desc: 'Educational content, progress tracking, portfolio' },
  { value: 'institution', label: 'Institution / NGO', icon: School, desc: 'ZBC compliance, tender ready, multi-stakeholder' },
  { value: 'business', label: 'Business / Developer', icon: Briefcase, desc: 'ROI analysis, unit mix, cash flow' },
  { value: 'professional', label: 'Professional / Architect', icon: Stethoscope, desc: 'Full design suite, BIM export' },
];

const regions: { value: Region; label: string }[] = [
  { value: 'zimbabwe', label: 'Zimbabwe' },
  { value: 'south-africa', label: 'South Africa' },
  { value: 'zambia', label: 'Zambia' },
  { value: 'botswana', label: 'Botswana' },
  { value: 'other', label: 'Other SADC' },
];

const currencies: { value: Currency; label: string }[] = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'ZWG', label: 'Zimbabwe Gold (ZWG)' },
];

const buildingTypes: { value: string; label: string }[] = [
  { value: 'house-residential', label: 'Family house' },
  { value: 'duplex', label: 'Duplex / rental units' },
  { value: 'apartment-multi', label: 'Apartment block' },
  { value: 'clinic-health', label: 'Clinic / health facility' },
  { value: 'school-classroom', label: 'School / classroom' },
  { value: 'office-commercial', label: 'Office / commercial' },
  { value: 'retail-shop', label: 'Shop / retail' },
];

const BRIEF_TEMPLATES = [
  {
    label: 'Affordable family house',
    brief: '3-bedroom, 2-bathroom house with open-plan living, kitchen, and a small veranda. Total budget around $45,000. Flat site in a suburban area.',
  },
  {
    label: 'Duplex / rental units',
    brief: '2-unit duplex with 2 bedrooms each, simple finishes, shared parking. Budget $80,000. Level urban plot.',
  },
  {
    label: 'Rural clinic / NGO facility',
    brief: 'Small rural clinic with 4 consultation rooms, waiting area, pharmacy, 2 toilets. Solar power, rainwater harvesting. Budget $120,000.',
  },
  {
    label: 'Small shop / commercial space',
    brief: 'Ground-floor shop with storage room and customer WC. Open frontage, simple finishes. Budget $30,000. High-street location.',
  },
];

const planOptions = [
  {
    value: 'red-pen',
    label: 'Red Pen',
    price: 'One-off $50',
    desc: 'One-time feasibility + design review by a human reviewer. Answers the "is this realistic?" question before you spend.',
  },
  {
    value: 'guardian',
    label: 'Guardian',
    price: '$800 / month',
    desc: 'An ongoing watchdog across the whole build: budget, schedule, quality checks, and milestone gates until handover.',
  },
];

function FinishPicker({
  label,
  options,
  value,
  onChange,
  areaM2,
}: {
  label: string;
  options: FinishOption[];
  value: string;
  onChange: (id: string) => void;
  areaM2: number;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((o) => {
          const line = Math.round(o.priceCents * areaM2);
          const selected = value === o.id;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onChange(o.id)}
              className={cn(
                'flex items-center justify-between gap-2 rounded-lg border p-3 text-left transition-all',
                selected
                  ? 'border-[var(--brand-accent)] bg-[var(--brand-accent)]/10'
                  : 'border-[var(--border-default)] bg-[var(--bg-tertiary)] hover:border-[var(--text-muted)]'
              )}
            >
              <div>
                <p className="text-sm font-medium">{o.name}</p>
                <p className="text-xs text-[var(--text-secondary)]">{o.detail}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-[var(--brand-accent)]">{formatMoney(o.priceCents)}</p>
                <p className="text-xs text-[var(--text-muted)]">{o.unit}</p>
                <p className="text-xs text-[var(--text-secondary)]">{formatMoney(line)}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ProjectWizard() {
  const navigate = useNavigate();
  const { createProject, updateBrief } = useProjectStore(useShallow((s) => ({ createProject: s.createProject, updateBrief: s.updateBrief })));

  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<UserProfile>('first-time');
  const [region, setRegion] = useState<Region>('zimbabwe');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [name, setName] = useState('');
  const [brief, setBrief] = useState('');
  const [budget, setBudget] = useState('');
  const [buildingType, setBuildingType] = useState('house-residential');
  const [fundingSource, setFundingSource] = useState<string>('personal-savings');
  const [planChoice, setPlanChoice] = useState<string>('red-pen');
  const [concept, setConcept] = useState<string>('core');
  const [finishes, setFinishes] = useState<Record<string, string>>({
    floor: 'tile-600',
    walls: 'plaster-paint',
    roof: 'ibc',
    paint: 'matt-emulsion',
  });
  const [approvedPlan, setApprovedPlan] = useState(false);
  const [contractor, setContractor] = useState('kudakwashe');
  const [materialsConfirmed, setMaterialsConfirmed] = useState(false);
  const [spendDown, setSpendDown] = useState<string[]>(['solar-geyser']);
  const [rating, setRating] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);

  const currentStep = JOURNEY_STEPS[step];
  const phaseIndex = DREAM_PHASES.findIndex((p) => p.id === currentStep.phase);
  const budgetCents = budget ? Math.round(parseFloat(budget) * 100) : 0;

  const rom = useMemo(() => romEstimateForType(buildingType, region), [buildingType, region]);
  const verdict = useMemo(() => feasibilityVerdict({ buildingType, budgetCents, region }), [buildingType, budgetCents, region]);
  const concepts = useMemo(() => buildConceptOptions(buildingType), [buildingType]);
  const contractors = useMemo(() => contractorMatch(buildingType), [buildingType]);
  const baseTotal = budgetCents > 0 ? budgetCents : rom.romBestCents;
  const buildPlan = useMemo(() => buildBuildPlan(baseTotal), [baseTotal]);
  const planLines = useMemo(() => {
    const areaM2 = rom.grossAreaM2;
    let total = 0;
    const lines = (Object.keys(FINISH_CATALOG) as (keyof typeof FINISH_CATALOG)[]).map((k) => {
      const f = FINISH_CATALOG[k].find((o) => o.id === finishes[k]) ?? FINISH_CATALOG[k][0];
      const line = Math.round(f.priceCents * areaM2);
      total += line;
      return { category: k, name: f.name, line };
    });
    return { lines, total };
  }, [finishes, rom.grossAreaM2]);

  const spentDown = useMemo(() => {
    return SPEND_DOWN_OPTIONS.filter((o) => spendDown.includes(o.id)).reduce((sum, o) => sum + o.priceCents, 0);
  }, [spendDown]);

  const canNext = (() => {
    switch (currentStep.id) {
      case 'dream-welcome':
        return true;
      case 'dream-brief':
        return name.trim().length > 0;
      case 'dream-funding':
        return fundingSource.length > 0;
      case 'dream-feasibility':
        return true;
      case 'dream-activate':
        return planChoice.length > 0;
      case 'plan-sketches':
        return concept.length > 0;
      case 'plan-finishes':
        return true;
      case 'plan-lock':
        return approvedPlan;
      case 'pick-contractor':
        return contractor.length > 0;
      case 'pick-materials':
        return materialsConfirmed;
      case 'build-milestones':
        return true;
      default:
        return true;
    }
  })();

  const handleNext = async () => {
    if (currentStep.id === 'dream-activate' && !projectId) {
      setIsSubmitting(true);
      const project = await createProject({ name, profile, region, currency });
      await updateBrief(project.id, {
        rawText: brief,
        buildingType,
        floors: 1,
        location: region,
        standards: ['ZBC 1996'],
        budgetCents,
      });
      setProjectId(project.id);
      setIsSubmitting(false);
    }
    setStep(Math.min(step + 1, JOURNEY_STEPS.length - 1));
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleFinish = () => {
    if (projectId) {
      navigate(`/project/${projectId}`);
    } else {
      navigate('/');
    }
  };

  return (
    <main className="relative min-h-[calc(100vh-3.5rem)] overflow-hidden p-4">
      <div className="absolute inset-0 aurora opacity-40 pointer-events-none" />

      <div className="relative z-10 mx-auto w-full max-w-3xl space-y-4">
        <div className="flex items-center justify-between rounded-xl border border-[var(--border-default)] bg-[var(--bg-tertiary)]/60 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-2">
            {DREAM_PHASES.map((p, i) => (
              <div key={p.id} className="flex items-center gap-2">
                <span
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                    i < phaseIndex || (i === phaseIndex && currentStep.id === 'move-in-handover')
                      ? 'bg-[var(--brand-accent)] text-[var(--brand-primary-dark)]'
                      : i === phaseIndex
                        ? 'bg-[var(--brand-accent)]/30 text-[var(--brand-accent)]'
                        : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                  )}
                >
                  {i + 1}
                </span>
                <span className={cn('hidden text-xs font-medium sm:block', i === phaseIndex ? 'text-[var(--brand-accent)]' : 'text-[var(--text-muted)]')}>
                  {p.label}
                </span>
                {i < DREAM_PHASES.length - 1 && <span className="h-px w-4 bg-[var(--border-default)] sm:w-6" />}
              </div>
            ))}
          </div>
          <span className="text-xs text-[var(--text-muted)]">
            Step {step + 1} / {JOURNEY_STEPS.length}
          </span>
        </div>

        <Card className="border-beam">
          <CardHeader>
            <CardTitle className="font-display text-2xl">{currentStep.title}</CardTitle>
            <CardDescription>{currentStep.description}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {currentStep.id === 'dream-welcome' && (
              <div className="grid gap-3">
                {profiles.map((p) => {
                  const Icon = p.icon;
                  const selected = profile === p.value;
                  return (
                    <button
                      key={p.value}
                      onClick={() => setProfile(p.value)}
                      className={cn(
                        'flex items-start gap-4 rounded-lg border p-4 text-left transition-all',
                        selected
                          ? 'border-[var(--brand-accent)] bg-[var(--brand-accent)]/10'
                          : 'border-[var(--border-default)] bg-[var(--bg-tertiary)] hover:border-[var(--text-muted)]'
                      )}
                    >
                      <div
                        className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-lg',
                          selected ? 'bg-[var(--brand-accent)] text-[var(--brand-primary-dark)]' : 'bg-[var(--bg-secondary)]'
                        )}
                      >
                        <Icon size={20} />
                      </div>
                      <div>
                        <p className="font-medium">{p.label}</p>
                        <p className="text-sm text-[var(--text-secondary)]">{p.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {currentStep.id === 'dream-brief' && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="project-name">Project name</Label>
                    <Input id="project-name" placeholder="e.g., My 3-bedroom home in Borrowdale" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="building-type">Building type</Label>
                    <Select id="building-type" value={buildingType} onChange={(e) => setBuildingType(e.target.value)}>
                      {buildingTypes.map((b) => (
                        <option key={b.value} value={b.value}>
                          {b.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="region">Region</Label>
                    <Select id="region" value={region} onChange={(e) => setRegion(e.target.value as Region)}>
                      {regions.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select id="currency" value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
                      {currencies.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="budget">Total budget</Label>
                    <Input id="budget" type="number" placeholder="45000" value={budget} onChange={(e) => setBudget(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="brief">Project brief</Label>
                  <Textarea
                    id="brief"
                    placeholder="I want a 3-bedroom, 2-bathroom house with a veranda, built on a flat site in Harare. The budget is $45,000."
                    value={brief}
                    onChange={(e) => setBrief(e.target.value)}
                    rows={4}
                  />
                  <div className="flex flex-wrap gap-2">
                    {BRIEF_TEMPLATES.map((t) => (
                      <button
                        key={t.label}
                        type="button"
                        onClick={() => setBrief(t.brief)}
                        className="rounded-full border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-3 py-1 text-xs text-[var(--text-secondary)] hover:border-[var(--brand-accent)]"
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {currentStep.id === 'dream-funding' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="funding-source">Main funding source</Label>
                  <Select id="funding-source" value={fundingSource} onChange={(e) => setFundingSource(e.target.value)}>
                    {FUNDING_SOURCES.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="funding-amount">Amount available</Label>
                  <Input id="funding-amount" type="number" placeholder="40000" />
                </div>
                <div className="sm:col-span-2">
                  <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-tertiary)] p-3 text-sm text-[var(--text-secondary)]">
                    Funding source set to <span className="font-medium text-[var(--text-primary)]">{FUNDING_SOURCES.find((f) => f.value === fundingSource)?.label}</span>. Your
                    build plan and milestones are aligned to your available cash.
                  </div>
                </div>
              </div>
            )}

            {currentStep.id === 'dream-feasibility' && (
              <div className="space-y-4">
                <div
                  className={cn(
                    'rounded-xl border p-5',
                    verdict.verdict === 'go' && 'border-green-500/40 bg-green-500/5',
                    verdict.verdict === 'cautious' && 'border-amber-500/40 bg-amber-500/5',
                    verdict.verdict === 'no-go' && 'border-red-500/40 bg-red-500/5'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-display text-lg font-semibold">
                      {verdict.verdict === 'go' && 'Go — buildable'}
                      {verdict.verdict === 'cautious' && 'Proceed with care'}
                      {verdict.verdict === 'no-go' && 'No-go for now'}
                    </p>
                    <Badge variant={verdict.verdict === 'go' ? 'default' : verdict.verdict === 'cautious' ? 'secondary' : 'danger'}>
                      {verdict.coveragePct}% covered
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">{verdict.reason}</p>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="rounded-lg bg-[var(--bg-secondary)] p-3">
                      <p className="text-xs text-[var(--text-muted)]">ROM low</p>
                      <p className="font-semibold">{formatMoney(verdict.romLowCents)}</p>
                    </div>
                    <div className="rounded-lg bg-[var(--bg-secondary)] p-3">
                      <p className="text-xs text-[var(--text-muted)]">ROM best</p>
                      <p className="font-semibold">{formatMoney(verdict.romBestCents)}</p>
                    </div>
                    <div className="rounded-lg bg-[var(--bg-secondary)] p-3">
                      <p className="text-xs text-[var(--text-muted)]">ROM high</p>
                      <p className="font-semibold">{formatMoney(verdict.romHighCents)}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-[var(--text-muted)]">
                    Estimate for ~{rom.grossAreaM2} m² of floor area. ROM cost-to-complete uses a regional per-m² baseline.
                  </p>
                </div>
              </div>
            )}

            {currentStep.id === 'dream-activate' && (
              <div className="grid gap-3 sm:grid-cols-2">
                {planOptions.map((o) => {
                  const selected = planChoice === o.value;
                  const Icon = o.value === 'red-pen' ? Sparkles : Shield;
                  return (
                    <button
                      key={o.value}
                      onClick={() => setPlanChoice(o.value)}
                      className={cn(
                        'rounded-xl border p-5 text-left transition-all',
                        selected
                          ? 'border-[var(--brand-accent)] bg-[var(--brand-accent)]/10'
                          : 'border-[var(--border-default)] bg-[var(--bg-tertiary)] hover:border-[var(--text-muted)]'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Icon size={18} className="text-[var(--brand-accent)]" />
                        <p className="font-semibold">{o.label}</p>
                      </div>
                      <p className="mt-1 text-sm font-medium text-[var(--brand-accent)]">{o.price}</p>
                      <p className="mt-2 text-sm text-[var(--text-secondary)]">{o.desc}</p>
                    </button>
                  );
                })}
                <p className="text-xs text-[var(--text-muted)] sm:col-span-2">
                  This is the moment your dream becomes a project. Choosing a plan creates your project locally — no account or internet needed.
                </p>
              </div>
            )}

            {currentStep.id === 'plan-sketches' && (
              <div className="grid gap-3 sm:grid-cols-3">
                {concepts.map((c) => {
                  const selected = concept === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setConcept(c.id)}
                      className={cn(
                        'rounded-xl border p-4 text-left transition-all',
                        selected
                          ? 'border-[var(--brand-accent)] bg-[var(--brand-accent)]/10'
                          : 'border-[var(--border-default)] bg-[var(--bg-tertiary)] hover:border-[var(--text-muted)]'
                      )}
                    >
                      <div className="flex h-24 items-end justify-center rounded-lg bg-[var(--bg-secondary)] p-2">
                        <div className={cn('w-16 rounded-t-md border border-[var(--brand-accent)]/40', c.id === 'compact' && 'h-10', c.id === 'core' && 'h-14', c.id === 'extended' && 'h-16')} />
                      </div>
                      <p className="mt-3 font-semibold">{c.name}</p>
                      <p className="text-xs text-[var(--text-muted)]">{c.budgetFitLabel}</p>
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">
                        ~{c.grossAreaM2} m² · {c.storeys} storey{c.storeys > 1 ? 's' : ''}
                      </p>
                      <ul className="mt-2 space-y-1">
                        {c.highlights.slice(0, 3).map((h) => (
                          <li key={h} className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                            <CheckCircle2 size={12} className="text-green-400" />
                            {h}
                          </li>
                        ))}
                      </ul>
                    </button>
                  );
                })}
              </div>
            )}

            {currentStep.id === 'plan-finishes' && (
              <div className="space-y-5">
                <p className="text-sm text-[var(--text-secondary)]">
                  Choosing finishes across ~{rom.grossAreaM2} m². Estimated finishes subtotal:{' '}
                  <span className="font-semibold text-[var(--brand-accent)]">{formatMoney(planLines.total)}</span>
                </p>
                <FinishPicker label="Floor" options={FINISH_CATALOG.floor} value={finishes.floor} onChange={(id) => setFinishes((f) => ({ ...f, floor: id }))} areaM2={rom.grossAreaM2} />
                <FinishPicker label="Walls" options={FINISH_CATALOG.walls} value={finishes.walls} onChange={(id) => setFinishes((f) => ({ ...f, walls: id }))} areaM2={rom.grossAreaM2} />
                <FinishPicker label="Roof" options={FINISH_CATALOG.roof} value={finishes.roof} onChange={(id) => setFinishes((f) => ({ ...f, roof: id }))} areaM2={rom.grossAreaM2} />
                <FinishPicker label="Paint" options={FINISH_CATALOG.paint} value={finishes.paint} onChange={(id) => setFinishes((f) => ({ ...f, paint: id }))} areaM2={rom.grossAreaM2} />
              </div>
            )}

            {currentStep.id === 'plan-lock' && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-[var(--bg-secondary)] p-4">
                    <p className="text-xs text-[var(--text-muted)]">Build total</p>
                    <p className="font-display text-xl font-semibold">{formatMoney(buildPlan.baseTotalCents)}</p>
                  </div>
                  <div className="rounded-lg bg-[var(--bg-secondary)] p-4">
                    <p className="text-xs text-[var(--text-muted)]">Contingency {buildPlan.contingencyPct}%</p>
                    <p className="font-display text-xl font-semibold">{formatMoney(buildPlan.contingencyCents)}</p>
                  </div>
                  <div className="rounded-lg bg-[var(--brand-accent)]/10 p-4">
                    <p className="text-xs text-[var(--text-muted)]">Locked total</p>
                    <p className="font-display text-xl font-semibold text-[var(--brand-accent)]">{formatMoney(buildPlan.grandTotalCents)}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {buildPlan.milestones.map((m) => (
                    <div key={m.id} className="flex items-center justify-between rounded-lg border border-[var(--border-default)] bg-[var(--bg-tertiary)] p-3">
                      <div>
                        <p className="text-sm font-medium">{m.label}</p>
                        <p className="text-xs text-[var(--text-muted)]">{m.scope}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatMoney(m.amountCents)}</p>
                        <p className="text-xs text-[var(--text-muted)]">{m.pct}%</p>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setApprovedPlan(true)}
                  className={cn(
                    'flex w-full items-center justify-center gap-2 rounded-xl border p-4 font-medium transition-all',
                    approvedPlan
                      ? 'border-green-500/50 bg-green-500/10 text-green-400'
                      : 'border-[var(--brand-accent)] bg-[var(--brand-accent)] text-[var(--brand-primary-dark)] hover:opacity-90'
                  )}
                >
                  {approvedPlan ? (
                    <>
                      <CheckCircle2 size={18} />
                      Build plan approved and locked
                    </>
                  ) : (
                    <>
                      <KeyRound size={18} />
                      Approve & lock build plan
                    </>
                  )}
                </button>
              </div>
            )}

            {currentStep.id === 'pick-contractor' && (
              <div className="space-y-3">
                {contractors.map((c) => {
                  const selected = contractor === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setContractor(c.id)}
                      className={cn(
                        'w-full rounded-xl border p-4 text-left transition-all',
                        selected
                          ? 'border-[var(--brand-accent)] bg-[var(--brand-accent)]/10'
                          : 'border-[var(--border-default)] bg-[var(--bg-tertiary)] hover:border-[var(--text-muted)]'
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{c.name}</p>
                            {c.isRecommended && <Badge>Recommended</Badge>}
                          </div>
                          <p className="text-sm text-[var(--text-secondary)]">{c.role}</p>
                        </div>
                        <div className="text-right text-sm">
                          <p className="flex items-center justify-end gap-1 text-[var(--text-secondary)]">
                            <MapPin size={12} /> {c.proximityKm}km
                          </p>
                          <p className="text-[var(--text-muted)]">WIPAA {c.wipaaHealth}%</p>
                        </div>
                      </div>
                      <ul className="mt-2 space-y-1">
                        {c.why.map((w) => (
                          <li key={w} className="flex items-start gap-1.5 text-xs text-[var(--text-secondary)]">
                            <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-green-400" />
                            {w}
                          </li>
                        ))}
                      </ul>
                    </button>
                  );
                })}
              </div>
            )}

            {currentStep.id === 'pick-materials' && (
              <div className="space-y-4">
                <div className="overflow-hidden rounded-xl border border-[var(--border-default)]">
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--bg-secondary)]">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-muted)]">Material</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-muted)]">Supplier</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-[var(--text-muted)]">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {MATERIALS_LINES.map((m) => (
                        <tr key={m.id} className="border-t border-[var(--border-default)]">
                          <td className="px-3 py-2">
                            <p className="font-medium">{m.name}</p>
                            <p className="text-xs text-[var(--text-muted)]">{m.note}</p>
                          </td>
                          <td className="px-3 py-2 text-[var(--text-secondary)]">{m.supplier}</td>
                          <td className="px-3 py-2 text-right font-semibold">{formatMoney(m.amountCents)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  type="button"
                  onClick={() => setMaterialsConfirmed(true)}
                  className={cn(
                    'flex w-full items-center justify-center gap-2 rounded-xl border p-4 font-medium transition-all',
                    materialsConfirmed
                      ? 'border-green-500/50 bg-green-500/10 text-green-400'
                      : 'border-[var(--brand-accent)] bg-[var(--brand-accent)] text-[var(--brand-primary-dark)] hover:opacity-90'
                  )}
                >
                  {materialsConfirmed ? (
                    <>
                      <CheckCircle2 size={18} />
                      Materials confirmed — locked for 30 days
                    </>
                  ) : (
                    <>
                      <Package size={18} />
                      Confirm materials & team
                    </>
                  )}
                </button>
              </div>
            )}

            {currentStep.id === 'build-milestones' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <Hammer size={16} className="text-[var(--brand-accent)]" />
                  Your build runs on 3 milestones. Money is released to the contractor only when each is verified.
                </div>
                {buildPlan.milestones.map((m, i) => (
                  <div key={m.id} className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-tertiary)] p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand-accent)]/20 text-sm font-semibold text-[var(--brand-accent)]">
                          {i + 1}
                        </div>
                        <div>
                          <p className="font-medium">{m.label}</p>
                          <p className="text-xs text-[var(--text-muted)]">{m.scope}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatMoney(m.amountCents)}</p>
                        <p className="text-xs text-[var(--text-muted)]">{m.pct}% of total</p>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3 text-sm text-[var(--text-secondary)]">
                  During the build you'll get a weekly digest on Vault + WhatsApp. Your site agent uploads geo-tagged 360° photos — matched by AI against the plan before an
                  engineer signs off the release.
                </div>
              </div>
            )}

            {currentStep.id === 'move-in-handover' && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-[var(--text-primary)]">Contingency spend-down · {formatMoney(buildPlan.contingencyCents)}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {SPEND_DOWN_OPTIONS.map((o) => {
                      const selected = spendDown.includes(o.id);
                      return (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() =>
                            setSpendDown((prev) => (selected ? prev.filter((id) => id !== o.id) : [...prev, o.id]))
                          }
                          className={cn(
                            'flex items-center justify-between gap-2 rounded-lg border p-3 text-left transition-all',
                            selected
                              ? 'border-[var(--brand-accent)] bg-[var(--brand-accent)]/10'
                              : 'border-[var(--border-default)] bg-[var(--bg-tertiary)] hover:border-[var(--text-muted)]'
                          )}
                        >
                          <div>
                            <p className="text-sm font-medium">{o.name}</p>
                            <p className="text-xs text-[var(--text-muted)]">{o.tag}</p>
                          </div>
                          <p className="text-sm font-semibold text-[var(--brand-accent)]">{o.priceCents ? formatMoney(o.priceCents) : '—'}</p>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {formatMoney(spentDown)} allocated · {formatMoney(Math.max(0, buildPlan.contingencyCents - spentDown))} remaining
                  </p>
                </div>

                <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 text-sm">
                  <p className="font-medium">Digital handover pack</p>
                  <ul className="mt-2 space-y-1 text-[var(--text-secondary)]">
                    <li>• As-built drawings & warranties</li>
                    <li>• Service & maintenance guides</li>
                    <li>• Approved materials register</li>
                    <li>• Final account & lien waiver</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-[var(--text-primary)]">How was the experience?</p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setRating(n)}
                        className={cn('h-10 w-10 rounded-lg border text-sm font-semibold transition-all', n <= rating ? 'border-[var(--brand-accent)] bg-[var(--brand-accent)] text-[var(--brand-primary-dark)]' : 'border-[var(--border-default)] bg-[var(--bg-tertiary)]')}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">
                    Your rating: {rating}/5 — <span className={rateBand(rating).color}>{rateBand(rating).label}</span>
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="secondary" onClick={handleBack} disabled={step === 0}>
                <ChevronLeft size={16} className="mr-1" />
                Back
              </Button>
              {currentStep.id === 'move-in-handover' ? (
                <Button onClick={handleFinish} disabled={isSubmitting}>
                  {isSubmitting ? 'Finalising...' : 'Finish & open my project'}
                  <ChevronRight size={16} className="ml-1" />
                </Button>
              ) : (
                <Button onClick={handleNext} disabled={!canNext || isSubmitting}>
                  {currentStep.id === 'dream-activate' && !projectId ? 'Create project' : 'Next'}
                  <ChevronRight size={16} className="ml-1" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
