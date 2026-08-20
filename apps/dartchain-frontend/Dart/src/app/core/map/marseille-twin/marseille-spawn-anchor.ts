import { METRO_SPAWN_ANCHOR } from '../map-configuration';
import { MARSEILLE_GEO_ORIGIN } from '../geo-reference.config';
import { MARSEILLE_COORDINATE_SYSTEM_VERSION } from '../placements/coordinate-system';
import type { GeoSourceQuality } from './source-quality';

/**
 * Ancre de spawn documentée — n’applique pas de nouveau transform runtime.
 * Le gameplay reste `METRO_SPAWN_ANCHOR` + `CharacterControlService`.
 */
export interface MarseilleSpawnAnchor {
  id: 'vieux-port-ombriere';
  sourceQuality: GeoSourceQuality;
  geographicCoordinate: {
    latitude: number;
    longitude: number;
    altitude: number;
  };
  worldPosition: { x: number; y: number; z: number };
  worldHeadingRadians: number;
  referenceLandmark: 'Ombrière du Vieux-Port';
  calibrationNotes: string;
  coordinateSystemVersion: string;
  /** false = ne pas déplacer les joueurs existants. */
  applyAtRuntime: false;
  runtimeBinding: 'METRO_SPAWN_ANCHOR';
}

const spawnWorld = {
  x: METRO_SPAWN_ANCHOR.mirror.x + METRO_SPAWN_ANCHOR.spawnOffsetFromMirror.x,
  y: 0,
  z: METRO_SPAWN_ANCHOR.mirror.z + METRO_SPAWN_ANCHOR.spawnOffsetFromMirror.z,
} as const;

export const MARSEILLE_SPAWN_ANCHOR: MarseilleSpawnAnchor = {
  id: 'vieux-port-ombriere',
  sourceQuality: 'PROJECTED',
  geographicCoordinate: {
    latitude: MARSEILLE_GEO_ORIGIN.latitude,
    longitude: MARSEILLE_GEO_ORIGIN.longitude,
    altitude: MARSEILLE_GEO_ORIGIN.altitude,
  },
  worldPosition: spawnWorld,
  /** Aligné sur MARSEILLE_START_ORIENTATION.characterRotationY = 0 (nord / −Z). */
  worldHeadingRadians: 0,
  referenceLandmark: 'Ombrière du Vieux-Port',
  calibrationNotes:
    'Origin geo = OSM way/200273945. Avatar XZ uses METRO_SPAWN_ANCHOR.spawnOffsetFromMirror on altitudeOrigin (y=0 terrain). Canopy deck remains at y=5.6. Vieux-Port water is +Z (behind heading 0). Not a survey monument.',
  coordinateSystemVersion: MARSEILLE_COORDINATE_SYSTEM_VERSION,
  applyAtRuntime: false,
  runtimeBinding: 'METRO_SPAWN_ANCHOR',
};
