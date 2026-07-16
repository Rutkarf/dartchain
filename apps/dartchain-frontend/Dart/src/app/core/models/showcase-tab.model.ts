export type ShowcaseTab =
  | 'tours'
  | 'r4v3'
  | 'reseau'
  | 'rv23'
  | 'peers'
  | 'dao'
  | 'daonews';

export const SHOWCASE_TABS: ReadonlyArray<{
  id: ShowcaseTab;
  label: string;
}> = [
  { id: 'tours', label: 'TOUS' },
  { id: 'r4v3', label: 'R4V3' },
  { id: 'reseau', label: 'RÉSEAU' },
  { id: 'rv23', label: 'CHAT' },
  { id: 'peers', label: 'PEERS' },
  { id: 'dao', label: 'LAUNCH' },
  { id: 'daonews', label: 'D.A.O' },
];

/** Anciens identifiants showcase → onglets hub maquette. */
export const LEGACY_SHOWCASE_TAB_MAP: Readonly<Record<string, ShowcaseTab>> = {
  news: 'tours',
  chat: 'rv23',
  launchlab: 'dao',
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
    tab === 'reseau' ||
    tab === 'rv23' ||
    tab === 'peers' ||
    tab === 'dao' ||
    tab === 'daonews'
  ) {
    return tab;
  }
  return LEGACY_SHOWCASE_TAB_MAP[tab] ?? 'tours';
}
