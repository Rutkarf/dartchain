export interface ProductEnvironment {
  commercial: boolean;
  faucetEnabled: boolean;
  showcaseEnabled: boolean;
}

export interface MapEnvironment {
  mapEnabled?: boolean;
  mapProvider?: 'legacy-floor' | 'marseille-osm-three';
  enableOsmBuildings?: boolean;
  enableTerrain?: boolean;
  mapDebug?: boolean;
  mapQuality?: 'low' | 'medium' | 'high';
  opentopographyApiKey?: string;
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
  mapEnabled: true,
  mapProvider: 'marseille-osm-three',
  enableOsmBuildings: true,
  enableTerrain: true,
  mapDebug: false,
  mapQuality: 'medium',
  opentopographyApiKey: '',
} satisfies ProductEnvironment &
  MapEnvironment & {
    production: boolean;
    apiUrl: string;
    liveWsUrl: string;
    chatWsUrl: string;
  };
