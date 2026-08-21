import { MARSEILLE_HARBOR_WATER } from './map-configuration';

type Rect = { minX: number; maxX: number; minZ: number; maxZ: number };

/** Esplanade Ombrière + quai des Belges (marche autorisée, pas d'eau). */
export const VIEUX_PORT_ESPLANADE: Rect = {
  minX: -32,
  maxX: 32,
  minZ: -18,
  maxZ: 8,
};

/** La Canebière — débouché nord du Vieux-Port (ne chevauche pas le bras d'eau sud). */
export const VIEUX_PORT_CANEBIERE: Rect = {
  minX: -28,
  maxX: 28,
  minZ: -280,
  maxZ: 6,
};

/** Quai du Port (rive nord du bassin). */
export const VIEUX_PORT_NORTH_QUAY: Rect = {
  minX: -880,
  maxX: 32,
  minZ: -72,
  maxZ: -48,
};

/** Quai de Rive-Neuve (rive sud). */
export const VIEUX_PORT_SOUTH_QUAY: Rect = {
  minX: -880,
  maxX: 32,
  minZ: 48,
  maxZ: 72,
};

/** Quai de la Fraternité (bord est, le long du bassin). */
export const VIEUX_PORT_EAST_QUAY: Rect = {
  minX: 16,
  maxX: 48,
  minZ: -58,
  maxZ: 58,
};

const WEST_BASIN_INNER: Rect = {
  minX: MARSEILLE_HARBOR_WATER.basinMinX,
  maxX: MARSEILLE_HARBOR_WATER.basinMaxX,
  minZ: -48,
  maxZ: 48,
};

const SOUTH_CHANNEL: Rect = {
  minX: -102,
  maxX: 102,
  minZ: MARSEILLE_HARBOR_WATER.waterMinZ,
  maxZ: MARSEILLE_HARBOR_WATER.waterMaxZ,
};

/** Corridors de rue : jamais traités comme eau, colliders bâtiments ignorés si chevauchement. */
export const VIEUX_PORT_STREET_CORRIDORS: readonly Rect[] = [
  VIEUX_PORT_CANEBIERE,
  VIEUX_PORT_ESPLANADE,
  { minX: -70, maxX: 70, minZ: -8, maxZ: 10 },
  /** Anneau libre autour du miroir / spawn. */
  { minX: -14, maxX: 14, minZ: -14, maxZ: 14 },
];

function isInStreetCorridor(x: number, z: number, margin = 0): boolean {
  return VIEUX_PORT_STREET_CORRIDORS.some((rect) => pointInRect(x, z, rect, margin));
}

/** Polygone d'exclusion M4T3R — bassin ouest + bras sud visible depuis le miroir. */
export function vieuxPortHarborExclusionPolygon(): ReadonlyArray<{ x: number; z: number }> {
  const { basinMinX, basinMaxX, basinMinZ, waterMaxZ, waterMinZ } = MARSEILLE_HARBOR_WATER;
  return [
    { x: SOUTH_CHANNEL.maxX, z: waterMinZ },
    { x: SOUTH_CHANNEL.maxX, z: waterMaxZ },
    { x: basinMinX, z: waterMaxZ },
    { x: basinMinX, z: basinMinZ },
    { x: basinMaxX, z: basinMinZ },
    { x: basinMaxX, z: waterMinZ },
  ];
}

function pointInRect(x: number, z: number, rect: Rect, margin = 0): boolean {
  return (
    x >= rect.minX - margin &&
    x <= rect.maxX + margin &&
    z >= rect.minZ - margin &&
    z <= rect.maxZ + margin
  );
}

/** Point couvert par la surface d'eau (bassin intérieur + bras sud), hors rues/quais. */
export function isHarborWaterAt(x: number, z: number): boolean {
  if (pointInRect(x, z, VIEUX_PORT_ESPLANADE)) return false;
  if (pointInRect(x, z, VIEUX_PORT_CANEBIERE)) return false;
  if (pointInRect(x, z, VIEUX_PORT_NORTH_QUAY)) return false;
  if (pointInRect(x, z, VIEUX_PORT_SOUTH_QUAY)) return false;
  if (pointInRect(x, z, VIEUX_PORT_EAST_QUAY)) return false;
  if (pointInRect(x, z, WEST_BASIN_INNER)) return true;
  if (pointInRect(x, z, SOUTH_CHANNEL)) return true;
  return false;
}

/** Terre jouable : tout sauf l'eau (rues, quais, Canebière). */
export function isHarborLandAt(x: number, z: number): boolean {
  return !isHarborWaterAt(x, z);
}

/** Zone piétonne explicite (ruelle / quai / esplanade) — préférée mais pas exclusive. */
export function isHarborWalkableRegionAt(x: number, z: number, radius = 0): boolean {
  if (isInStreetCorridor(x, z, radius)) return true;
  const regions = [
    VIEUX_PORT_NORTH_QUAY,
    VIEUX_PORT_SOUTH_QUAY,
    VIEUX_PORT_EAST_QUAY,
  ];
  for (const region of regions) {
    if (pointInRect(x, z, region, radius)) return true;
  }
  return false;
}

/** Distance minimale au bord de l'eau (0 si déjà dans l'eau). */
export function distanceToHarborWaterEdge(x: number, z: number): number {
  if (isHarborWaterAt(x, z)) return 0;

  const distances: number[] = [];
  const pushRectEdge = (rect: Rect): void => {
    if (pointInRect(x, z, rect)) return;
    const dx = x < rect.minX ? rect.minX - x : x > rect.maxX ? x - rect.maxX : 0;
    const dz = z < rect.minZ ? rect.minZ - z : z > rect.maxZ ? z - rect.maxZ : 0;
    if (dx === 0 && dz === 0) return;
    if (dx === 0) distances.push(dz);
    else if (dz === 0) distances.push(dx);
    else distances.push(Math.hypot(dx, dz));
  };

  pushRectEdge(WEST_BASIN_INNER);
  pushRectEdge(SOUTH_CHANNEL);
  return distances.length ? Math.min(...distances) : Number.POSITIVE_INFINITY;
}

export function colliderIntersectsStreetCorridor(collider: Rect): boolean {
  const corners = [
    { x: collider.minX, z: collider.minZ },
    { x: collider.maxX, z: collider.minZ },
    { x: collider.maxX, z: collider.maxZ },
    { x: collider.minX, z: collider.maxZ },
  ];
  return corners.some(({ x, z }) => isInStreetCorridor(x, z));
}

/** Collision eau avec marge autour du corps du personnage. */
export function isHarborWaterBlockedAt(x: number, z: number, radius: number): boolean {
  if (isHarborWaterAt(x, z)) return true;
  const samples = [
    [x + radius, z],
    [x - radius, z],
    [x, z + radius],
    [x, z - radius],
  ] as const;
  return samples.some(([sx, sz]) => isHarborWaterAt(sx, sz));
}
