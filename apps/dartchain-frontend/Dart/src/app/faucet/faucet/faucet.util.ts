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
