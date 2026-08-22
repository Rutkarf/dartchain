import { buildEnvironment } from './environment.factory';

/** Build Cloudflare — généré par tools/prepare-cloudflare-env.mjs */
export const environment = buildEnvironment({
  production: true,
  apiUrl: 'https://dartchain-backend-1-0-0.onrender.com/api',
  liveWsUrl: 'wss://dartchain-backend-1-0-0.onrender.com/ws/live',
  chatWsUrl: 'wss://dartchain-backend-1-0-0.onrender.com/ws/chat',
});
