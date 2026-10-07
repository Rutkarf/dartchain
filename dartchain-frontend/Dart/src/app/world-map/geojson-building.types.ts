import type { GeoBuilding, GeoFootprintPoint } from './geo-reference.config';
import type { BuildingHeightSource } from './building-height.util';

export interface CadastralGeoJsonMetadata {
  source?: string;
  license?: string;
  generated?: string;
  phase?: string;
}

export interface CadastralFeatureProperties {
  id: string;
  sourceId?: string;
  label?: string;
  height?: number;
  heightMeters?: number;
  levels?: number;
  heightSource?: BuildingHeightSource;
  confidence?: 'low' | 'medium' | 'high';
  source?: GeoBuilding['source'];
  building?: string;
}

export interface CadastralGeoJsonFeature {
  type: 'Feature';
  id?: string;
  properties: CadastralFeatureProperties;
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
}

export interface CadastralGeoJsonCollection {
  type: 'FeatureCollection';
  metadata?: CadastralGeoJsonMetadata;
  features: CadastralGeoJsonFeature[];
}

export interface ParsedCadastralBuilding extends GeoBuilding {
  cadastralId: string;
}

export function ringToFootprint(ring: ReadonlyArray<[number, number]>): GeoFootprintPoint[] {
  const points = ring.map(([latitude, longitude]) => ({ latitude, longitude }));
  const first = points[0];
  const last = points[points.length - 1];
  if (
    first &&
    last &&
    (first.latitude !== last.latitude || first.longitude !== last.longitude)
  ) {
    points.push({ latitude: first.latitude, longitude: first.longitude });
  }
  return points;
}

export function footprintToGeoJsonRing(
  footprint: ReadonlyArray<GeoFootprintPoint>
): [number, number][] {
  const open = footprint.slice(0, -1);
  return open.map((p) => [p.longitude, p.latitude]);
}
