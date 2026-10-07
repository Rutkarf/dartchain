import { CANEBIERE_BEARING_DEG } from './accurate-city-buildings.data';
import { VIEUX_PORT_ESPLANADE } from './vieux-port-layout.util';

/** Corridor orienté — axe longueur = rotation Y (Three.js, nord = −Z). */
export interface GroundCorridorDef {
  id: string;
  centerX: number;
  centerZ: number;
  /** Longueur le long de l'axe (m). */
  length: number;
  roadWidth: number;
  sidewalkWidth: number;
  /** Rotation Y radians — 0 = axe local +Z. */
  rotationY: number;
}

const CANEBIERE_BEARING_RAD = (CANEBIERE_BEARING_DEG * Math.PI) / 180;

/** Bearing OSM → rotation Three.js (axe route aligné Canebière). */
export const CANEBIERE_ROTATION_Y = Math.atan2(
  Math.sin(CANEBIERE_BEARING_RAD),
  -Math.cos(CANEBIERE_BEARING_RAD)
);

/** Rect axis-aligned pour esplanade / zones plates. */
export interface GroundPlateDef {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  kind: 'esplanade' | 'quay';
}

/**
 * Layout synchrone Vieux-Port — fallback immédiat sans Overpass.
 * Canebière alignée bearing 62.3° ; connecteur est-ouest au spawn.
 */
export const VIEUX_PORT_GROUND_CORRIDORS: readonly GroundCorridorDef[] = [
  {
    id: 'canebiere',
    centerX: 0,
    centerZ: -40,
    length: 360,
    roadWidth: 26,
    sidewalkWidth: 8,
    rotationY: CANEBIERE_ROTATION_Y,
  },
  {
    id: 'spawn-connector',
    centerX: 0,
    centerZ: 8,
    length: 120,
    roadWidth: 18,
    sidewalkWidth: 6,
    rotationY: Math.PI / 2,
  },
];

export const VIEUX_PORT_GROUND_PLATES: readonly GroundPlateDef[] = [
  {
    id: 'ombriere-esplanade',
    minX: VIEUX_PORT_ESPLANADE.minX,
    maxX: VIEUX_PORT_ESPLANADE.maxX,
    minZ: VIEUX_PORT_ESPLANADE.minZ,
    maxZ: VIEUX_PORT_ESPLANADE.maxZ,
    kind: 'esplanade',
  },
  /** Promenade quai sud — alignée bassin / spawn. */
  {
    id: 'quai-belges-walk',
    minX: -29,
    maxX: 29,
    minZ: 3.4,
    maxZ: 6.6,
    kind: 'quay',
  },
];

/** Passages piétons — position monde + rotation. */
export interface CrosswalkDef {
  id: string;
  x: number;
  z: number;
  width: number;
  length: number;
  rotationY: number;
}

export const VIEUX_PORT_CROSSWALKS: readonly CrosswalkDef[] = [
  { id: 'cross-canebiere-n', x: 0, z: -18, width: 22, length: 3.4, rotationY: 0 },
  { id: 'cross-spawn', x: 0, z: 8, width: 18, length: 3.2, rotationY: 0 },
];
