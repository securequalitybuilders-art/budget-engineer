import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { useProjectStore } from '@/stores/projectStore';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  Plus, Folder, ArrowRight, Cpu, HardHat, FileBarChart,
  MessageSquare, LayoutGrid, Boxes, Activity, Calculator, BarChart3, Bug,
  Sofa, Globe, Monitor, BookOpen, Rocket, Settings,
  AlertTriangle, Check, ChevronDown, FileCheck2, Hammer, Landmark,
  Quote, ShieldCheck, Wallet,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const JOURNEY_STEPS = [
  { icon: MessageSquare, label: 'Describe your project', desc: 'Write what you want to build in plain English. The AI handles the details.' },
  { icon: FileBarChart, label: 'Generate design options', desc: 'Get up to 3 design variations to compare and choose from.' },
  { icon: LayoutGrid, label: 'View 2D floor plan', desc: 'See your design as a CAD drawing with rooms, doors, and windows.' },
  { icon: Boxes, label: 'View 3D BIM model', desc: 'Switch to the 3D viewer for a realistic preview of your building.' },
  { icon: Activity, label: 'Check engineering + services', desc: 'Run clash detection, solar analysis, and MEP takeoff.' },
  { icon: Calculator, label: 'Get BOQ + export report', desc: 'See cost breakdown by region and export CSV or a PDF report.' },
]

const STORIES = [
  { icon: AlertTriangle, headline: 'Bricks ordered by "roughly this much"', impact: '+46% budget', story: 'A verbal quantity from the foreman became a full truck over-purchase that sat under a tarpaulin for a year.', fix: 'Take-offs come straight from your drawing using ZIQS measurement rules — quantities first, orders second.' },
  { icon: Hammer, headline: 'A foundation contract with no BOQ', impact: 'Rework x2', story: 'The quote was one number. Excavation depth, steel tonnage, and concrete grade only surfaced in the first variation.', fix: 'Every design exports a line-item BOQ, so a contractor prices the same numbers you see.' },
  { icon: Wallet, headline: 'Paid before the milestone was real', impact: 'Cash gone', story: 'Payments went out on a handshake; the builder moved on before the slab was ever checked.', fix: 'Escrow holds funds against verified milestones — release only when the work is confirmed.' },
  { icon: Landmark, headline: 'The currency moved 26% mid-build', impact: 'ZiG / USD gap', story: 'A budget priced in USD and paid in ZiG left the builder short with the walls half up.', fix: 'Budgets track both currencies and the market index flags volatility before it becomes a variation.' },
  { icon: FileCheck2, headline: 'An unregistered plan set stopped the build', impact: '6-week stop', story: 'The council refused occupancy until a registered architect signed off, and the finishing crew had to be laid off.', fix: 'Plans gate on the SI 56 / 2025 architect registry — you know before you build whether the design can be submitted.' },
]

const SOLUTION_PILLARS = [
  { icon: Cpu, title: 'Design with a budget', desc: 'Generate options, watch cost as you edit, and get a Red Pen feasibility review before you commit.' },
  { icon: ShieldCheck, title: 'Build with verified payments', desc: 'Milestones, escrow, and retention keep cash moving only when the work is real — and stop you paying twice.' },
  { icon: BookOpen, title: 'Close with lessons learned', desc: 'Historical costs and lessons-learned logs feed your next estimate — each build makes the next one smarter.' },
]

const SOCIAL_PROOF = [
  { quote: 'I took plans to council that a registered architect had already reviewed — no back-and-forth.', role: 'First-time builder', detail: 'House · Harare' },
  { quote: 'The BOQ and the payment certificates read from the same numbers. That ends the arguments.', role: 'Contractor', detail: 'Renovation · Bulawayo' },
  { quote: 'We can hand a donor a costed, code-checked option without a three-week consultancy.', role: 'NGO programme officer', detail: 'Clinic · Midlands' },
]

const STATS = [
  { value: '55,000+', label: 'cost items in the rate catalogue' },
  { value: '18+', label: 'open-source construction skills' },
  { value: '7', label: 'workflow stages, brief to close' },
  { value: '0', label: 'paid AI APIs required' },
]

