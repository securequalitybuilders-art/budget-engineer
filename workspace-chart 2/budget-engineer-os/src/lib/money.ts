export const cents = (value: number): number => Math.round(value * 100)

export const fromCents = (value: number): number => value / 100

export const formatCurrency = (valueInCents: number, currency = 'USD', locale = 'en-ZW'): string =>
  new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(fromCents(valueInCents))

export const multiplyMoney = (unitRateCents: number, quantity: number): number =>
  Math.round(unitRateCents * quantity)
