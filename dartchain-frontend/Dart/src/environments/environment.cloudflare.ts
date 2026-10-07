import { buildEnvironment } from './environment.factory';

/** Build Cloudflare — généré par tools/prepare-cloudflare-env.mjs */
export const environment = buildEnvironment({
  production: true,
  apiUrl: 'https://dartchain-backend.onrender.com/api',
  liveWsUrl: 'wss://dartchain-backend.onrender.com/ws/live',
  chatWsUrl: 'wss://dartchain-backend.onrender.com/ws/chat',
  showcaseEnabled: true,
  starConquestEnabled: false,
  starConquestOverlayEnabled: true,
  starConquestKpiDebug: false,
});
