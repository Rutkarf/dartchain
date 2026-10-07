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

/** Addition décimale string (évite les erreurs float pour les micro-montants). */
export function addR4v3Amounts(
  a: string | number | null | undefined,
  b: string | number | null | undefined
): string {
  const left = normalizeR4v3Amount(a);
  const right = normalizeR4v3Amount(b);
  const scale = Math.max(
    (left.split('.')[1] ?? '').length,
    (right.split('.')[1] ?? '').length,
    1
  );
  const toInt = (v: string): bigint => {
    const neg = v.startsWith('-');
    const unsigned = neg ? v.slice(1) : v;
    const [w, f = ''] = unsigned.split('.');
    const frac = `${f}${'0'.repeat(scale)}`.slice(0, scale);
    const n = BigInt(`${w || '0'}${frac}`);
    return neg ? -n : n;
  };
  const sum = toInt(left) + toInt(right);
  const neg = sum < 0n;
  const abs = neg ? -sum : sum;
  const raw = abs.toString().padStart(scale + 1, '0');
  const whole = raw.slice(0, -scale) || '0';
  const frac = raw.slice(-scale).replace(/0+$/, '');
  const out = frac ? `${whole}.${frac}` : whole;
  return neg ? `-${out}` : out;
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

/** Compare a et b (−1 / 0 / 1). */
export function compareR4v3Amounts(
  a: string | number | null | undefined,
  b: string | number | null | undefined
): number {
  const left = normalizeR4v3Amount(a);
  const right = normalizeR4v3Amount(b);
  const scale = Math.max(
    (left.split('.')[1] ?? '').length,
    (right.split('.')[1] ?? '').length,
    1
  );
  const toInt = (v: string): bigint => {
    const neg = v.startsWith('-');
    const unsigned = neg ? v.slice(1) : v;
    const [w, f = ''] = unsigned.split('.');
    const frac = `${f}${'0'.repeat(scale)}`.slice(0, scale);
    const n = BigInt(`${w || '0'}${frac}`);
    return neg ? -n : n;
  };
  const diff = toInt(left) - toInt(right);
  return diff === 0n ? 0 : diff < 0n ? -1 : 1;
}
export function formatR4v3AmountCompact(
  value: string | number | null | undefined,
  maxFractionDigits = 6
): string {
  const normalized = normalizeR4v3Amount(value);
  const negative = normalized.startsWith('-');
  const unsigned = negative ? normalized.slice(1) : normalized;
  const [wholeRaw, fractionRaw = ''] = unsigned.split('.');
  const whole = wholeRaw || '0';
  const trimmedFrac = fractionRaw.replace(/0+$/, '').slice(0, maxFractionDigits);
  const formattedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  if (!trimmedFrac) {
    return `${negative ? '-' : ''}${formattedWhole}`;
  }
  return `${negative ? '-' : ''}${formattedWhole},${trimmedFrac}`;
}
