#!/usr/bin/env node
/**
 * Prépare environment.cloudflare.ts depuis BACKEND_URL (CI Cloudflare / deploy local).
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = join(root, 'src/environments/environment.cloudflare.ts');

let backendUrl = (process.env.BACKEND_URL || 'https://dartchain-backend-1-0-0.onrender.com').trim();
if (backendUrl.includes('YOUR-BACKEND')) {
  console.error('FAIL: BACKEND_URL invalide');
  process.exit(1);
}
backendUrl = backendUrl.replace(/\/$/, '').replace(/^https?:\/\//, '');
backendUrl = `https://${backendUrl}`;
const backendHost = backendUrl.replace(/^https:\/\//, '');

const showcaseEnabled = !['false', '0', 'no', 'off'].includes(
  String(process.env.SHOWCASE_ENABLED ?? 'true').toLowerCase(),
);
const starConquestOverlay = !['false', '0', 'no', 'off'].includes(
  String(process.env.STAR_CONQUEST_OVERLAY_ENABLED ?? 'true').toLowerCase(),
);
const kpiDebug = ['true', '1', 'yes', 'on'].includes(
  String(process.env.STAR_CONQUEST_KPI_DEBUG ?? 'false').toLowerCase(),
);

const contents = `import type { MapEnvironment, ProductEnvironment } from './environment';

/** Build Cloudflare — généré par tools/prepare-cloudflare-env.mjs */
export const environment = {
  production: true,
  apiUrl: '${backendUrl}/api',
  liveWsUrl: 'wss://${backendHost}/ws/live',
  chatWsUrl: 'wss://${backendHost}/ws/chat',
  commercial: true,
  faucetEnabled: true,
  showcaseEnabled: ${showcaseEnabled},
  starConquestOverlayEnabled: ${starConquestOverlay},
  starConquestKpiDebug: ${kpiDebug},
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
`;

writeFileSync(outPath, contents, 'utf8');
console.info('[prepare-cloudflare-env] Écrit', outPath, '— backend', backendUrl);
