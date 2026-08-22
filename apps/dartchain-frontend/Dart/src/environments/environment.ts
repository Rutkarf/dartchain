/** Dev : requêtes via le proxy Angular (`proxy.conf.json`) → pas de CORS. */
import { buildEnvironment, devWsUrl } from './environment.factory';

export type { AppEnvironment, MapEnvironment, ProductEnvironment } from './environment.factory';

export const environment = buildEnvironment({
  production: false,
  apiUrl: '/api',
  liveWsUrl: devWsUrl('/ws/live'),
  chatWsUrl: devWsUrl('/ws/chat'),
  commercial: false,
  starConquestKpiDebug: true,
});
