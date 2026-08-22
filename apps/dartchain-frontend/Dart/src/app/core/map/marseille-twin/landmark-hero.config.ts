import { projectGeoToMarseilleWorld } from '../placements/ground-floor-anchor.util';

/** Ancres GPS — silhouettes reconnaissables depuis le spawn (Phase 10). */
export const HERO_SKYLINE_LANDMARKS = [
  {
    id: 'fort-saint-jean',
    label: 'Fort Saint-Jean',
    latitude: 43.29535,
    longitude: 5.36155,
    kind: 'fort' as const,
  },
  {
    id: 'notre-dame-garde',
    label: 'Notre-Dame de la Garde',
    latitude: 43.284,
    longitude: 5.3711,
    kind: 'basilica' as const,
  },
  {
    id: 'mucem',
    label: 'MUCEM',
    latitude: 43.29695,
    longitude: 5.36135,
    kind: 'museum' as const,
  },
  {
    id: 'phare-joliette',
    label: 'Phare de la Joliette',
    latitude: 43.3065,
    longitude: 5.3665,
    kind: 'lighthouse' as const,
  },
] as const;

export type HeroSkylineLandmarkId = (typeof HERO_SKYLINE_LANDMARKS)[number]['id'];
export type HeroSkylineLandmarkKind = (typeof HERO_SKYLINE_LANDMARKS)[number]['kind'];

export function heroSkylineWorldAnchor(id: HeroSkylineLandmarkId): { x: number; z: number } {
  const def = HERO_SKYLINE_LANDMARKS.find((item) => item.id === id);
  if (!def) throw new Error(`Unknown hero skyline landmark: ${id}`);
  const world = projectGeoToMarseilleWorld(def.latitude, def.longitude, 0);
  return { x: world.x, z: world.z };
}
