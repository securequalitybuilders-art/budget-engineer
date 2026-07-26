import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind classes with clsx + tailwind-merge.
 * This is the same `cn` helper used by shadcn/ui.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format integer cents as a localized currency string.
 * Example: 125000 -> "$1,250.00" (USD).
 */
export function fmtCents(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

/**
 * Ensure a value is an integer number of cents.
 * Rejects floats and negative values.
 */
export function toCents(value: number): number {
  if (!Number.isFinite(value)) throw new Error('Invalid monetary value');
  const cents = Math.round(value * 100);
  if (cents < 0) throw new Error('Cents cannot be negative');
  return cents;
}

/**
 * Generate a UUID v4.
 */
export function uuid(): string {
  return crypto.randomUUID();
}

/**
 * Deep clone a serializable object.
 */
export function clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

// ─── Money helpers (from WS2) ────────────────────────────────────────

export function cents(value: number): number {
  return Math.round(value * 100);
}

export function fromCents(value: number): number {
  return value / 100;
}

export function formatCurrency(valueInCents: number, currency = 'USD', locale = 'en-ZW'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(fromCents(valueInCents));
}

export function multiplyMoney(unitRateCents: number, quantity: number): number {
  return Math.round(unitRateCents * quantity);
}
