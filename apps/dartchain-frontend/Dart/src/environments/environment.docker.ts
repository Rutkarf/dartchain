function runtimeWsUrl(path: string): string {
  if (typeof globalThis !== 'undefined' && 'location' in globalThis) {
    const location = globalThis.location as Location;
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    return `${protocol}://${location.host}${path}`;
  }

  return `ws://localhost${path}`;
}

/** Docker / reverse-proxy : API et WebSockets via le même hôte (nginx). */
export const environment = {
  production: true,
  apiUrl: '/api',
  liveWsUrl: runtimeWsUrl('/ws/live'),
  chatWsUrl: runtimeWsUrl('/ws/chat'),
  commercial: true,
  faucetEnabled: true,
  showcaseEnabled: true,
  mapEnabled: true,
  mapProvider: 'marseille-osm-three',
  enableOsmBuildings: true,
  enableTerrain: true,
  mapDebug: false,
  mapQuality: 'medium',
  opentopographyApiKey: '',
};
