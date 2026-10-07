/** Retire toute mention visible de USD dans les libellés marché. */
export function stripUsdFromMarketLabel(value: string): string {
  if (!value?.trim()) {
    return value;
  }

  return value
    .replace(/\s*\/\s*USD\b/gi, ' / CHF')
    .replace(/\bUSD\b/gi, 'CHF')
    .replace(/\$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function formatMarketDelta(changePercent?: number): string {
  if (changePercent === undefined || Number.isNaN(changePercent)) {
    return '—';
  }

  const prefix = changePercent >= 0 ? '+' : '';
  return `${prefix}${changePercent.toFixed(2).replace('.', ',')}%`;
}
