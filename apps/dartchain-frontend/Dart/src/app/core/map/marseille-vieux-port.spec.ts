import { TestBed } from '@angular/core/testing';
import * as THREE from 'three';

import { GeoCoordinateService } from './geo-coordinate.service';
import {
  MARSEILLE_GEO_ORIGIN,
  MARSEILLE_LANDMARK_BUILDINGS,
} from './geo-reference.config';
import { footprintCentroid } from './geo-building.util';
import {
  MARSEILLE_HARBOR_WATER,
  METRO_SPAWN_ANCHOR,
  MIRROR_SECOND_BUILDING_ID,
} from './map-configuration';
import { isHarborWaterAt } from './vieux-port-layout.util';

describe('marseille-vieux-port', () => {
  let geo: GeoCoordinateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    geo = TestBed.inject(GeoCoordinateService);
  });

  it('garde le miroir à world (0,0) géoréférencé', () => {
    const mirrorGeo = geo.worldToGeo(
      new THREE.Vector3(
        METRO_SPAWN_ANCHOR.mirror.x,
        METRO_SPAWN_ANCHOR.mirror.y,
        METRO_SPAWN_ANCHOR.mirror.z
      )
    );
    expect(mirrorGeo.latitude).toBeCloseTo(MARSEILLE_GEO_ORIGIN.latitude, 5);
    expect(mirrorGeo.longitude).toBeCloseTo(MARSEILLE_GEO_ORIGIN.longitude, 5);
  });

  it('place le 2e bâtiment adjacent (R4V3) au nord-est du miroir', () => {
    const def = MARSEILLE_LANDMARK_BUILDINGS.find((b) => b.id === MIRROR_SECOND_BUILDING_ID);
    expect(def).toBeDefined();
    const center = footprintCentroid(def!.footprint, geo);
    expect(center.x).toBeGreaterThan(20);
    expect(center.z).toBeLessThan(0);
  });

  it('conserve la mer au sud (+Z) de l esplanade', () => {
    expect(MARSEILLE_HARBOR_WATER.waterMinZ).toBeGreaterThan(0);
    expect(isHarborWaterAt(0, MARSEILLE_HARBOR_WATER.waterMinZ + 20)).toBe(true);
    expect(isHarborWaterAt(0, 0)).toBe(false);
  });

  it('réduit l écart avant/après pour building-02 (< 15 m vs position OSM)', () => {
    const def = MARSEILLE_LANDMARK_BUILDINGS.find((b) => b.id === MIRROR_SECOND_BUILDING_ID)!;
    const center = footprintCentroid(def.footprint, geo);
    const oldHandPlaced = { x: 56, z: -18 };
    const errAfter = Math.hypot(center.x - 52.6, center.z - -26.2);
    const errBefore = Math.hypot(oldHandPlaced.x - 52.6, oldHandPlaced.z - -26.2);
    expect(errAfter).toBeLessThan(5);
    expect(errBefore).toBeGreaterThan(errAfter);
  });
});
