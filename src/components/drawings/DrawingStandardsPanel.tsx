import { useState } from 'react'
import { ARCH_STYLES, DEFAULT_STYLE } from '@/lib/drawings/dimensionStyles'
import { AIA_LAYERS, getDisciplinePrefix } from '@/lib/drawings/layerStandard'
import { LW } from '@/lib/drawings/lineweights'
import { formatDrawingName, type DrawingNamingOptions } from '@/lib/drawings/namingConventions'

type StandardsSection = 'styles' | 'layers' | 'weights' | 'naming'

export function DrawingStandardsPanel() {
  const [section, setSection] = useState<StandardsSection>('styles')

  return (
    <div className="rounded-lg border border-stone-700/60 bg-stone-950/80 p-4">
      <div className="mb-4 flex gap-1">
        {([['styles', 'Dim Styles'], ['layers', 'Layers'], ['weights', 'Lineweights'], ['naming', 'Naming']] as [StandardsSection, string][]).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setSection(k)}
            className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
              section === k ? 'bg-cyan-600/20 text-cyan-300' : 'text-stone-400 hover:bg-stone-800 hover:text-stone-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {section === 'styles' && <DimensionStyleSection />}
      {section === 'layers' && <LayerStandardSection />}
      {section === 'weights' && <LineweightSection />}
      {section === 'naming' && <NamingSection />}
    </div>
  )
}

function DimensionStyleSection() {
  const styles = [DEFAULT_STYLE, ...Object.values(ARCH_STYLES).filter(s => s.name !== 'Standard')]
  const [selected, setSelected] = useState('Standard')
  const style = styles.find(s => s.name === selected) ?? DEFAULT_STYLE

  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold text-stone-300">Dimension Styles</h4>
      <div className="mb-3 flex flex-wrap gap-1">
        {styles.map((s) => (
          <button
            key={s.name}
            onClick={() => setSelected(s.name)}
            className={`rounded px-2 py-1 text-[11px] font-medium transition-colors ${
              selected === s.name ? 'bg-cyan-600/20 text-cyan-300 ring-1 ring-cyan-600/40' : 'bg-stone-800 text-stone-400 hover:text-stone-300'
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>
      {style && (
        <div className="space-y-1 text-[11px] text-stone-400">
          {([
            ['Arrow', style.arrowType],
            ['Text height', `${style.textHeight} mm`],
            ['Arrow size', `${style.arrowSize} mm`],
            ['Precision', `${style.precision} dp`],
            ['Units', style.units],
            ['Color', style.color],
          ] as [string, string][]).map(([label, val]) => (
            <div key={label} className="flex justify-between">
              <span>{label}</span>
              <span className="text-stone-300">{val}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function LayerStandardSection() {
  const [filterDisc, setFilterDisc] = useState<string | null>(null)
  const discs = ['A', 'S', 'M', 'E', 'P', 'I', 'L', 'C'] as const
  const filtered = filterDisc ? AIA_LAYERS.filter((l) => l.discipline === filterDisc) : AIA_LAYERS

  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold text-stone-300">AIA Layer Standard</h4>
      <div className="mb-3 flex flex-wrap gap-1">
        <button
          onClick={() => setFilterDisc(null)}
          className={`rounded px-2 py-1 text-[11px] font-medium transition-colors ${!filterDisc ? 'bg-cyan-600/20 text-cyan-300 ring-1 ring-cyan-600/40' : 'bg-stone-800 text-stone-400 hover:text-stone-300'}`}
        >All</button>
        {discs.map((d) => (
          <button
            key={d}
            onClick={() => setFilterDisc(d)}
            className={`rounded px-2 py-1 text-[11px] font-medium transition-colors ${filterDisc === d ? 'bg-cyan-600/20 text-cyan-300 ring-1 ring-cyan-600/40' : 'bg-stone-800 text-stone-400 hover:text-stone-300'}`}
          >{getDisciplinePrefix(d)}</button>
        ))}
      </div>
      <div className="max-h-80 space-y-0.5 overflow-y-auto">
        {filtered.map((layer) => (
          <div key={layer.code} className="flex items-center justify-between rounded px-2 py-1 text-[11px] text-stone-400 hover:bg-stone-800/50">
            <span className="font-mono text-stone-300">{layer.code}</span>
            <span className="flex-1 px-2">{layer.name}</span>
            <span className="text-[10px] text-stone-400" title={layer.description}>{layer.description.slice(0, 40)}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-stone-400">{filtered.length} layers</p>
    </div>
  )
}

function LineweightSection() {
  const entries = Object.entries(LW) as [string, number][]

  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold text-stone-300">Lineweights (mm)</h4>
      <div className="space-y-1">
        {entries.map(([key, val]) => (
          <div key={key} className="flex items-center gap-3 rounded px-2 py-1 text-[11px] text-stone-400 hover:bg-stone-800/50">
            <div className="h-0 w-12" style={{ borderTop: `${val}px solid #94a3b8` }} />
            <span className="w-20 font-mono text-stone-300">{key}</span>
            <span className="text-stone-400">{val} mm</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function NamingSection() {
  const [projectCode, setProjectCode] = useState('PRJ-001')
  const [discipline, setDiscipline] = useState<DrawingNamingOptions['discipline']>('A')
  const [sheetNumber, setSheetNumber] = useState('001')
  const [revision, setRevision] = useState('00')
  const [title, setTitle] = useState('Floor Plan')

  const preview = formatDrawingName({ projectCode, discipline, sheetNumber, revision, title })

  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold text-stone-300">Drawing Naming</h4>
      <div className="mb-3 space-y-2 text-[11px]">
        {([
          ['Project Code', projectCode, setProjectCode],
          ['Sheet #', sheetNumber, setSheetNumber],
          ['Revision', revision, setRevision],
          ['Title', title, setTitle],
        ] as [string, string, (v: string) => void][]).map(([label, val, set]) => (
          <div key={label} className="flex items-center gap-2">
            <span className="w-20 text-stone-400">{label}</span>
            <input
              value={val}
              onChange={(e) => set(e.target.value)}
              className="flex-1 rounded border border-stone-700 bg-stone-900 px-2 py-1 text-stone-200 outline-none focus:border-cyan-600/60"
            />
          </div>
        ))}
        <div className="flex items-center gap-2">
          <span className="w-20 text-stone-400">Discipline</span>
          <select
            value={discipline}
            onChange={(e) => setDiscipline(e.target.value as DrawingNamingOptions['discipline'])}
            className="flex-1 rounded border border-stone-700 bg-stone-900 px-2 py-1 text-stone-200 outline-none focus:border-cyan-600/60"
          >
            {(['A', 'S', 'M', 'E', 'P', 'I', 'L', 'C'] as const).map((d) => (
              <option key={d} value={d}>{getDisciplinePrefix(d)}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="rounded bg-stone-900 px-3 py-2 font-mono text-[11px] text-cyan-300">
        {preview}
      </div>
    </div>
  )
}
