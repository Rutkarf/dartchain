/**
 * Anneau de diagnostics Star Conquest — hors rAF critique.
 * N’envoie rien au réseau. Cap fixe pour éviter les fuites.
 */

export type StarConquestDiagKind =
  | 'select'
  | 'dismiss'
  | 'claim'
  | 'scanner'
  | 'stick-start'
  | 'stick-end'
  | 'reset-view'
  | 'pointer-cancel'
  | 'webgl-lost'
  | 'error';

export interface StarConquestDiagEvent {
  kind: StarConquestDiagKind;
  at: number;
  detail?: string;
}

const MAX_EVENTS = 48;
const events: StarConquestDiagEvent[] = [];

export function recordStarConquestDiag(
  kind: StarConquestDiagKind,
  detail?: string,
  at = Date.now()
): StarConquestDiagEvent {
  const event: StarConquestDiagEvent = { kind, at, detail };
  events.push(event);
  if (events.length > MAX_EVENTS) events.shift();
  return event;
}

export function listStarConquestDiag(): readonly StarConquestDiagEvent[] {
  return events;
}

export function clearStarConquestDiag(): void {
  events.length = 0;
}

export function countStarConquestDiag(kind: StarConquestDiagKind): number {
  return events.filter((e) => e.kind === kind).length;
}
