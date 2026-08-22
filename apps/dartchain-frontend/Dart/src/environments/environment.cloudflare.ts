import type { MapEnvironment, ProductEnvironment } from './environment';

/** Build Cloudflare — généré par tools/prepare-cloudflare-env.mjs */
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
  mapQuality: 'ultra-low' as const,
  opentopographyApiKey: '',
} satisfies ProductEnvironment &
  MapEnvironment & {
    production: boolean;
    apiUrl: string;
    liveWsUrl: string;
    chatWsUrl: string;
  };
