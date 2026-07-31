import { useState, useCallback, useRef } from 'react'
import { runPipeline, type PipelineInput, type PipelineResult } from '@/engine/pipeline/generativeDesignPipeline'

export interface UsePipelineReturn {
  run: (input: PipelineInput) => Promise<PipelineResult>
  result: PipelineResult | null
  isLoading: boolean
  error: string | null
  reset: () => void
}

export function usePipeline(): UsePipelineReturn {
  const [result, setResult] = useState<PipelineResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef(false)

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
    setIsLoading(false)
    abortRef.current = false
  }, [])

  const run = useCallback(async (input: PipelineInput): Promise<PipelineResult> => {
    setIsLoading(true)
    setError(null)
    setResult(null)
    abortRef.current = false

    try {
      const pipelineResult = await runPipeline(input)
      if (abortRef.current) {
        setIsLoading(false)
        return pipelineResult
      }
      setResult(pipelineResult)
      if (!pipelineResult.success) {
        const msg = pipelineResult.errors.join('; ')
        setError(msg || 'Pipeline completed with errors')
      }
      return pipelineResult
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
      throw e
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { run, result, isLoading, error, reset }
}
