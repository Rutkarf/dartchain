/** Build production — Cloudflare utilise environment.cloudflare.ts via ng build --configuration cloudflare. */
export const environment = {
  production: true,
  apiUrl: 'https://dartchain-backend-1-0-0.onrender.com/api',
  liveWsUrl: 'wss://dartchain-backend-1-0-0.onrender.com/ws/live',
  chatWsUrl: 'wss://dartchain-backend-1-0-0.onrender.com/ws/chat',
  commercial: true,
  faucetEnabled: true,
  showcaseEnabled: true,
  starConquestOverlayEnabled: true,
  starConquestKpiDebug: false,
  mapEnabled: true,
  mapProvider: 'marseille-osm-three',
  enableOsmBuildings: true,
  enableTerrain: true,
  mapDebug: false,
  mapQuality: 'ultra-low' as 'ultra-low' | 'low' | 'medium' | 'high',
  opentopographyApiKey: '',
};
