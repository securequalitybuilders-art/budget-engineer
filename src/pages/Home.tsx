import { Link } from 'react-router-dom';
import { useProjectStore } from '@/stores/projectStore';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  Plus, Folder, ArrowRight, Cpu, HardHat, FileBarChart,
  MessageSquare, LayoutGrid, Boxes, Activity, Calculator, BarChart3, Bug,
} from 'lucide-react';
import { motion } from 'framer-motion';

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

export function Home() {
  const { projects, isHydrated } = useProjectStore();

  return (
    <main className="relative min-h-[calc(100vh-3.5rem)] overflow-y-auto">
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
            <Button variant="secondary" size="lg" className="gap-2">
              <FileBarChart size={18} />
              Import DXF/IFC
            </Button>
          </div>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
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

        {/* First-Time Builder Journey */}
        <section className="mt-14">
          <h2 className="mb-2 font-display text-2xl font-semibold">First-Time Builder Journey</h2>
          <p className="mb-6 max-w-2xl text-sm text-[var(--text-secondary)]">
            No CAD experience needed. Everything runs in your browser with no paid AI APIs.
            The numbers you get are early estimates — always consult a registered professional for final construction.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {JOURNEY_STEPS.map((step) => {
              const StepIcon = step.icon
              return (
                <Card key={step.label} className="h-full">
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
              )
            })}
          </div>
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

        {projects.length > 0 && (
          <div className="mt-14">
            <h2 className="mb-4 font-display text-2xl font-semibold">Recent Projects</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.slice(0, 6).map((project) => (
                <Link key={project.id} to={`/project/${project.id}`}>
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
              ))}
            </div>
          </div>
        )}

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
