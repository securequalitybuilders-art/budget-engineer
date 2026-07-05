import { useState } from 'react'
import type { DesignConcept } from '@/engine/tier2/conceptEngine'

interface ConceptPanelProps {
  concept: DesignConcept | null
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <span className="text-[9px] font-semibold uppercase tracking-wider text-cyan-400">{label}</span>
      <div className="text-[10px] text-stone-300 leading-relaxed">{children}</div>
    </div>
  )
}

function ChipRow({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item, i) => (
        <span key={i} className="rounded-full bg-stone-800 px-2 py-0.5 text-[9px] text-stone-300 border border-stone-700/60">
          {item}
        </span>
      ))}
    </div>
  )
}

export function ConceptPanel({ concept }: ConceptPanelProps) {
  const [expanded, setExpanded] = useState(false)

  if (!concept) return null

  return (
    <div className="mt-2 rounded-lg border border-indigo-500/30 bg-stone-900/80 p-2.5 text-[10px] transition-colors">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 text-left"
        aria-expanded={expanded}
      >
        <span className="text-[9px] font-semibold uppercase tracking-wider text-indigo-400">
          Tier-2 Concept
        </span>
        <span className="ml-auto text-stone-400">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="mt-2 space-y-3 border-t border-stone-700/40 pt-2">
          {/* Philosophy */}
          <Section label="Philosophy">
            <p className="mb-1 italic text-stone-400">&ldquo;{concept.philosophy.statement}&rdquo;</p>
            <ul className="list-disc space-y-0.5 pl-4">
              <li><span className="text-stone-400">Aalto:</span> {concept.philosophy.aaltoPrinciple}</li>
              <li><span className="text-stone-400">Ando:</span> {concept.philosophy.andoPrinciple}</li>
              <li><span className="text-stone-400">Chipperfield:</span> {concept.philosophy.chipperfieldPrinciple}</li>
              <li><span className="text-stone-400">African:</span> {concept.philosophy.africanPrinciple}</li>
            </ul>
          </Section>

          {/* Strategy */}
          <Section label="Strategy">
            <div className="space-y-1">
              <p><span className="text-stone-400">Spatial:</span> {concept.strategy.spatialOrganization}</p>
              <p><span className="text-stone-400">Privacy:</span> {concept.strategy.privacyGradient}</p>
              <p><span className="text-stone-400">Circulation:</span> {concept.strategy.circulationPattern}</p>
              <p><span className="text-stone-400">Climate:</span> {concept.strategy.climateResponse}</p>
              <p><span className="text-stone-400">Heritage:</span> {concept.strategy.heritageIntegration}</p>
            </div>
          </Section>

          {/* Site Analysis */}
          <Section label="Site Analysis">
            <div className="space-y-1">
              <p><span className="text-stone-400">Orientation:</span> {concept.siteAnalysis.orientation}</p>
              <p><span className="text-stone-400">Solar:</span> {concept.siteAnalysis.solarResponse}</p>
              <p><span className="text-stone-400">Wind:</span> {concept.siteAnalysis.windResponse}</p>
              <p><span className="text-stone-400">Topography:</span> {concept.siteAnalysis.topographyResponse}</p>
            </div>
          </Section>

          {/* Circulation */}
          <Section label="Circulation">
            <div className="space-y-0.5">
              <p><span className="text-emerald-400">●</span> <span className="text-stone-400">Public:</span> {concept.circulation.publicPath}</p>
              <p><span className="text-blue-400">●</span> <span className="text-stone-400">Private:</span> {concept.circulation.privatePath}</p>
              <p><span className="text-amber-400">●</span> <span className="text-stone-400">Service:</span> {concept.circulation.servicePath}</p>
              <p><span className="text-red-400">●</span> <span className="text-stone-400">Emergency:</span> {concept.circulation.emergencyPath}</p>
            </div>
          </Section>

          {/* Massing */}
          <Section label="Massing">
            <div className="space-y-1">
              <p><span className="text-stone-400">Form:</span> {concept.massing.primaryForm}</p>
              <p><span className="text-stone-400">Height:</span> {concept.massing.height}</p>
              <p><span className="text-stone-400">Roof:</span> {concept.massing.roofStrategy}</p>
              <p><span className="text-stone-400">Facade:</span> {concept.massing.facadeStrategy}</p>
              <div className="flex items-start gap-2">
                <span className="text-stone-400 shrink-0">Materials:</span>
                <ChipRow items={concept.massing.materialPalette} />
              </div>
              <div className="flex items-start gap-2">
                <span className="text-stone-400 shrink-0">Colors:</span>
                <div className="flex flex-wrap gap-1">
                  {concept.massing.colorPalette.map((c, i) => {
                    const colorMatch = c.match(/#([0-9A-Fa-f]{6})/)
                    const hex = colorMatch ? colorMatch[0] : ''
                    return (
                      <span key={i} className="flex items-center gap-1 rounded-full bg-stone-800 px-2 py-0.5 text-[9px] text-stone-300 border border-stone-700/60">
                        {hex && <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: hex }} />}
                        {c}
                      </span>
                    )
                  })}
                </div>
              </div>
            </div>
          </Section>

          {/* Precedents */}
          <Section label="Precedents + References">
            <div className="space-y-1">
              <div className="flex items-start gap-2">
                <span className="text-stone-400 shrink-0">African:</span>
                <ChipRow items={concept.precedents.african} />
              </div>
              <div className="flex items-start gap-2">
                <span className="text-stone-400 shrink-0">Modern:</span>
                <ChipRow items={concept.precedents.modern} />
              </div>
              <div className="flex items-start gap-2">
                <span className="text-stone-400 shrink-0">Local:</span>
                <ChipRow items={concept.precedents.local} />
              </div>
              <div className="flex items-start gap-2">
                <span className="text-stone-400 shrink-0">Climate:</span>
                <ChipRow items={concept.precedents.climate} />
              </div>
            </div>
          </Section>

          {/* Quality targets */}
          <Section label="Quality Targets">
            <ul className="list-disc space-y-0.5 pl-4">
              <li>{concept.qualityMetrics.daylightTarget}</li>
              <li>{concept.qualityMetrics.ventilationTarget}</li>
              <li>{concept.qualityMetrics.thermalComfortTarget}</li>
            </ul>
          </Section>
        </div>
      )}
    </div>
  )
}
