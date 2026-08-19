import type { MapEnvironment } from '../app/core/map/map-config.service';

/** Généré par scripts/build-cloudflare.sh — ne pas éditer manuellement avant un déploiement CF. */
export const environment = {
  production: true,
  apiUrl: 'https://dartchain-backend-1-0-0.onrender.com/api',
  liveWsUrl: 'wss://dartchain-backend-1-0-0.onrender.com/ws/live',
  chatWsUrl: 'wss://dartchain-backend-1-0-0.onrender.com/ws/chat',
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
} satisfies MapEnvironment & {
  production: boolean;
  apiUrl: string;
  liveWsUrl: string;
  chatWsUrl: string;
  commercial: boolean;
  faucetEnabled: boolean;
  showcaseEnabled: boolean;
};
