import type { GeoBuilding } from './geo-reference.config';
import { resolveGeoBuildingHeight } from './building-height.util';
import type {
  CadastralGeoJsonCollection,
  CadastralGeoJsonFeature,
  ParsedCadastralBuilding,
} from './geojson-building.types';
import { ringToFootprint } from './geojson-building.types';

function polygonRings(feature: CadastralGeoJsonFeature): [number, number][][] {
  if (feature.geometry.type === 'Polygon') {
    return feature.geometry.coordinates as [number, number][][];
  }
  const multi = feature.geometry.coordinates as [number, number][][][];
  return multi[0] ? [multi[0][0]] : [];
}

function ringLatLon(ring: [number, number][]): [number, number][] {
  return ring.map(([lon, lat]) => [lat, lon]);
}

export function parseCadastralFeature(feature: CadastralGeoJsonFeature): ParsedCadastralBuilding | null {
  const props = feature.properties ?? ({} as CadastralGeoJsonFeature['properties']);
  const id = props.id ?? feature.id;
  if (!id) return null;

  const rings = polygonRings(feature);
  const outer = rings[0];
  if (!outer || outer.length < 4) return null;

  const footprint = ringToFootprint(ringLatLon(outer));
  if (footprint.length < 4) return null;

  const heightMeters = props.heightMeters ?? props.height;
  const building: ParsedCadastralBuilding = {
    id,
    cadastralId: id,
    sourceId: props.sourceId ?? `cadastre-${id}`,
    label: props.label,
    footprint,
    heightMeters: heightMeters ?? undefined,
    levels: props.levels,
    source: props.source ?? 'geojson',
    confidence: props.confidence ?? 'high',
  };

  void resolveGeoBuildingHeight(building);
  return building;
}

export function parseCadastralGeoJson(collection: CadastralGeoJsonCollection): ParsedCadastralBuilding[] {
  if (collection.type !== 'FeatureCollection' || !Array.isArray(collection.features)) {
    return [];
  }
  return collection.features
    .map((feature) => parseCadastralFeature(feature))
    .filter((b): b is ParsedCadastralBuilding => b != null);
}

export function geoBuildingToCadastralFeature(building: GeoBuilding): CadastralGeoJsonFeature {
  const ring = building.footprint.slice(0, -1).map((p) => [p.longitude, p.latitude] as [number, number]);
  if (ring.length > 0) {
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first && last && (first[0] !== last[0] || first[1] !== last[1])) {
      ring.push([first[0], first[1]]);
    }
  }
  return {
    type: 'Feature',
    id: building.id,
    properties: {
      id: building.id,
      sourceId: building.sourceId,
      label: building.label,
      heightMeters: building.heightMeters,
      levels: building.levels,
      confidence: building.confidence,
      source: 'geojson',
      building: 'yes',
    },
    geometry: {
      type: 'Polygon',
      coordinates: [ring],
    },
  };
}

export function geoBuildingsToFeatureCollection(
  buildings: readonly GeoBuilding[],
  metadata?: CadastralGeoJsonCollection['metadata']
): CadastralGeoJsonCollection {
  return {
    type: 'FeatureCollection',
    metadata,
    features: buildings.map((b) => geoBuildingToCadastralFeature(b)),
  };
}
