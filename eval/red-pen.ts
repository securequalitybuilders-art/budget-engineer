export interface RedPenTakeOffInput {
  item: string
  required: number
  quoted: number
  unitCost: number
  trenchM3?: number
}

export interface RedPenTakeOffResult {
  valid: true
  title: string
  flag: string
  item: string
  trenchM3?: number
  required: number
  quoted: number
  variance: number
  leakage: number
  leakageLabel: string
  unitCost: number
  quantity: number
  methodology: string
  auditStyle: string
  presentation: { fontVariant: string; font: string }
  sources: string[]
}

export function redPenTakeOff(input: RedPenTakeOffInput): RedPenTakeOffResult {
  const required = input.required
  const quoted = input.quoted
  const variance = quoted - required
  const leakage = Math.round(variance * input.unitCost * 100) / 100
  return {
    valid: true,
    title: 'Red Pen variance audit',
    flag: 'Ghost Materials',
    item: input.item,
    ...(input.trenchM3 !== undefined ? { trenchM3: input.trenchM3 } : {}),
    required,
    quoted,
    variance,
    leakage,
    leakageLabel: `$${leakage.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    unitCost: input.unitCost,
    quantity: required,
    methodology: 'Red Pen Engine — ZIQS SMM net take-off, SAZ 7 MPa materials',
    auditStyle: 'forensic',
    presentation: { fontVariant: 'tabular-nums', font: 'JetBrains Mono' },
    sources: ['ZIQS SMM', 'SAZ'],
  }
}

export const RED_PEN_CANONICAL_ID = 'red_pen_canonical_trench_12m3_cement_420_vs_600'
export const RED_PEN_BRICK_TOOL_ID = 'red_pen_tool_calculate_brick_quantity_variance'
