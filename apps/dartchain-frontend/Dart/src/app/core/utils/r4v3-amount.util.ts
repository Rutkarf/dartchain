export const R4V3_DECIMALS = 26;

/** Normalise une valeur API (string ou number) en montant R4V3 décimal. */
export function normalizeR4v3Amount(
  value: string | number | null | undefined
): string {
  if (value === null || value === undefined) {
    return '0';
  }

  const raw = typeof value === 'number' ? value.toString() : value.trim();
  if (!raw) {
    return '0';
  }

  const normalized = raw.replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
    return '0';
  }

  return normalized;
}

/** Affiche un montant R4V3 avec virgule française et 26 décimales. */
export function formatR4v3Amount(
  value: string | number | null | undefined,
  decimals = R4V3_DECIMALS
): string {
  const normalized = normalizeR4v3Amount(value);
  const negative = normalized.startsWith('-');
  const unsigned = negative ? normalized.slice(1) : normalized;
  const [wholeRaw, fractionRaw = ''] = unsigned.split('.');
  const whole = wholeRaw || '0';
  const fraction = `${fractionRaw}${'0'.repeat(decimals)}`.slice(0, decimals);
  const formattedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${negative ? '-' : ''}${formattedWhole},${fraction}`;
}
