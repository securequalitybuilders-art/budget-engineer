import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '@/stores/projectStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Building2, Home, School, Briefcase, Stethoscope } from 'lucide-react';
import type { UserProfile, Region, Currency } from '@/types';
import { cn } from '@/lib/utils';

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
]

export function ProjectWizard() {
  const navigate = useNavigate();
  const { createProject, updateBrief } = useProjectStore();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [profile, setProfile] = useState<UserProfile>('first-time');
  const [region, setRegion] = useState<Region>('zimbabwe');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [brief, setBrief] = useState('');
  const [budget, setBudget] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const totalSteps = 3;

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleFinish = async () => {
    if (!name.trim()) return;
    setIsSubmitting(true);
    const project = await createProject({ name, profile, region, currency });

    const budgetCents = budget ? Math.round(parseFloat(budget) * 100) : undefined;
    await updateBrief(project.id, {
      rawText: brief,
      buildingType: 'residential',
      floors: 1,
      location: region,
      standards: ['ZBC 1996'],
      budgetCents,
    });

    setIsSubmitting(false);
    navigate(`/project/${project.id}`);
  };

  return (
    <main className="relative flex min-h-[calc(100vh-3.5rem)] items-center justify-center overflow-hidden p-4">
      <div className="absolute inset-0 aurora opacity-40 pointer-events-none" />

      <Card className="relative z-10 w-full max-w-2xl border-beam">
        <CardHeader>
          <div className="mb-2 flex items-center gap-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1.5 flex-1 rounded-full transition-colors',
                  i + 1 <= step ? 'bg-[var(--brand-accent)]' : 'bg-[var(--bg-tertiary)]'
                )}
              />
            ))}
          </div>
          <CardTitle className="font-display text-2xl">
            {step === 1 && 'Who is this project for?'}
            {step === 2 && 'Where are you building?'}
            {step === 3 && 'Describe your building'}
          </CardTitle>
          <CardDescription>
            {step === 1 && 'Select a profile so we can tailor the experience.'}
            {step === 2 && 'Set your region and currency for accurate local rates.'}
            {step === 3 && 'A simple brief is enough — the AI will expand it.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {step === 1 && (
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

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project-name">Project name</Label>
                <Input
                  id="project-name"
                  placeholder="e.g., My 3-bedroom home in Borrowdale"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
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
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="brief">Project brief</Label>
                <Textarea
                  id="brief"
                  placeholder="I want a 3-bedroom, 2-bathroom house with a veranda, built on a flat site in Harare. The budget is $45,000."
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  rows={5}
                />
                <p className="text-xs text-[var(--text-muted)]">
                  The AI will parse this into building type, dimensions, and budget.
                </p>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setShowTemplates(!showTemplates)}
                  className="flex items-center gap-1 text-xs font-medium text-[var(--brand-accent)] hover:underline"
                >
                  {showTemplates ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  Try an example brief
                </button>
                {showTemplates && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {BRIEF_TEMPLATES.map((t) => (
                      <button
                        key={t.label}
                        type="button"
                        onClick={() => {
                          setBrief(t.brief)
                          setShowTemplates(false)
                        }}
                        className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-tertiary)] p-3 text-left transition-all hover:border-[var(--brand-accent)] hover:bg-[var(--brand-accent)]/5"
                      >
                        <span className="text-sm font-medium text-[var(--text-primary)]">{t.label}</span>
                        <p className="mt-0.5 text-xs text-[var(--text-muted)] line-clamp-2">{t.brief}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="budget">Total budget (optional)</Label>
                <Input
                  id="budget"
                  type="number"
                  placeholder="45000"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                />
                <p className="text-xs text-[var(--text-muted)]">
                  Stored as integer cents. No floating-point currency.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">ZBC 1996</Badge>
                <Badge variant="secondary">Offline-first</Badge>
                <Badge variant="secondary">Local AI</Badge>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <Button variant="secondary" onClick={handleBack} disabled={step === 1}>
              <ChevronLeft size={16} className="mr-1" />
              Back
            </Button>
            {step < totalSteps ? (
              <Button onClick={handleNext}>
                Next
                <ChevronRight size={16} className="ml-1" />
              </Button>
            ) : (
              <Button onClick={handleFinish} disabled={!name.trim() || isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Project'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
