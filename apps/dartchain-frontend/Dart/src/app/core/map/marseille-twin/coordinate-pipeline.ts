import {
  GEO_REFERENCE_CONFIG,
  MARSEILLE_GEO_ORIGIN,
} from '../geo-reference.config';
import {
  METERS_PER_DEGREE_LATITUDE,
  metersPerDegreeLongitude,
} from '../geo-projection.constants';
import { MARSEILLE_COORDINATE_SYSTEM_VERSION } from '../placements/coordinate-system';

/**
 * Pipeline WGS84 → monde Three.js, figé pour metaverseBB.
 * Ne duplique pas GeoCoordinateService : documente le contrat inspecté.
 */
export const MARSEILLE_COORDINATE_PIPELINE = {
  sourceCrs: 'EPSG:4326',
  worldCrs: 'local-equirectangular-meters',
  coordinateSystemVersion: MARSEILLE_COORDINATE_SYSTEM_VERSION,
  threeJsWorldUnitEqualsMeters: true,
  metersPerWorldUnit: GEO_REFERENCE_CONFIG.metersPerWorldUnit,
  origin: {
    latitude: MARSEILLE_GEO_ORIGIN.latitude,
    longitude: MARSEILLE_GEO_ORIGIN.longitude,
    altitude: MARSEILLE_GEO_ORIGIN.altitude,
    sourceId: MARSEILLE_GEO_ORIGIN.sourceId,
  },
  axis: GEO_REFERENCE_CONFIG.axisMapping,
  northRotationRadians: GEO_REFERENCE_CONFIG.northRotationRadians,
  metersPerDegreeLatitude: METERS_PER_DEGREE_LATITUDE,
} as const;

export function pipelineMetersPerDegreeLongitude(): number {
  return metersPerDegreeLongitude(MARSEILLE_COORDINATE_PIPELINE.origin.latitude);
}
