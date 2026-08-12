export type ShowcaseTab =
  | 'tours'
  | 'r4v3'
  | 'rv23'
  | 'dao'
  | 'daonews'
  | 'market';

export const SHOWCASE_TABS: ReadonlyArray<{
  id: ShowcaseTab;
  label: string;
}> = [
  { id: 'tours', label: 'TOUS' },
  { id: 'r4v3', label: 'R4V3' },
  { id: 'rv23', label: 'CHAT' },
  { id: 'dao', label: 'LABZ' },
  { id: 'daonews', label: 'D.A.O' },
  { id: 'market', label: 'MARCHÉ' },
];

/** Anciens identifiants showcase → onglets hub maquette. */
export const LEGACY_SHOWCASE_TAB_MAP: Readonly<Record<string, ShowcaseTab>> = {
  news: 'tours',
  chat: 'rv23',
  launchlab: 'dao',
  /** Ancien onglet RÉSEAU (terminal) — info dispo via dock chaîne / peers. */
  peers: 'tours',
  reseau: 'tours',
};

export function isNewsShowcaseTab(tab: ShowcaseTab): boolean {
  return tab === 'tours' || tab === 'daonews';
}

export function isR4v3ShowcaseTab(tab: ShowcaseTab): boolean {
  return tab === 'r4v3';
}

export function newsCategoryForTab(tab: ShowcaseTab): string {
  switch (tab) {
    case 'r4v3':
      return 'R4V3';
    case 'daonews':
      return 'Écosystème';
    default:
      return 'all';
  }
}

export function normalizeShowcaseTab(tab: string): ShowcaseTab {
  if (
    tab === 'tours' ||
    tab === 'r4v3' ||
    tab === 'rv23' ||
    tab === 'dao' ||
    tab === 'daonews' ||
    tab === 'market'
  ) {
    return tab;
  }
  return LEGACY_SHOWCASE_TAB_MAP[tab] ?? 'tours';
}
