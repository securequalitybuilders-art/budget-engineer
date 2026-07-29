import { useEffect, useRef, useState, useCallback } from 'react'
import '@google/model-viewer'
import { Download, Maximize2, Minimize2, RotateCw, Sun, Moon } from 'lucide-react'

interface GlbViewerProps {
  glbUrl: string | null
  alt?: string
  height?: number | string
  showControls?: boolean
  onExportClick?: () => void
  isExporting?: boolean
  exportError?: string | null
}

type EnvPreset = 'neutral' | 'sunrise' | 'sunset' | 'night'

const ENV_MAP: Record<EnvPreset, string> = {
  neutral: '',
  sunrise: 'https://modelviewer.dev/shared-assets/environments/spruit_sunrise_1k_HDR.hdr',
  sunset: 'https://modelviewer.dev/shared-assets/environments/venice_sunset_1k.hdr',
  night: 'https://modelviewer.dev/shared-assets/environments/aircraft_workshop_01_1k.hdr',
}

export function GlbViewer({
  glbUrl,
  alt = '3D model',
  height = 480,
  showControls = true,
  onExportClick,
  isExporting = false,
  exportError = null,
}: GlbViewerProps) {
  const viewerRef = useRef<HTMLElement>(null)
  const [autoRotate, setAutoRotate] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)
  const [envPreset, setEnvPreset] = useState<EnvPreset>('neutral')
  const [loading, setLoading] = useState(true)

  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLoading(true)
  }, [glbUrl])

  const handleModelLoad = useCallback(() => {
    setLoading(false)
  }, [])

  const handleError = useCallback(() => {
    setLoading(false)
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {})
      setFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => {})
      setFullscreen(false)
    }
  }, [])

  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  if (!glbUrl) {
    return (
      <div
        className="flex items-center justify-center rounded-2xl border border-white/10 bg-slate-950/60"
        style={{ height: typeof height === 'number' ? height : parseInt(height) || 480 }}
      >
        <p className="text-sm text-slate-400">No 3D model loaded. Generate a model first.</p>
      </div>
    )
  }

  const containerStyle: Record<string, string> = {
    height: typeof height === 'number' ? `${height}px` : height,
    width: '100%',
    position: 'relative',
    borderRadius: '12px',
    overflow: 'hidden',
  }

  return (
    <div className="flex flex-col">
      {showControls && (
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setAutoRotate((a) => !a)}
            aria-pressed={autoRotate}
            className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
              autoRotate ? 'bg-cyan-700 text-white' : 'bg-stone-900/80 text-stone-400 hover:bg-stone-800 hover:text-stone-200'
            }`}
          >
            <RotateCw size={12} className="mr-1 inline" /> Auto-Rotate
          </button>

          {(['neutral', 'sunrise', 'sunset', 'night'] as EnvPreset[]).map((preset) => (
            <button
              key={preset}
              onClick={() => setEnvPreset(preset)}
              aria-pressed={envPreset === preset}
              className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                envPreset === preset
                  ? 'bg-cyan-700 text-white'
                  : 'bg-stone-900/80 text-stone-400 hover:bg-stone-800 hover:text-stone-200'
              }`}
            >
              {preset === 'neutral' && <Sun size={12} className="mr-1 inline" />}
              {preset === 'sunrise' && <Sun size={12} className="mr-1 inline text-amber-400" />}
              {preset === 'sunset' && <Sun size={12} className="mr-1 inline text-orange-500" />}
              {preset === 'night' && <Moon size={12} className="mr-1 inline" />}
              {preset.charAt(0).toUpperCase() + preset.slice(1)}
            </button>
          ))}

          <button
            onClick={toggleFullscreen}
            className="rounded-md bg-stone-900/80 px-2.5 py-1 text-[11px] font-medium text-stone-400 transition-colors hover:bg-stone-800 hover:text-stone-200"
          >
            {fullscreen ? <Minimize2 size={12} className="mr-1 inline" /> : <Maximize2 size={12} className="mr-1 inline" />}
            {fullscreen ? 'Exit' : 'Fullscreen'}
          </button>

          {onExportClick && (
            <button
              onClick={onExportClick}
              disabled={isExporting}
              className="rounded-md bg-violet-700/80 px-2.5 py-1 text-[11px] font-medium text-white transition-colors hover:bg-violet-600 disabled:opacity-50"
            >
              <Download size={12} className="mr-1 inline" />
              {isExporting ? 'Exporting...' : 'Export GLB'}
            </button>
          )}
        </div>
      )}

      {exportError && (
        <div className="mb-2 rounded-md bg-red-900/40 px-3 py-1.5 text-[11px] text-red-300">
          Export error: {exportError}
        </div>
      )}

      <div ref={containerRef} style={containerStyle} className="bg-slate-950/60">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
              <p className="text-sm text-slate-400">Loading 3D model...</p>
            </div>
          </div>
        )}

        <model-viewer
          ref={viewerRef}
          src={glbUrl}
          alt={alt}
          camera-controls
          auto-rotate={autoRotate ? '' : undefined}
          auto-rotate-delay={1000}
          shadow-intensity="1"
          shadow-softness="0.5"
          exposure="1"
          interaction-prompt="none"
          loading="eager"
          reveal="auto"
          environment-image={ENV_MAP[envPreset] || undefined}
          style={{ width: '100%', height: '100%', display: 'block' }}
          onLoad={handleModelLoad}
          onError={handleError}
        />
      </div>
    </div>
  )
}
