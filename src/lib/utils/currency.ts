const SYMBOLS: Record<string, string> = {
  USD: '$', ZAR: 'R', KES: 'KSh', GBP: '£', EUR: '€', NGN: '₦',
};

export function currencySymbol(currency: string): string {
  return SYMBOLS[currency] ?? (currency + ' ');
}

export function makeMoney(currency: string) {
  const sym = currencySymbol(currency);
  return (n: number, dp = 2) =>
    sym + n.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
}
