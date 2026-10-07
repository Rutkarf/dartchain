/** Dev : requêtes via le proxy Angular (`proxy.conf.json`) → pas de CORS. */
import { buildEnvironment, devWsUrl } from './environment.factory';

export type { AppEnvironment, MapEnvironment, ProductEnvironment } from './environment.factory';

export const environment = buildEnvironment({
  production: false,
  apiUrl: '/api',
  liveWsUrl: devWsUrl('/ws/live'),
  chatWsUrl: devWsUrl('/ws/chat'),
  commercial: false,
  /** Conquête stellaire au-dessus du floor MetaVerseBB. */
  starConquestEnabled: true,
  starConquestKpiDebug: true,
  /** Dev : prototype arène activé (mock local, ledger isolé). */
  metaverseArenaEnabled: true,
  /** Dev : saute appel R4V3army + Feed The R4V3 + tutoriel hub. */
  skipBootAnimations: false,
});
