import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Sparkles, FileCode, Send } from 'lucide-react'
import {
  DEFAULT_SYSTEM_PROMPT,
  SITE_PLAN_PROMPT,
  FLOOR_PLAN_PROMPT,
} from '@/engine/bim/drawioSystemPrompts'

export interface DrawIoEditorProps {
  initialXml?: string
  onXmlChange?: (xml: string) => void
  height?: number
}

const PRESET_PROMPTS = [
  { label: 'Site Plan', prompt: SITE_PLAN_PROMPT },
  { label: 'Floor Plan', prompt: FLOOR_PLAN_PROMPT },
]

export function DrawIoEditor({
  initialXml = '',
  onXmlChange,
  height = 600,
}: DrawIoEditorProps) {
  const [xml, setXml] = useState(initialXml)
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return
    setIsGenerating(true)
    setLastError(null)

    try {
      const { generateFree } = await import('@/lib/llm/freeRouter')
      const result = await generateFree([
        { role: 'system', content: DEFAULT_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ])

      const parsed = result.text
      if (parsed) {
        const xmlMatch = parsed.match(/<mxGraphModel[\s\S]*<\/mxGraphModel>/)
        if (xmlMatch) {
          setXml(xmlMatch[0])
          onXmlChange?.(xmlMatch[0])
        } else {
          setXml(parsed)
          onXmlChange?.(parsed)
        }
      } else {
        setLastError('No response from AI')
      }
    } catch (err) {
      setLastError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setIsGenerating(false)
    }
  }, [prompt, onXmlChange])

  const handlePreset = useCallback((presetPrompt: string) => {
    setPrompt(presetPrompt)
  }, [])

  return (
    <div
      className="rounded-2xl border border-white/10 bg-slate-950/80 overflow-hidden"
      data-component="drawio-editor"
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
        <FileCode className="h-4 w-4 text-[var(--brand-accent)]" />
        <span className="text-sm font-medium text-[var(--text-primary)]">
          AI Diagram Editor
        </span>
      </div>

      <div className="flex gap-2 px-4 py-2 border-b border-white/5">
        {PRESET_PROMPTS.map((p) => (
          <Button
            key={p.label}
            variant="ghost"
            size="sm"
            onClick={() => handlePreset(p.prompt)}
            className="text-xs h-7"
          >
            {p.label}
          </Button>
        ))}
      </div>

      <div className="px-4 py-3 border-b border-white/5">
        <div className="flex gap-2">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the diagram you want to create..."
            className="flex-1 bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-slate-400 resize-none"
            rows={2}
          />
          <Button
            variant="brand"
            size="sm"
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="self-end"
          >
            {isGenerating ? (
              <Sparkles className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        {lastError && (
          <p className="mt-1 text-xs text-red-400">{lastError}</p>
        )}
      </div>

      <div
        className="bg-white"
        style={{ height }}
        data-testid="drawio-canvas"
      >
        {xml ? (
          <div
            className="w-full h-full flex items-center justify-center text-slate-400 text-sm"
            data-testid="diagram-rendered"
          >
            <div className="text-center">
              <FileCode className="h-8 w-8 mx-auto mb-2 text-slate-400" />
              <p>Diagram loaded ({xml.length} chars XML)</p>
              <p className="text-xs text-slate-400 mt-1">Ready for export or further editing</p>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
            <p>No diagram yet. Use the AI prompt above to generate one.</p>
          </div>
        )}
      </div>
    </div>
  )
}
