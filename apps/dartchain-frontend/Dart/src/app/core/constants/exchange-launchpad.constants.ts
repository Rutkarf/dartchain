/** Token natif DartChain — affiché en m4t3r (micro-unité) dans l'exchange panel. */
export const EXCHANGE_NATIVE_TOKEN = 'R4V3';

/** Libellé UI pour le solde R4V3 (plus petite unité, aligné faucet). */
export const EXCHANGE_NATIVE_UNIT_LABEL = 'm4t3r';

/** Valeur placeholder du champ montant (sans unité). */
export const EXCHANGE_AMOUNT_VALUE_PLACEHOLDER =
  '0,00000000000000000000000001';

/** Placeholder complet montant + unité m4t3r (sr-only / hints). */
export const EXCHANGE_AMOUNT_PLACEHOLDER = `${EXCHANGE_AMOUNT_VALUE_PLACEHOLDER} ${EXCHANGE_NATIVE_UNIT_LABEL}`;

/** 5 tokens LaunchLab échangeables contre R4V3 / m4t3r. */
export const EXCHANGE_LAUNCHPAD_SWAP_TOKENS = [
  'PXD',
  'NVFI',
  'LAB3',
  'ORB',
] as const;

/** Grille UI exchange 3×3 (9 emplacements visuels). */
export const EXCHANGE_LAUNCHPAD_GRID_COLUMNS = 3;
export const EXCHANGE_LAUNCHPAD_GRID_SIZE =
  EXCHANGE_LAUNCHPAD_GRID_COLUMNS * EXCHANGE_LAUNCHPAD_GRID_COLUMNS;

export function buildLaunchpadGridSlots(
  tokens: readonly string[],
  size: number = EXCHANGE_LAUNCHPAD_GRID_SIZE
): (string | null)[] {
  const slots: (string | null)[] = Array.from({ length: size }, () => null);
  tokens.slice(0, size).forEach((symbol, index) => {
    slots[index] = symbol;
  });
  return slots;
}

/** Liste complète (natif + launchpad) pour l'API exchange-panel. */
export const EXCHANGE_LAUNCHPAD_FALLBACK_TOKENS = [
  EXCHANGE_NATIVE_TOKEN,
  ...EXCHANGE_LAUNCHPAD_SWAP_TOKENS,
] as const;

export type ExchangeLaunchpadToken =
  (typeof EXCHANGE_LAUNCHPAD_FALLBACK_TOKENS)[number];

export function isExchangeNativeToken(symbol: string): boolean {
  return symbol.trim().toUpperCase() === EXCHANGE_NATIVE_TOKEN;
}

export function isLaunchpadSwapToken(symbol: string): boolean {
  const normalized = symbol.trim().toUpperCase();
  return (EXCHANGE_LAUNCHPAD_SWAP_TOKENS as readonly string[]).includes(normalized);
}

export function tokenUnitLabel(symbol: string): string {
  return isExchangeNativeToken(symbol) ? EXCHANGE_NATIVE_UNIT_LABEL : symbol;
}

export function defaultLaunchCounterToken(
  tokens: readonly string[] = EXCHANGE_LAUNCHPAD_SWAP_TOKENS
): string {
  const normalized = tokens.map((t) => t.trim().toUpperCase());
  return normalized.find((t) => isLaunchpadSwapToken(t)) ?? 'PXD';
}

export function filterLaunchpadTokenList(tokens: readonly string[]): string[] {
  const allowed = new Set<string>(
    EXCHANGE_LAUNCHPAD_FALLBACK_TOKENS.map((t) => t.toUpperCase())
  );
  const ordered: string[] = [EXCHANGE_NATIVE_TOKEN];
  for (const symbol of EXCHANGE_LAUNCHPAD_SWAP_TOKENS) {
    if (tokens.map((t) => t.toUpperCase()).includes(symbol)) {
      ordered.push(symbol);
    }
  }
  if (ordered.length === 1) {
    return [...EXCHANGE_LAUNCHPAD_FALLBACK_TOKENS];
  }
  return ordered.filter((t) => allowed.has(t.toUpperCase()));
}
