import type {
  GainFadeActualLine,
  GainFadeBidLine,
  GainFadeLine,
  GainFadeResult,
  GainFadeVerdict,
} from '@/domain/closeout'

function verdictFor(varianceCents: number): GainFadeVerdict {
  if (varianceCents > 1) return 'fade'
  if (varianceCents < -1) return 'gain'
  return 'neutral'
}

export function analyzeGainFade(
  projectId: string,
  bids: GainFadeBidLine[],
  actuals: GainFadeActualLine[],
): GainFadeResult {
  const actualByCode = new Map(actuals.map((a) => [a.code, a.actualCents]))
  const lines: GainFadeLine[] = bids.map((b) => {
    const actualCents = actualByCode.get(b.code) ?? 0
    const varianceCents = actualCents - b.bidCents
    const variancePct = b.bidCents > 0 ? (varianceCents / b.bidCents) * 100 : 0
    return {
      code: b.code,
      description: b.description,
      bidCents: b.bidCents,
      actualCents,
      varianceCents,
      variancePct: Math.round(variancePct * 100) / 100,
      verdict: verdictFor(varianceCents),
    }
  })

  const bidTotalCents = lines.reduce((s, l) => s + l.bidCents, 0)
  const actualTotalCents = lines.reduce((s, l) => s + l.actualCents, 0)
  const varianceCents = actualTotalCents - bidTotalCents
  const variancePct = bidTotalCents > 0 ? Math.round((varianceCents / bidTotalCents) * 10000) / 100 : 0

  return {
    id: crypto.randomUUID(),
    projectId,
    lines,
    bidTotalCents,
    actualTotalCents,
    varianceCents,
    variancePct,
    gains: lines.filter((l) => l.verdict === 'gain').length,
    fades: lines.filter((l) => l.verdict === 'fade').length,
    verdict: verdictFor(varianceCents),
    computedAt: new Date().toISOString(),
  }
}

export function gainFadeFromBoq(
  projectId: string,
  boqBidLines: { code: string; description: string; bidCents: number }[],
  actualByCode: Record<string, number>,
): GainFadeResult {
  return analyzeGainFade(
    projectId,
    boqBidLines,
    Object.entries(actualByCode).map(([code, actualCents]) => ({ code, actualCents })),
  )
}
