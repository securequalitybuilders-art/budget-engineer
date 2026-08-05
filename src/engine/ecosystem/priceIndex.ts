export interface MarketRateLike {
  code: string;
  description: string;
  unit: string;
  baseRateCents: number;
  year: number;
}

export interface IndexSeriesPoint {
  dayOffset: number;
  valueCents: number;
}

export interface MarketIndex {
  symbol: string;
  label: string;
  unit: string;
  baseCents: number;
  currentCents: number;
  changePct: number;
  series: IndexSeriesPoint[];
  currency: 'USD' | 'ZWG';
}

export const FX_USD_TO_ZWG = 26;

function hashStr(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function deterministicPct(symbol: string, dayOffset: number): number {
  const seed = hashStr(`${symbol}:${dayOffset}`);
  return ((seed % 1000) / 1000) * 0.1 - 0.05;
}

export function buildIndexSeries(symbol: string, baseCents: number, days = 30): IndexSeriesPoint[] {
  return Array.from({ length: days }, (_, i) => ({
    dayOffset: i,
    valueCents: Math.round(baseCents * (1 + deterministicPct(symbol, i))),
  }));
}

export function fxConvert(usdCents: number, fx: number, currency: 'USD' | 'ZWG'): number {
  return currency === 'ZWG' ? Math.round(usdCents * fx) : usdCents;
}

export function buildMarketIndex(
  rates: MarketRateLike[],
  fx: number = FX_USD_TO_ZWG,
  currency: 'USD' | 'ZWG' = 'USD',
  days = 30
): MarketIndex[] {
  return rates
    .filter((r) => r.baseRateCents > 0)
    .map((r) => {
      const series = buildIndexSeries(r.code, r.baseRateCents, days);
      const last = series[series.length - 1];
      const baseConverted = fxConvert(r.baseRateCents, fx, currency);
      const currentConverted = fxConvert(last.valueCents, fx, currency);
      return {
        symbol: r.code,
        label: r.description,
        unit: r.unit,
        baseCents: baseConverted,
        currentCents: currentConverted,
        changePct: Math.round(((currentConverted - baseConverted) / baseConverted) * 10000) / 100,
        series,
        currency,
      };
    });
}
