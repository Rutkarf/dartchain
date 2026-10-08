import {
  GEO_REFERENCE_CONFIG,
  METAVERSE_GEO_ORIGIN,
} from '../geo-reference.config';
import {
  METERS_PER_DEGREE_LATITUDE,
  metersPerDegreeLongitude,
} from '../geo-projection.constants';
import { METAVERSE_COORDINATE_SYSTEM_VERSION } from '../placements/coordinate-system';

/**
 * Pipeline WGS84 → monde Three.js, figé pour metaverseBB.
 * Ne duplique pas GeoCoordinateService : documente le contrat inspecté.
 */
export const METAVERSE_COORDINATE_PIPELINE = {
  sourceCrs: 'EPSG:4326',
  worldCrs: 'local-equirectangular-meters',
  coordinateSystemVersion: METAVERSE_COORDINATE_SYSTEM_VERSION,
  threeJsWorldUnitEqualsMeters: true,
  metersPerWorldUnit: GEO_REFERENCE_CONFIG.metersPerWorldUnit,
  origin: {
    latitude: METAVERSE_GEO_ORIGIN.latitude,
    longitude: METAVERSE_GEO_ORIGIN.longitude,
    altitude: METAVERSE_GEO_ORIGIN.altitude,
    sourceId: METAVERSE_GEO_ORIGIN.sourceId,
  },
  axis: GEO_REFERENCE_CONFIG.axisMapping,
  northRotationRadians: GEO_REFERENCE_CONFIG.northRotationRadians,
  metersPerDegreeLatitude: METERS_PER_DEGREE_LATITUDE,
} as const;

export function pipelineMetersPerDegreeLongitude(): number {
  return metersPerDegreeLongitude(METAVERSE_COORDINATE_PIPELINE.origin.latitude);
}
