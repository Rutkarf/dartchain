/** Event scoped au dock (wallet, faucet, chain, peers, quests…). */
export const DOCK_REFRESH_EVENT = 'dartchain-refresh-dock';

/** Event scoped au showcase (tous les onglets hub). */
export const SHOWCASE_REFRESH_EVENT = 'dartchain-refresh-showcase';

export function refreshEventMatchesTab(event: Event, tab: string): boolean {
  const detail = (event as CustomEvent<{ tab?: string }>).detail;
  return !detail?.tab || detail.tab === tab;
}
