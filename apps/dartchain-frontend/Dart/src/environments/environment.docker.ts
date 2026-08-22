/** Docker / reverse-proxy : API et WebSockets via le même hôte (nginx). */
import { buildEnvironment, runtimeWsUrl } from './environment.factory';

export const environment = buildEnvironment({
  production: true,
  apiUrl: '/api',
  liveWsUrl: runtimeWsUrl('/ws/live'),
  chatWsUrl: runtimeWsUrl('/ws/chat'),
});