const PLANS = [
  { name: 'Free', price: '$0', tagline: 'Everything, in your browser, forever.', cta: 'Start building', to: '/new', features: ['Unlimited local projects', '2D CAD + 3D BIM', 'Tender-ready BOQ & exports', 'SADC codes & compliance checks'] },
  { name: 'Red Pen', price: '$50', tagline: 'A one-off human feasibility review.', cta: 'Review my design', to: '/new', features: ['Everything in Free', 'Registered reviewer', 'Cost realism check', 'Design review report'] },
  { name: 'Guardian', price: '$800/mo', tagline: 'A watchdog across the whole build.', cta: 'Guard my build', to: '/new', features: ['Everything in Red Pen', 'Milestone gates + escrow', 'Budget, schedule, quality', 'Priority QS support'] },
]

const FAQS = [
  { q: 'Is my data private?', a: 'Yes. Projects live in your browser\u2019s IndexedDB and never leave your device. There is no account, no telemetry, and no server.' },
  { q: 'Do I still need a professional?', a: 'The numbers are early estimates, not a professional sign-off. SI 56 / 2025 requires a registered architect for submission — the app surfaces that gate so you know when it applies.' },
  { q: 'Which standards are encoded?', a: 'Zimbabwe Model Building By-Laws 1977, SANS 10400 (parts A, K, O, P, S), SANS 10160-2/3/4/5, ZBC by-laws, and ZIQS SMM measurement rules.' },
  { q: 'Does it need internet?', a: 'No. It works offline and installs as a PWA. Optional free-tier AI providers are the only online resources, and every feature has a deterministic local fallback.' },
  { q: 'Which currencies can I budget in?', a: 'USD and ZiG. The market index tracks USD/ZiG volatility so cost creep stays visible before it becomes a variation.' },
  { q: 'Can I bring my own AI key?', a: 'Yes — add a free-tier Gemini, Groq, GitHub Models, or OpenRouter key and it is used only on your device.' },
]

