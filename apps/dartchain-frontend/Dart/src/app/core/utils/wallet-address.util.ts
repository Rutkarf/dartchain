export const R4V3_ADDRESS_PREFIX = 'R4V3';

/**
 * Formats affichés:
 * - actuel: `usernameR4V3{hash}`
 * - legacy: `@usernameR4V3{hash}` / `@username+R4V3+{hash}` (toujours acceptés en entrée)
 */
const USER_WALLET_ADDRESS_RE =
  /^(?:@)?([A-Za-z0-9._-]+?)(?:\+)?R4V3(?:\+)?([A-Za-z0-9]+)$/i;

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

export function formatUserWalletAddress(
  username: string | null | undefined,
  address: string | null | undefined
): string {
  const hash = extractWalletHash(address);
  if (!hash) {
    return `${R4V3_ADDRESS_PREFIX}…`;
  }

  const user = username?.trim().replace(/^@+/, '');
  if (!user) {
    return displayR4v3Address(hash);
  }

  return `${user}${R4V3_ADDRESS_PREFIX}${hash}`;
}

/**
 * Normalise une adresse pour l’affichage UI:
 * - conserve `usernameR4V3hash` si présent
 * - sinon applique `fallbackUsername` + hash
 */
export function toDisplayWalletAddress(
  address: string | null | undefined,
  fallbackUsername?: string | null
): string {
  const trimmed = address?.trim() ?? '';
  if (!trimmed) {
    return formatUserWalletAddress(fallbackUsername, '');
  }

  const userMatch = USER_WALLET_ADDRESS_RE.exec(trimmed);
  if (userMatch) {
    return `${userMatch[1]}${R4V3_ADDRESS_PREFIX}${userMatch[2]}`;
  }

  return formatUserWalletAddress(fallbackUsername, trimmed);
}

/** Extrait le hash crypto depuis `userR4V3hash`, `R4V3hash` ou hash brut. */
export function extractWalletHash(address: string | null | undefined): string {
  if (!address?.trim()) {
    return '';
  }

  const trimmed = address.trim();

  // Plain R4V3 / 0x / hex — do not treat as usernameR4V3…
  if (
    trimmed.toUpperCase().startsWith(R4V3_ADDRESS_PREFIX) ||
    trimmed.startsWith('0x') ||
    trimmed.startsWith('0X') ||
    /^[a-fA-F0-9]{40,128}$/.test(trimmed)
  ) {
    return stripR4v3AddressPrefix(trimmed);
  }

  const userMatch = USER_WALLET_ADDRESS_RE.exec(trimmed);
  if (userMatch) {
    return userMatch[2];
  }

  return stripR4v3AddressPrefix(trimmed);
}

export function normalizeAddressForApi(address: string): string {
  const hash = extractWalletHash(address);
  return normalizeWalletAddress(hash) ?? hash;
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
