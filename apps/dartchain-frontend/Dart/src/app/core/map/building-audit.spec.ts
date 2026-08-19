import { TestBed } from '@angular/core/testing';

import { GeoCoordinateService } from './geo-coordinate.service';
import {
  LEGACY_HAND_PLACED_LANDMARKS,
  MARSEILLE_LANDMARK_BUILDINGS,
  VIEUX_PORT_CORE_BUILDING_RADIUS,
  landmarkPlacementErrorMeters,
} from './geo-reference.config';
import { footprintCentroid } from './geo-building.util';

describe('building-audit', () => {
  let geo: GeoCoordinateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    geo = TestBed.inject(GeoCoordinateService);
  });

  it('documente les écarts legacy vs géoréférencement OSM', () => {
    for (const def of MARSEILLE_LANDMARK_BUILDINGS) {
      const center = footprintCentroid(def.footprint, geo);
      const legacyErr = landmarkPlacementErrorMeters(def.id, center);
      const legacy = LEGACY_HAND_PLACED_LANDMARKS[def.id];
      expect(legacy).toBeDefined();
      expect(legacyErr!).toBeGreaterThan(5);
    }
  });

  it('place les landmarks corrigés dans le cœur Vieux-Port', () => {
    for (const def of MARSEILLE_LANDMARK_BUILDINGS) {
      const center = footprintCentroid(def.footprint, geo);
      expect(Math.abs(center.x)).toBeLessThan(200);
      expect(Math.abs(center.z)).toBeLessThan(200);
    }
  });

  it('exclut les prototypes du cœur Vieux-Port (< 180 m)', () => {
    const nearMirror = { x: 72, z: 2 };
    const farCanebiere = { x: -88, z: -180 };
    expect(Math.hypot(nearMirror.x, nearMirror.z)).toBeLessThan(VIEUX_PORT_CORE_BUILDING_RADIUS);
    expect(Math.hypot(farCanebiere.x, farCanebiere.z)).toBeGreaterThan(VIEUX_PORT_CORE_BUILDING_RADIUS);
  });
});
