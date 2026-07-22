import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '@/stores/projectStore'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  Rocket,
  Home,
  Building2,
  Layers,
  FileBarChart,
  ShieldCheck,
  Boxes,
  Eye,
  Loader2,
} from 'lucide-react'
import { DEMO_SCENARIOS } from '@/lib/demo/demo-project-pack'
import type { DemoScenario } from '@/lib/demo/demo-project-pack'

const capabilityIcons: Record<string, typeof Home> = {
  'brief-to-design': FileBarChart,
  'plan-model': Layers,
  'cad-drawing': Layers,
  'boq-estimation': FileBarChart,
  'compliance-checking': ShieldCheck,
  'validation-tiers': ShieldCheck,
  '3d-bim-viewer': Boxes,
}

const capabilityLabels: Record<string, string> = {
  'brief-to-design': 'Brief → Design',
  'plan-model': 'Plan Model',
  'cad-drawing': '2D CAD',
  'boq-estimation': 'BOQ & Costing',
  'compliance-checking': 'Compliance',
  'validation-tiers': 'Validation (P1–P5)',
  '3d-bim-viewer': '3D BIM Viewer',
}

function ScenarioCard({ scenario }: { scenario: DemoScenario }) {
  const navigate = useNavigate()
  const { projects, loadProjects, loadProject } = useProjectStore()
  const [loading, setLoading] = useState(false)

  const handleLoad = async () => {
    setLoading(true)
    try {
      const { loadDemoProject, demoProjectExists } = await import('@/lib/demo/demo-project-pack')
      const exists = await demoProjectExists()
      if (exists) {
        await loadProjects()
        const existing = projects.find((p) => p.name === scenario.name)
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
      setLoading(false)
    }
  }

  const complexityColor =
    scenario.complexity === 'basic'
      ? 'bg-green-500/10 text-green-500'
      : scenario.complexity === 'intermediate'
        ? 'bg-yellow-500/10 text-yellow-500'
        : 'bg-red-500/10 text-red-500'

  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-5 transition-all hover:shadow-lg">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-accent)]/10">
            <Building2 size={20} className="text-[var(--brand-accent)]" />
          </div>
          <div>
            <h3 className="font-semibold text-[var(--text-primary)]">{scenario.name}</h3>
            <p className="text-xs text-[var(--text-muted)]">{scenario.buildingType} · {scenario.region}</p>
          </div>
        </div>
        <Badge className={complexityColor}>
          {scenario.complexity}
        </Badge>
      </div>

      <p className="mb-3 text-sm text-[var(--text-secondary)]">{scenario.description}</p>

      <div className="mb-4 text-xs text-[var(--text-muted)]">
        {scenario.areaM2} m² · ~${(scenario.estimatedCostCents / 100).toLocaleString()} est.
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {scenario.capabilities.map((cap) => {
          const Icon = capabilityIcons[cap] ?? Eye
          return (
            <span
              key={cap}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-tertiary)]"
            >
              <Icon size={10} />
              {capabilityLabels[cap] ?? cap}
            </span>
          )
        })}
      </div>

      <p className="mb-4 text-xs italic text-[var(--text-muted)]">
        {scenario.brief.length > 120 ? scenario.brief.slice(0, 120) + '…' : scenario.brief}
      </p>

      <Button
        onClick={handleLoad}
        disabled={loading}
        size="sm"
        className="w-full gap-2"
      >
        {loading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Rocket size={14} />
        )}
        {loading ? 'Loading…' : 'Load Demo'}
      </Button>
    </div>
  )
}

export function DemoPackNavigator() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">Showcase</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Curated demo projects that demonstrate Budget Engineer's capabilities. Select a scenario to load it as a working project you can explore.
        </p>
      </div>

      <div className="mb-6 rounded-lg border border-[var(--border-default)] bg-[var(--bg-tertiary)] p-4 text-xs text-[var(--text-muted)]">
        <strong className="text-[var(--text-secondary)]">Disclaimer:</strong> Demo projects provide schematic designs and early-stage estimates.
        All outputs must be reviewed by a registered professional before construction or procurement.
        Not a substitute for licensed architectural or engineering services.
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {DEMO_SCENARIOS.map((scenario) => (
          <ScenarioCard key={scenario.slug} scenario={scenario} />
        ))}
      </div>

      <div className="mt-8">
        <CapabilitySummary />
      </div>
    </div>
  )
}

const CAPABILITY_GROUPS = [
  {
    label: 'Design Pipeline',
    items: [
      { name: 'Brief → Design', desc: 'Plain English brief parsed into 3 design options' },
      { name: 'Plan Model', desc: '9-room floor plan with walls, doors, windows' },
      { name: '2D CAD', desc: 'Editable CAD document with layers and BIM classification' },
      { name: '3D BIM Viewer', desc: 'IFC-style 3D model with camera controls' },
    ],
  },
  {
    label: 'Cost & Estimation',
    items: [
      { name: 'BOQ Generation', desc: '14-line-item BOQ with regional rates' },
      { name: 'Contingency', desc: 'Automated 10% contingency calculation' },
      { name: 'CSV/PDF Export', desc: 'Export BOQ as CSV or PDF report' },
    ],
  },
  {
    label: 'Validation & Governance',
    items: [
      { name: 'P1–P5 Tiers', desc: '5-level readiness validation from conceptual to construction-ready' },
      { name: 'Self-Assessment', desc: 'Project readiness self-check questionnaire' },
      { name: 'Compliance Check', desc: 'Advisory cross-reference against building standards' },
      { name: 'Governance Workflow', desc: 'Create → Review → Sign-off with role-based access' },
    ],
  },
  {
    label: 'Presentation & Handover',
    items: [
      { name: 'Presentation Boards', desc: 'Multi-board editor with annotation and export' },
      { name: '11 Drawing Types', desc: 'Site plan, elevations, sections, MEP layouts, schedules' },
      { name: 'Pilot Feedback', desc: 'Structured feedback, review summary, trends dashboard' },
    ],
  },
]

function CapabilitySummary() {
  return (
    <div>
      <h2 className="mb-4 font-display text-xl font-semibold text-[var(--text-primary)]">
        Capability Overview
      </h2>
      <div className="grid gap-5 sm:grid-cols-2">
        {CAPABILITY_GROUPS.map((group) => (
          <div key={group.label} className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">
              {group.label}
            </h3>
            <div className="space-y-2">
              {group.items.map((item) => (
                <div key={item.name} className="flex items-start gap-2">
                  <div className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--brand-accent)]" />
                  <div>
                    <div className="text-sm font-medium text-[var(--text-primary)]">{item.name}</div>
                    <div className="text-xs text-[var(--text-muted)]">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
