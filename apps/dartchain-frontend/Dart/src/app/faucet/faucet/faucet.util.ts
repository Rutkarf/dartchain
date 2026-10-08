const DECIMALS = 26;
const MAX_WHOLE_UNITS = 1n;
const SCALE = 10n ** BigInt(DECIMALS);

export function normalizeWalletAddress(address: string): string {
  const trimmed = address.trim();
  if (trimmed.startsWith('0x') || trimmed.startsWith('0X')) {
    return `0x${trimmed.slice(2).toLowerCase()}`;
  }
  return trimmed;
}

/** Mirrors backend WalletValidator.isValidBlockchainAddress + optional prefix. */
export function isWalletValidForFaucet(address: string, expectedPrefix?: string | null): boolean {
  if (!address?.trim() || address.includes(' ')) {
    return false;
  }

  const normalized = normalizeWalletAddress(address);

  if (isEvmAddress(normalized)) {
    return /^0x[a-f0-9]{40}$/.test(normalized);
  }

  if (normalized.length >= 40 && normalized.length <= 128) {
    return /^[a-fA-F0-9]+$/.test(normalized);
  }

  const prefix = expectedPrefix?.trim();
  if (prefix) {
    return address.trim().startsWith(prefix);
  }

  return false;
}

export function isEvmAddress(address: string): boolean {
  const normalized = normalizeWalletAddress(address);
  return normalized.startsWith('0x') && normalized.length === 42;
}

export function parseAmountToSmallestUnits(amount: string): bigint | null {
  const normalized = amount.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    return null;
  }

  const [wholeRaw, decimalRaw = ''] = normalized.split('.');
  const paddedDecimal = `${decimalRaw}${'0'.repeat(DECIMALS)}`.slice(0, DECIMALS);
  try {
    return BigInt(wholeRaw || '0') * SCALE + BigInt(paddedDecimal || '0');
  } catch {
    return null;
  }
}

export function smallestUnitsToAmount(units: bigint): string {
  const whole = units / SCALE;
  const fraction = units % SCALE;
  return `${whole}.${fraction.toString().padStart(DECIMALS, '0')}`;
}

export function maxClaimSmallestUnits(maxClaimAmount = '1'): bigint {
  return parseAmountToSmallestUnits(maxClaimAmount) ?? MAX_WHOLE_UNITS * SCALE;
}

/** Nombre entier de m4t3r (1 m4t3r = 10^-26 R4V3), sans passer par un float. */
export function m4t3rUnitCount(amount: string | number | null | undefined): bigint | null {
  if (amount == null) {
    return null;
  }

  if (typeof amount === 'number') {
    if (!Number.isFinite(amount) || amount < 0) {
      return null;
    }
    return m4t3rUnitCount(amount.toExponential());
  }

  const trimmed = amount.trim();
  if (!trimmed) {
    return null;
  }

  if (/e/i.test(trimmed)) {
    const plain = scientificToDecimalPlain(trimmed);
    return plain == null ? null : parseAmountToSmallestUnits(plain);
  }

  return parseAmountToSmallestUnits(trimmed);
}

/** `8E-26` → `0.000…008` en arithmétique entière, sans Number.toFixed. */
function scientificToDecimalPlain(value: string): string | null {
  const match = /^(\d+)(?:\.(\d+))?[eE]([+-]?\d+)$/.exec(value.trim());
  if (!match) {
    return null;
  }

  const digits = `${match[1]}${match[2] ?? ''}`.replace(/^0+(?=\d)/, '');
  const exponent = Number(match[3]) - (match[2]?.length ?? 0);
  if (!Number.isSafeInteger(exponent)) {
    return null;
  }

  if (exponent >= 0) {
    return `${digits}${'0'.repeat(exponent)}`;
  }

  const point = digits.length + exponent;
  if (point > 0) {
    return `${digits.slice(0, point)}.${digits.slice(point)}`;
  }

  return `0.${'0'.repeat(-point)}${digits}`;
}

export function formatM4t3rUnitCount(amount: string | number | null | undefined): string | null {
  const units = m4t3rUnitCount(amount);
  return units == null ? null : units.toString();
}

export function formatDisplayAmount(units: bigint): { whole: bigint; decimal: bigint; line: string } {
  const whole = units / SCALE;
  const decimal = units % SCALE;
  const decimalDigits = decimal.toString().padStart(DECIMALS, '0');
  return {
    whole,
    decimal,
    line: `${whole.toString()},${decimalDigits}`,
  };
}

/** Groupe les décimales par 3 : `000000001` → `000 000 001`. */
export function formatSpacedDecimalDigits(digits: string, groupSize = 3): string {
  const raw = digits.replace(/\D/g, '');
  if (!raw.length) return digits;
  const parts: string[] = [];
  for (let i = 0; i < raw.length; i += groupSize) {
    parts.push(raw.slice(i, i + groupSize));
  }
  return parts.join('\u202f');
}

/** Affichage smartbar : `0 , 000 000 … 001`. */
export function formatSmartbarAmount(whole: string, decimalDigits: string): string {
  return `${whole} , ${formatSpacedDecimalDigits(decimalDigits)}`;
}
