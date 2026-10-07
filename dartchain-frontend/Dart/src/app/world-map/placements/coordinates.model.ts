import type { WorldCoordinate } from './coordinate-system';

export type { WorldCoordinate } from './coordinate-system';

export type GeoCoordinateSource =
  | 'verified'
  | 'approximate'
  | 'projected'
  | 'unknown';

/** Distinct de GeoPosition (map-configuration) : trace la fiabilité de la source. */
export interface GeoCoordinate {
  latitude: number;
  longitude: number;
  altitude?: number;
  source: GeoCoordinateSource;
}
