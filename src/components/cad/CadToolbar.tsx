import type { CadDocument, CadTool } from '../../domain/cad'

interface CadToolbarProps {
  doc: CadDocument
  onToolChange: (tool: CadTool) => void
}

const availableTools: { value: CadTool; label: string }[] = [
  { value: 'select', label: 'Select' },
  { value: 'wall', label: 'Wall' },
  { value: 'annotation', label: 'Annotate' },
]

export function CadToolbar({ doc, onToolChange }: CadToolbarProps) {
  return (
    <div className="flex gap-1 rounded-xl border border-white/10 bg-slate-900 p-1">
      {availableTools.map((tool) => (
        <button
          key={tool.value}
          onClick={() => onToolChange(tool.value)}
          className={`rounded-lg px-3 py-2 text-xs ${doc.activeTool === tool.value ? 'bg-cyan-500/20 text-cyan-200' : 'text-slate-300'}`}
        >
          {tool.label}
        </button>
      ))}
    </div>
  )
}
