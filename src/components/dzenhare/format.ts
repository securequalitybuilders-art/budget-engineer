/** Formatting helpers for the DzeNhare component kit (no React, leaf module). */

/** Format integer cents as a USD figure with thousands separators (100 cents = $1). */
export function fmtMoney(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const dollars = Math.round(Math.abs(cents) / 100);
  return `${sign}$${dollars.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

/** Format a percentage with the given digits. */
export function fmtPct(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}
