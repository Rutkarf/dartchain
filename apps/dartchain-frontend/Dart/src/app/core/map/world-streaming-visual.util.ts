import { VIEUX_PORT_CORE_BUILDING_RADIUS } from './geo-reference.config';

/** Anneau de fondu entre cœur geo-accurate et chunks procéduraux. */
export const STREAMING_CORE_FADE_OUTER_M = VIEUX_PORT_CORE_BUILDING_RADIUS + 96;

/** 0 = cœur geo (pas de procédural), 1 = plein procédural. */
export function streamingCoreFadeFactor(centerX: number, centerZ: number): number {
  const dist = Math.hypot(centerX, centerZ);
  if (dist <= VIEUX_PORT_CORE_BUILDING_RADIUS) return 0;
  if (dist >= STREAMING_CORE_FADE_OUTER_M) return 1;
  return (dist - VIEUX_PORT_CORE_BUILDING_RADIUS) / (STREAMING_CORE_FADE_OUTER_M - VIEUX_PORT_CORE_BUILDING_RADIUS);
}

/** Réduit la densité procédurale près du cœur geo-accurate. */
export function streamingBuildingBudget(baseCount: number, fade: number): number {
  if (fade <= 0.08) return 0;
  return Math.max(1, Math.round(baseCount * fade * fade));
}
