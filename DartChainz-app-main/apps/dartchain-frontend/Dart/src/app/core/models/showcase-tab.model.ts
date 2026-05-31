export type ShowcaseTab = 'tours' | 'reseau' | 'rv23' | 'peers' | 'dao';

export const SHOWCASE_TABS: ReadonlyArray<{
  id: ShowcaseTab;
  label: string;
}> = [
  { id: 'tours', label: 'TOUS' },
  { id: 'reseau', label: 'RÉSEAU' },
  { id: 'rv23', label: 'R4V3' },
  { id: 'peers', label: 'PEERS' },
  { id: 'dao', label: 'D.A.O' },
];

/** Anciens identifiants showcase → onglets hub maquette. */
export const LEGACY_SHOWCASE_TAB_MAP: Readonly<Record<string, ShowcaseTab>> = {
  news: 'dao',
  chat: 'rv23',
  launchlab: 'dao',
};

export function normalizeShowcaseTab(tab: string): ShowcaseTab {
  if (
    tab === 'tours' ||
    tab === 'reseau' ||
    tab === 'rv23' ||
    tab === 'peers' ||
    tab === 'dao'
  ) {
    return tab;
  }
  return LEGACY_SHOWCASE_TAB_MAP[tab] ?? 'tours';
}
