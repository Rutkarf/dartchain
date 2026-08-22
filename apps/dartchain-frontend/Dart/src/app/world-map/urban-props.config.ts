import type { MapQuality } from './map-configuration';
import { mapPerfProfile } from './marseille-perf.config';

/** Phase 11 + 14 — couverture props urbains (toujours plein Vieux-Port). */
export type UrbanPropsScope = 'none' | 'spawn' | 'full';

export const URBAN_PROPS_RADIUS = {
  spawn: 88,
  full: 420,
} as const;

export const URBAN_PROPS_BUDGET = {
  spawn: {
    trees: 22,
    benches: 8,
    bins: 6,
    boats: 3,
    buoys: 8,
  },
  full: {
    trees: 72,
    benches: 28,
    bins: 18,
    boats: 6,
    buoys: 18,
  },
} as const;

export function urbanPropsScope(_quality: MapQuality): UrbanPropsScope {
  return 'full';
}

export function urbanPropsRadius(scope: UrbanPropsScope): number {
  if (scope === 'spawn') return URBAN_PROPS_RADIUS.spawn;
  if (scope === 'full') return URBAN_PROPS_RADIUS.full;
  return 0;
}

export type UrbanPropsBudget =
  (typeof URBAN_PROPS_BUDGET)['spawn'] | (typeof URBAN_PROPS_BUDGET)['full'];

export function urbanPropsBudget(scope: UrbanPropsScope): UrbanPropsBudget {
  return scope === 'full' ? URBAN_PROPS_BUDGET.full : URBAN_PROPS_BUDGET.spawn;
}
