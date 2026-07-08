import type { CadDocument, CadTool } from '../../domain/cad'

interface CadToolbarProps {
  doc: CadDocument | null
  onToolChange: (tool: CadTool) => void
}

const tools: CadTool[] = ['select', 'wall', 'opening', 'annotation']

export function CadToolbar({ doc, onToolChange }: CadToolbarProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {tools.map((tool) => {
        const active = doc?.activeTool === tool
        return (
          <button
            key={tool}
            onClick={() => onToolChange(tool)}
            className={`rounded-xl border px-3 py-2 text-sm ${active ? 'border-cyan-400/40 bg-cyan-500/10 text-cyan-200' : 'border-white/10 bg-slate-900 text-white'}`}
          >
            {tool[0].toUpperCase() + tool.slice(1)}
          </button>
        )
      })}
    </div>
  )
}
