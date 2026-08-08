export interface ParsedBrickParams {
  lengthM: number
  heightM: number
  wallThicknessMm: number
  purpose: 'boundary' | 'internal'
  wastagePct?: number
  brickSize?: { lengthMm: number; heightMm: number; widthMm: number }
}

export interface ParsedBrickOk {
  ok: true
  params: ParsedBrickParams
}

export interface ParsedBrickError {
  ok: false
  reasons: string[]
}

export type ParsedBrickPrompt = ParsedBrickOk | ParsedBrickError

const SIZE_RE = /(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)mm/
const METRE_RE = /(-?\d+(?:\.\d+)?)\s*m\b/g
const MILLIMETRE_RE = /(\d+(?:\.\d+)?)\s*mm/g
const WASTAGE_RE = /(-?\d+(?:\.\d+)?)\s*%/g

function firstNumber(text: string, re: RegExp): number | undefined {
  re.lastIndex = 0
  const match = re.exec(text)
  if (!match) return undefined
  const value = Number(match[1])
  return Number.isFinite(value) ? value : undefined
}

export function parseBrickPrompt(prompt: string): ParsedBrickPrompt {
  const reasons: string[] = []
  let working = prompt

  const sizeMatch = SIZE_RE.exec(working)
  let brickSize: { lengthMm: number; heightMm: number; widthMm: number } | undefined
  if (sizeMatch) {
    brickSize = {
      lengthMm: Number(sizeMatch[1]),
      heightMm: Number(sizeMatch[2]),
      widthMm: Number(sizeMatch[3]),
    }
    working = working.replace(SIZE_RE, ' ')
  }

  const metres: number[] = []
  for (const match of working.matchAll(METRE_RE)) {
    const value = Number(match[1])
    if (Number.isFinite(value)) metres.push(value)
  }
  if (metres.length < 2) {
    if (metres.length === 0) reasons.push('length and height could not be parsed (expected e.g. "10m ... 2.4m")')
    else reasons.push('height could not be parsed (expected e.g. "2.4m high")')
  }

  const wallThicknessMm = firstNumber(working, MILLIMETRE_RE)
  if (wallThicknessMm === undefined) reasons.push('wall thickness could not be parsed (expected e.g. "230mm thick")')

  const wastagePct = firstNumber(working, WASTAGE_RE)
  if (wastagePct !== undefined && wastagePct < 0) reasons.push('wastage must be a positive percentage')

  if (reasons.length > 0) {
    return { ok: false, reasons }
  }

  const purpose = /partition|internal/i.test(working) ? ('internal' as const) : ('boundary' as const)
  return {
    ok: true,
    params: {
      lengthM: metres[0],
      heightM: metres[1],
      wallThicknessMm: wallThicknessMm as number,
      purpose,
      wastagePct,
      brickSize,
    },
  }
}
