export function normalizeWalletAddress(address: string | null | undefined): string | null {
  if (!address) {
    return null;
  }

  const trimmed = address.trim();
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
