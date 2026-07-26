export function snapToGrid(value: number, step: number): number {
  if (step <= 0) return value
  return Number((Math.round(value / step) * step).toFixed(4))
}
