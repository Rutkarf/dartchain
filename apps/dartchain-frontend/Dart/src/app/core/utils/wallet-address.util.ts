export const R4V3_ADDRESS_PREFIX = 'R4V3';

export function stripR4v3AddressPrefix(address: string): string {
  const trimmed = address.trim();
  if (trimmed.toUpperCase().startsWith(R4V3_ADDRESS_PREFIX)) {
    return trimmed.slice(R4V3_ADDRESS_PREFIX.length);
  }

  return trimmed;
}

export function displayR4v3Address(address: string | null | undefined): string {
  if (!address?.trim()) {
    return `${R4V3_ADDRESS_PREFIX}…`;
  }

  const trimmed = address.trim();
  if (trimmed.toUpperCase().startsWith(R4V3_ADDRESS_PREFIX)) {
    return trimmed;
  }

  return `${R4V3_ADDRESS_PREFIX}${trimmed}`;
}

export function normalizeAddressForApi(address: string): string {
  const stripped = stripR4v3AddressPrefix(address);
  return normalizeWalletAddress(stripped) ?? stripped;
}

export function normalizeWalletAddress(address: string | null | undefined): string | null {
  if (!address) {
    return null;
  }

  const trimmed = stripR4v3AddressPrefix(address);
  if (trimmed.startsWith('0x') || trimmed.startsWith('0X')) {
    return `0x${trimmed.slice(2).toLowerCase()}`;
  }

  return trimmed;
}

export function isEvmAddress(address: string | null | undefined): boolean {
  const normalized = normalizeWalletAddress(address);
  return !!normalized && /^0x[a-f0-9]{40}$/.test(normalized);
}

export function isLegacyAddress(address: string | null | undefined): boolean {
  if (!address) {
    return false;
  }

  return /^[a-fA-F0-9]{40,128}$/.test(address.trim()) && !isEvmAddress(address);
}

export function isValidBlockchainAddress(address: string | null | undefined): boolean {
  return isEvmAddress(address) || isLegacyAddress(address);
}
