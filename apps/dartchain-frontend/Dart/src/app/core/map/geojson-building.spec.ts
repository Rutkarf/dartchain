import { describe, expect, it } from 'vitest';

import { MARSEILLE_LANDMARK_BUILDINGS } from './geo-reference.config';
import {
  geoBuildingsToFeatureCollection,
  parseCadastralGeoJson,
} from './geojson-building.parser';
import { indexCadastralBuildings, shouldSkipOsmForCadastre } from './geojson-fusion.util';

describe('geojson-building Phase 4', () => {
  it('round-trip GeoBuilding → GeoJSON → GeoBuilding', () => {
    const collection = geoBuildingsToFeatureCollection(MARSEILLE_LANDMARK_BUILDINGS.slice(0, 2), {
      phase: '4',
    });
    const parsed = parseCadastralGeoJson(collection);
    expect(parsed.length).toBe(2);
    expect(parsed[0].id).toBe(MARSEILLE_LANDMARK_BUILDINGS[0].id);
    expect(parsed[0].source).toBe('geojson');
    expect(parsed[0].footprint.length).toBeGreaterThan(4);
  });

  it('fusion OSM skip si sourceId cadastre connu', () => {
    const idx = indexCadastralBuildings(MARSEILLE_LANDMARK_BUILDINGS);
    expect(
      shouldSkipOsmForCadastre(
        { id: 'osm-way-67705148', points: [], height: 20, heightSource: 'hardcoded' },
        idx.ids,
        idx.sourceIds
      )
    ).toBe(true);
    expect(
      shouldSkipOsmForCadastre(
        { id: 'osm-way-999', points: [], height: 9, heightSource: 'default' },
        idx.ids,
        idx.sourceIds
      )
    ).toBe(false);
  });
});