export function Home() {
  const { projects, isHydrated, createProject, loadProjects, loadProject } = useProjectStore(useShallow(s => ({ projects: s.projects, isHydrated: s.isHydrated, createProject: s.createProject, loadProjects: s.loadProjects, loadProject: s.loadProject })));
  const navigate = useNavigate();
  const dxfInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const [backupMsg, setBackupMsg] = useState<string | null>(null);

  const handleExportAll = async () => {
    try {
      const { exportProjectPackage, downloadBlob } = await import('@/services/projectExportImportService')
      if (projects.length === 0) {
        setBackupMsg('No projects to export.')
        return
      }
      for (const p of projects.slice(0, 10)) {
        const blob = await exportProjectPackage(p.id)
        if (blob) downloadBlob(blob, `${p.name.replace(/\s+/g, '_')}.beproj`)
      }
      setBackupMsg(`Exported ${Math.min(projects.length, 10)} project(s) as .beproj`)
      setTimeout(() => setBackupMsg(null), 3000)
    } catch { setBackupMsg('Export failed.'); setTimeout(() => setBackupMsg(null), 3000) }
  }

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const { importProjectAsCopy } = await import('@/services/projectExportImportService')
      const id = await importProjectAsCopy(file)
      if (id) {
        await loadProjects()
        navigate(`/project/${id}`)
      } else {
        setBackupMsg('Invalid .beproj file.')
        setTimeout(() => setBackupMsg(null), 3000)
      }
    } catch {
      setBackupMsg('Import failed.')
      setTimeout(() => setBackupMsg(null), 3000)
    }
    if (e.target) e.target.value = ''
  }

  const handleLoadDemo = async () => {
    setDemoLoading(true)
    try {
      const { loadDemoProject, demoProjectExists } = await import('@/lib/demo/demo-project-pack')
      const exists = await demoProjectExists()
      if (exists) {
        await loadProjects()
        const existing = projects.find((p) => p.name === 'Demo Residence')
        if (existing) {
          navigate(`/project/${existing.id}`)
          return
        }
      }
      const projectId = await loadDemoProject()
      await loadProjects()
      await loadProject(projectId)
      navigate(`/project/${projectId}`)
    } catch (e) {
      console.error('Failed to load demo project', e)
    } finally {
      setDemoLoading(false)
    }
  }

  const handleDxfFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const { parseDxfToPlan } = await import('@/lib/import/dxf-importer')
      const plan = parseDxfToPlan(text)
      if (plan) {
        const project = await createProject({
          name: file.name.replace(/\.dxf$/i, '') || 'Imported DXF',
          profile: 'first-time',
          region: 'zimbabwe',
          currency: 'USD',
        })
        plan.designOptionId = `dxf-home-${Date.now()}`
        const { savePlanModel } = await import('@/services/cadPersistenceService')
        await savePlanModel(project.id, plan.designOptionId, plan)
        const { logTransaction } = await import('@/services/projectPersistenceService')
        await logTransaction(project.id, 'CREATE', 'design', plan.designOptionId, 'DXF imported from home — verify scale')
        navigate(`/project/${project.id}`)
      } else {
        alert('Could not read this DXF file. The file may be empty, invalid, or use unsupported entities.')
      }
    } catch {
      alert('Could not read this DXF file. The file may be empty, invalid, or use unsupported entities.')
    }
    if (e.target) e.target.value = ''
  }

  return (
    <main className="relative min-h-[calc(100vh-3.5rem)] overflow-y-auto" aria-label="Home page">
      <div className="absolute inset-0 aurora opacity-30 pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 py-12 lg:px-8">
        <div className="mb-10 text-center">
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Design your building. <span className="text-[var(--brand-accent)]">See the cost.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-[var(--text-secondary)] sm:text-lg">
            AI-powered computational design → 2D CAD → 3D BIM → engineering quantities → BOQ. All in your browser, offline-first.
          </p>
          <p className="mx-auto mt-2 max-w-lg text-xs text-[var(--text-muted)] sm:text-sm">
            Mobile is great for review and estimates. Tablet or desktop is best for detailed CAD editing.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/new">
              <Button size="lg" className="gap-2">
                <Plus size={18} />
                Start New Project
              </Button>
            </Link>
            <Link to="/portfolio">
              <Button variant="secondary" size="lg" className="gap-2">
                <BarChart3 size={18} />
                Portfolio Dashboard
              </Button>
            </Link>
            <Button variant="secondary" size="lg" className="gap-2" onClick={() => dxfInputRef.current?.click()}>
              <FileBarChart size={18} />
              Import (DXF / image / PDF)
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="gap-2"
              onClick={handleLoadDemo}
              disabled={demoLoading}
            >
              <Rocket size={18} className={demoLoading ? 'animate-pulse' : ''} />
              {demoLoading ? 'Loading Demo...' : 'Load Demo Project'}
            </Button>
            <Button variant="ghost" size="lg" className="gap-2" onClick={handleExportAll}>
              <Folder size={18} />
              Export All
            </Button>
            <Button variant="ghost" size="lg" className="gap-2" onClick={() => backupInputRef.current?.click()}>
              <Settings size={18} />
              Import Backup
            </Button>
            <input
              ref={dxfInputRef}
              type="file"
              accept=".dxf,image/*,application/pdf"
              onChange={handleDxfFile}
              className="hidden"
              aria-label="Select a DXF, image, or PDF file to import"
            />
            <input
              ref={backupInputRef}
              type="file"
              accept=".beproj"
              onChange={handleImportBackup}
              className="hidden"
              aria-label="Select a .beproj file to import"
            />
            {backupMsg && (
              <div className="w-full text-center text-sm text-[var(--brand-accent)]">{backupMsg}</div>
            )}
          </div>
        </div>

        {/* Bento hero collage */}
        <section aria-labelledby="bento-heading">
          <h2 id="bento-heading" className="sr-only">Platform at a glance</h2>
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.1 }}
            className="grid grid-cols-2 gap-3 md:grid-cols-4 md:auto-rows-[150px]"
            aria-hidden="true"
          >
            <motion.div variants={item} className="col-span-2 row-span-2">
              <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--bg-tertiary)] p-4">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Generated 2D floor plan</span>
                <svg viewBox="0 0 400 280" className="mt-2 flex-1" role="presentation">
                  <rect x="30" y="20" width="340" height="240" fill="none" stroke="var(--brand-accent)" strokeWidth="3" />
                  <path d="M170 20 V120 M170 120 H30 M370 120 H240 M240 120 V260 M240 260 H30 M170 120 V260" stroke="var(--border-default)" strokeWidth="1.5" fill="none" />
                  <rect x="45" y="35" width="108" height="68" fill="var(--bg-primary)" opacity="0.5" />
                  <rect x="190" y="35" width="90" height="68" fill="var(--bg-primary)" opacity="0.5" />
                  <rect x="190" y="135" width="130" height="110" fill="var(--bg-primary)" opacity="0.5" />
                  <rect x="45" y="135" width="108" height="108" fill="var(--bg-primary)" opacity="0.5" />
                  <text x="60" y="70" fontSize="11" fill="var(--text-secondary)">Living</text>
                  <text x="200" y="70" fontSize="11" fill="var(--text-secondary)">Kitchen</text>
                  <text x="200" y="195" fontSize="11" fill="var(--text-secondary)">Bedroom</text>
                  <text x="60" y="195" fontSize="11" fill="var(--text-secondary)">Bath</text>
                  <path d="M320 65 A12 12 0 0 1 320 89" stroke="var(--brand-accent)" strokeWidth="1.5" fill="none" />
                  <text x="330" y="68" fontSize="10" fill="var(--brand-accent)">D</text>
                  <path d="M350 140 L350 152 M354 140 L354 152" stroke="var(--text-muted)" strokeWidth="1.5" />
                  <text x="336" y="132" fontSize="8" fill="var(--text-muted)">W</text>
                  <g stroke="var(--text-muted)" strokeWidth="1.5">
                    <line x1="370" y1="18" x2="378" y2="26" /><line x1="370" y1="26" x2="378" y2="18" />
                  </g>
                  <text x="360" y="12" fontSize="9" fill="var(--text-muted)">N</text>
                </svg>
              </div>
            </motion.div>

            <motion.div variants={item} className="col-span-2">
              <div className="flex h-full items-center justify-between gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-tertiary)] p-4">
                <div className="min-w-0">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">3D BIM model</span>
                  <p className="mt-1 truncate text-xs text-[var(--text-secondary)]">Orbit, explode, and export GLB.</p>
                </div>
                <svg viewBox="0 0 120 80" className="h-16 w-24 shrink-0" role="presentation">
                  <polygon points="60,8 112,28 60,48 8,28" fill="none" stroke="var(--accent-bim)" strokeWidth="1.5" />
                  <polygon points="8,28 8,56 60,76 60,48" fill="none" stroke="var(--accent-bim)" opacity="0.7" strokeWidth="1.5" />
                  <polygon points="112,28 112,56 60,76 60,48" fill="none" stroke="var(--accent-bim)" opacity="0.7" strokeWidth="1.5" />
                  <polygon points="8,56 112,56" stroke="var(--accent-bim)" opacity="0.5" strokeWidth="1.5" />
                </svg>
              </div>
            </motion.div>

            <motion.div variants={item}>
              <div className="flex h-full flex-col rounded-2xl border border-[var(--border-default)] bg-[var(--bg-tertiary)] p-4">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Cashflow S-curve</span>
                <svg viewBox="0 0 120 60" className="mt-1 flex-1" role="presentation">
                  <polyline points="0,52 24,50 44,44 60,34 74,22 88,13 100,8 120,4" fill="none" stroke="var(--accent-ai)" strokeWidth="2" />
                  <polyline points="0,52 120,52" stroke="var(--border-default)" strokeWidth="1" />
                </svg>
              </div>
            </motion.div>

            <motion.div variants={item}>
              <div className="flex h-full flex-col rounded-2xl border border-[var(--border-default)] bg-[var(--bg-tertiary)] p-4">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">BOQ line items</span>
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="truncate text-[var(--text-secondary)]">Cement 50kg</span>
                    <span className="font-mono text-[var(--text-primary)]">2 410</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="truncate text-[var(--text-secondary)]">Face bricks</span>
                    <span className="font-mono text-[var(--text-primary)]">11 200</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="truncate text-[var(--text-secondary)]">Rebar Ø12</span>
                    <span className="font-mono text-[var(--text-primary)]">3 155</span>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div variants={item} className="col-span-2">
              <div className="flex h-full items-center gap-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-tertiary)] p-4">
                <svg viewBox="0 0 120 70" className="h-16 w-28 shrink-0" role="presentation">
                  <rect x="14" y="18" width="92" height="44" fill="var(--bg-primary)" opacity="0.5" stroke="var(--brand-accent)" strokeWidth="1.5" />
                  <line x1="34" y1="18" x2="34" y2="62" stroke="var(--brand-accent)" strokeWidth="1.5" />
                  <line x1="86" y1="18" x2="86" y2="62" stroke="var(--brand-accent)" strokeWidth="1.5" />
                  <rect x="10" y="8" width="44" height="8" fill="none" stroke="var(--brand-accent)" strokeWidth="1.5" />
                  <line x1="60" y1="8" x2="60" y2="2" stroke="var(--brand-accent)" strokeWidth="1.5" />
                  <line x1="48" y1="8" x2="48" y2="2" stroke="var(--brand-accent)" strokeWidth="1.5" />
                  <rect x="42" y="46" width="22" height="16" fill="none" stroke="var(--text-muted)" strokeWidth="1" />
                  <text x="40" y="40" fontSize="8" fill="var(--text-secondary)">glazed door</text>
                </svg>
                <div className="min-w-0">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Elevations & sections</span>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">All four faces with door & window schedules.</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </section>

        <section aria-labelledby="features-heading">
          <h2 id="features-heading" className="sr-only">Platform Features</h2>
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
          >
          <motion.div variants={item} className="lg:col-span-2 lg:row-span-2">
            <Card className="h-full border-beam">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="text-[var(--accent-ai)]" size={24} />
                  Computational Design OS
                </CardTitle>
                <CardDescription>
                  Turn a plain-language brief into buildable 2D drawings, a 3D BIM model, and a tender-ready BOQ.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg bg-[var(--bg-tertiary)] p-3">
                    <span className="text-sm text-[var(--text-secondary)]">Pipeline stages</span>
                    <span className="font-mono font-semibold">6</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-[var(--bg-tertiary)] p-3">
                    <span className="text-sm text-[var(--text-secondary)]">Open-source skills</span>
                    <span className="font-mono font-semibold">18+</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-[var(--bg-tertiary)] p-3">
                    <span className="text-sm text-[var(--text-secondary)]">Cost items</span>
                    <span className="font-mono font-semibold">55,000+</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="h-full">
              <CardHeader className="pb-2">
                <HardHat className="mb-2 text-[var(--brand-accent)]" size={24} />
                <CardTitle className="text-lg">First-Time Builder</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[var(--text-secondary)]">Guided step-by-step journey in plain English.</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="h-full">
              <CardHeader className="pb-2">
                <Cpu className="mb-2 text-[var(--accent-ai)]" size={24} />
                <CardTitle className="text-lg">Professional</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[var(--text-secondary)]">Full design suite with BIM export and parametric editing.</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="h-full">
              <CardHeader className="pb-2">
                <FileBarChart className="mb-2 text-[var(--accent-bim)]" size={24} />
                <CardTitle className="text-lg">Institution / NGO</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[var(--text-secondary)]">Procurement compliance, tender-ready docs, audit trail.</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="h-full">
              <CardHeader className="pb-2">
                <Folder className="mb-2 text-[var(--text-secondary)]" size={24} />
                <CardTitle className="text-lg">Your Projects</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-display font-bold">{isHydrated ? projects.length : '—'}</p>
                <p className="text-xs text-[var(--text-muted)]">Local-first, synced when online</p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
        </section>

        {/* First-Time Builder Journey */}
        <section className="mt-14" aria-labelledby="journey-heading">
          <h2 id="journey-heading" className="mb-2 font-display text-2xl font-semibold">First-Time Builder Journey</h2>
          <p className="mb-6 max-w-2xl text-sm text-[var(--text-secondary)]">
            No CAD experience needed. Everything runs in your browser with no paid AI APIs.
            The numbers you get are early estimates — always consult a registered professional for final construction.
          </p>
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.1 }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {JOURNEY_STEPS.map((step) => {
              const StepIcon = step.icon
              return (
                <motion.div key={step.label} variants={item} className="h-full">
                <Card className="h-full">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand-accent)]/10">
                        <StepIcon size={16} className="text-[var(--brand-accent)]" />
                      </div>
                      <CardTitle className="text-base">{step.label}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-[var(--text-secondary)]">{step.desc}</p>
                  </CardContent>
                </Card>
                </motion.div>
              )
            })}
          </motion.div>
          <div className="mt-6 flex flex-wrap gap-3">
            <span className="rounded-full border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-3 py-1 text-xs text-[var(--text-muted)]">
              No CAD experience needed
            </span>
            <span className="rounded-full border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-3 py-1 text-xs text-[var(--text-muted)]">
              Works in your browser
            </span>
            <span className="rounded-full border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-3 py-1 text-xs text-[var(--text-muted)]">
              No paid AI API required
            </span>
            <span className="rounded-full border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-3 py-1 text-xs text-[var(--text-muted)]">
              Early estimate, not final professional sign-off
            </span>
          </div>
        </section>

        {/* Zimbabwe golden hour */}
        <section className="mt-14" aria-labelledby="zimba-heading">
          <h2 id="zimba-heading" className="mb-2 font-display text-2xl font-semibold">Built for the Zimbabwean build</h2>
          <p className="mb-6 max-w-2xl text-sm text-[var(--text-secondary)]">
            Local regions, Zim dollar &amp; USD budgets, SADC codes, and supplier rates — engineered for how building happens here.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <figure className="group relative h-56 overflow-hidden rounded-2xl border border-[var(--border-default)]">
              <img
                src="https://images.unsplash.com/photo-1759158487840-f7e6ec539b4e?q=60&w=900&auto=format&fit=crop"
                alt="Victoria Falls, Zimbabwe at golden hour"
                loading="lazy"
                className="zimba-golden h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <figcaption className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2 text-xs text-white">
                Victoria Falls, Zimbabwe
              </figcaption>
            </figure>
            <figure className="group relative h-56 overflow-hidden rounded-2xl border border-[var(--border-default)]">
              <img
                src="https://images.unsplash.com/photo-1520330979108-7d66e04b35e5?q=60&w=900&auto=format&fit=crop"
                alt="City skyline silhouetted at golden hour"
                loading="lazy"
                className="zimba-golden h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <figcaption className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2 text-xs text-white">
                Urban golden hour
              </figcaption>
            </figure>
            <figure className="group relative h-56 overflow-hidden rounded-2xl border border-[var(--border-default)]">
              <img
                src="https://images.unsplash.com/photo-1422545063300-35f82a2b77d1?q=60&w=900&auto=format&fit=crop"
                alt="Buildings catching warm evening light"
                loading="lazy"
                className="zimba-golden h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <figcaption className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2 text-xs text-white">
                Warm evening light on the skyline
              </figcaption>
            </figure>
          </div>
        </section>

        {/* From brief to build — cinematic banner */}
        <section className="mt-14" aria-labelledby="pipeline-heading">
          <div className="relative overflow-hidden rounded-3xl border border-[var(--border-default)]">
            <img
              src="https://images.unsplash.com/photo-1759158487840-f7e6ec539b4e?q=60&w=1600&auto=format&fit=crop"
              alt=""
              loading="lazy"
              className="zimba-golden absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-black/75 via-black/55 to-black/35" aria-hidden="true" />
            <div className="relative z-10 px-6 py-14 sm:px-10 sm:py-20">
              <Badge variant="brand" className="mb-4">Seven stages, one project</Badge>
              <h2 id="pipeline-heading" className="max-w-2xl font-display text-3xl font-bold text-white sm:text-4xl">
                From a plain-language brief to a council-ready package — every step in your browser.
              </h2>
              <p className="mt-3 max-w-2xl text-sm text-white/85">
                Brief → Concept → Design → BIM → Docs &amp; BIM → Budget → Budget Engineered. Each stage checks the one before it, so the numbers stay honest.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link to="/new">
                  <Button>Start your build <ArrowRight size={16} /></Button>
                </Link>
                <Link to="/academy">
                  <Button variant="ghost" className="text-white hover:bg-white/10">Take the guided tour</Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 5 stories that drive the redesign */}
        <section className="mt-14" aria-labelledby="stories-heading">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="stories-heading" className="font-display text-2xl font-semibold">The stories behind the numbers</h2>
              <p className="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">
                Five real ways Zimbabwean builds go over budget — and the engine behaviour that catches each one.
              </p>
            </div>
            <Badge variant="danger">Cost creep &lt; 5%</Badge>
          </div>
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.1 }}
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
          >
            {STORIES.map((story, i) => {
              const StoryIcon = story.icon;
              return (
                <motion.div key={story.headline} variants={item} className={i === 0 ? 'lg:col-span-2' : 'h-full'}>
                  <div className="flex h-full flex-col rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10">
                        <StoryIcon size={18} className="text-red-400" />
                      </div>
                      <Badge variant="danger">{story.impact}</Badge>
                    </div>
                    <h3 className="mt-3 font-display text-base font-semibold">{story.headline}</h3>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">{story.story}</p>
                    <p className="mt-3 border-t border-[var(--border-default)] pt-3 text-sm">
                      <span className="font-semibold text-[var(--brand-accent)]">Budget Engineer fix: </span>
                      <span className="text-[var(--text-secondary)]">{story.fix}</span>
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </section>

        {/* How we remove the risk */}
        <section className="mt-14" aria-labelledby="solution-heading">
          <h2 id="solution-heading" className="mb-2 font-display text-2xl font-semibold">How we remove the risk</h2>
          <p className="mb-6 max-w-2xl text-sm text-[var(--text-secondary)]">
            Not a promise of perfection — a layer of verified numbers and gates so surprises surface early, while you can still act on them.
          </p>
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.1 }}
            className="grid gap-4 md:grid-cols-3"
          >
            {SOLUTION_PILLARS.map((pillar) => {
              const PillarIcon = pillar.icon;
              return (
                <motion.div key={pillar.title} variants={item} className="h-full">
                  <Card className="h-full">
                    <CardHeader>
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-accent)]/10">
                        <PillarIcon size={20} className="text-[var(--brand-accent)]" />
                      </div>
                      <CardTitle className="text-lg">{pillar.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-[var(--text-secondary)]">{pillar.desc}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        </section>

        {/* Who builds with us */}
        <section className="mt-14" aria-labelledby="proof-heading">
          <h2 id="proof-heading" className="mb-2 font-display text-2xl font-semibold">Built alongside real builds</h2>
          <p className="mb-6 max-w-2xl text-sm text-[var(--text-secondary)]">
            Budget Engineer is early software, so we show you exactly what it does — and what still needs a professional.
          </p>
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.1 }}
            className="grid gap-4 md:grid-cols-3"
          >
            {SOCIAL_PROOF.map((proof) => (
              <motion.div key={proof.role} variants={item} className="h-full">
                <div className="flex h-full flex-col rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-5">
                  <Quote size={20} className="text-[var(--brand-accent)]" />
                  <blockquote className="mt-3 flex-1 text-sm text-[var(--text-primary)]">&ldquo;{proof.quote}&rdquo;</blockquote>
                  <figcaption className="mt-4">
                    <div className="font-display text-sm font-semibold">{proof.role}</div>
                    <div className="text-xs text-[var(--text-muted)]">{proof.detail}</div>
                  </figcaption>
                </div>
              </motion.div>
            ))}
          </motion.div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {STATS.map((stat) => (
              <div key={stat.label} className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-4 py-3">
                <div className="font-display text-2xl font-bold">{stat.value}</div>
                <div className="text-xs text-[var(--text-muted)]">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Simple, honest plans */}
        <section className="mt-14" aria-labelledby="pricing-heading">
          <h2 id="pricing-heading" className="mb-2 font-display text-2xl font-semibold">Simple, honest plans</h2>
          <p className="mb-6 max-w-2xl text-sm text-[var(--text-secondary)]">
            Start free in your browser. Add a human review only when you need one. Nothing a core feature needs is locked behind a paid tier.
          </p>
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.1 }}
            className="grid gap-4 md:grid-cols-3"
          >
            {PLANS.map((plan, i) => (
              <motion.div key={plan.name} variants={item} className="h-full">
                <Card className={cn('relative flex h-full flex-col', i === 2 ? 'border-beam' : '')}>
                  {i === 2 && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                      Most trusted
                    </Badge>
                  )}
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      {i === 2 && <ShieldCheck size={18} className="text-[var(--brand-accent)]" />}
                    </div>
                    <div className="font-display text-3xl font-bold">{plan.price}</div>
                    <CardDescription>{plan.tagline}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col">
                    <ul className="flex-1 space-y-2">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                          <Check size={16} className="mt-0.5 shrink-0 text-emerald-400" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Link to={plan.to} className="mt-6 block">
                      <Button className="w-full">{plan.cta}</Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* Straight answers */}
        <section className="mt-14" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="mb-2 font-display text-2xl font-semibold">Straight answers</h2>
          <p className="mb-6 max-w-2xl text-sm text-[var(--text-secondary)]">
            The questions builders ask before they trust a tool. If we don&rsquo;t know, we say so.
          </p>
          <div className="max-w-3xl space-y-3">
            {FAQS.map((faq) => (
              <details
                key={faq.q}
                className="group rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-3"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold">
                  {faq.q}
                  <ChevronDown size={16} className="shrink-0 text-[var(--text-muted)] transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>

        {projects.length > 0 && (
          <div className="mt-14">
            <h2 className="mb-4 font-display text-2xl font-semibold">Recent Projects</h2>
            <motion.div
              variants={container}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.1 }}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {projects.slice(0, 6).map((project) => (
                <motion.div key={project.id} variants={item} className="h-full">
                <Link to={`/project/${project.id}`}>
                  <Card className="group transition-all hover:shadow-lg">
                    <CardHeader>
                      <CardTitle className="text-lg group-hover:text-[var(--brand-accent)]">
                        {project.name}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <Badge variant="brand">{project.status}</Badge>
                        <span>{project.region}</span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm text-[var(--text-secondary)]">
                        <span>{project.currency}</span>
                        <ArrowRight size={16} className="text-[var(--brand-accent)]" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
                </motion.div>
              ))}
            </motion.div>
          </div>
        )}

        {/* Premium Studio Modules */}
        <section className="mt-14" aria-labelledby="studio-heading">
          <h2 id="studio-heading" className="mb-2 font-display text-2xl font-semibold">Premium Studio Modules</h2>
          <p className="mb-6 max-w-2xl text-sm text-[var(--text-secondary)]">
            Specialised tools for interior design, site analysis, presentation boards, and skill-building — all available inside any project.
          </p>
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.1 }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {[
              { icon: Sofa, label: 'Interior Design', desc: 'Place fixtures, choose materials, generate finish schedules.', to: projects.length > 0 ? `/project/${projects[0].id}/studio/interior` : '/new' },
              { icon: Globe, label: 'Site Analysis', desc: 'Heliodon, shadow casting, wind rose, and environmental analysis.', to: projects.length > 0 ? `/project/${projects[0].id}/studio/site-analysis` : '/site-analysis' },
              { icon: Monitor, label: 'Presentation Boards', desc: 'Create board layouts, annotate, export as SVG/PNG/PDF.', to: projects.length > 0 ? `/project/${projects[0].id}/studio/presentation` : '/new' },
              { icon: BookOpen, label: 'Academy', desc: 'Guided lessons on design, engineering, and construction.', to: '/academy' },
            ].map((studio) => {
              const StudioIcon = studio.icon;
              return (
                <motion.div key={studio.label} variants={item} className="h-full">
                <Link to={studio.to}>
                  <Card className="group h-full transition-all hover:shadow-lg">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-accent)]/10">
                          <StudioIcon size={20} className="text-[var(--brand-accent)]" />
                        </div>
                        <CardTitle className="text-base group-hover:text-[var(--brand-accent)]">{studio.label}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-[var(--text-secondary)]">{studio.desc}</p>
                    </CardContent>
                  </Card>
                </Link>
                </motion.div>
              );
            })}
          </motion.div>
        </section>

        {/* Ecosystem section */}
        <section aria-labelledby="ecosystem-heading" className="mt-12">
          <h2 id="ecosystem-heading" className="mb-1 text-xl font-bold text-[var(--text-primary)]">Build Ecosystem</h2>
          <p className="mb-6 max-w-2xl text-sm text-[var(--text-secondary)]">
            Role-based dashboards that connect homeowners, contractors, and suppliers across one build marketplace.
          </p>
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.1 }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {[
              { icon: Boxes, label: 'Ecosystem Hub', desc: 'Pick the seat that matches how you work.', to: '/ecosystem' },
              { icon: HardHat, label: 'Builder', desc: 'Roadmap, budget dial, escrow, find-a-pro, group buying.', to: '/ecosystem/builder' },
              { icon: BarChart3, label: 'Contractor', desc: 'P&L, P4P certificates, SADC index, WIPAA, logistics.', to: '/ecosystem/contractor' },
              { icon: Activity, label: 'Bulk Procurement', desc: 'BOQ → JIT dispatch, GPS-verified, escrow-gated.', to: '/ecosystem/bulk' },
            ].map((ecosystem) => {
              const EcosystemIcon = ecosystem.icon;
              return (
                <motion.div key={ecosystem.label} variants={item} className="h-full">
                <Link to={ecosystem.to}>
                  <Card className="group h-full transition-all hover:shadow-lg">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-accent)]/10">
                          <EcosystemIcon size={20} className="text-[var(--brand-accent)]" />
                        </div>
                        <CardTitle className="text-base group-hover:text-[var(--brand-accent)]">{ecosystem.label}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-[var(--text-secondary)]">{ecosystem.desc}</p>
                    </CardContent>
                  </Card>
                </Link>
                </motion.div>
              );
            })}
          </motion.div>
        </section>

        {/* Feedback link */}
        <div className="mt-10 text-center">
          <Link to="/feedback">
            <Button variant="ghost" size="sm" className="gap-2 text-[var(--text-muted)]">
              <Bug size={14} />
              Send feedback
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
