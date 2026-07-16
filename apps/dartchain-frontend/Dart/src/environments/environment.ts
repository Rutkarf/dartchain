export interface ProductEnvironment {
  commercial: boolean;
  faucetEnabled: boolean;
  showcaseEnabled: boolean;
}

function devWsUrl(path: string): string {
  if (typeof globalThis !== 'undefined' && 'location' in globalThis) {
    const location = globalThis.location as Location;
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    return `${protocol}://${location.host}${path}`;
  }
  return `ws://localhost:4200${path}`;
}

/** Dev : requêtes via le proxy Angular (`proxy.conf.json`) → pas de CORS. */
export const environment = {
  production: false,
  apiUrl: '/api',
  liveWsUrl: devWsUrl('/ws/live'),
  chatWsUrl: devWsUrl('/ws/chat'),
  commercial: false,
  faucetEnabled: true,
  showcaseEnabled: true,
} satisfies ProductEnvironment & {
  production: boolean;
  apiUrl: string;
  liveWsUrl: string;
  chatWsUrl: string;
};
