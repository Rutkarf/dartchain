import { TestBed } from '@angular/core/testing';

import { GeoCoordinateService } from '../geo-coordinate.service';
import { MARSEILLE_LANDMARK_BUILDINGS } from '../geo-reference.config';
import { footprintCentroid } from '../geo-building.util';
import { createDevPlacementFixtures } from './placement-fixtures.dev';
import {
  groundFloorAnchorFromGeoFootprint,
  projectGeoToMarseilleWorld,
} from './ground-floor-anchor.util';

/**
 * GEO-PREC-2 + GEO-FACADE-1 — geo ↔ monde, ancres RDC = bord de footprint OSM.
 * Les world bâtiment restent arrondis au décimètre (contrat < 10 cm).
 */
const BUILDING_WORLD_ROUNDING_METERS = 0.1;
const PLACEMENT_GEO_TOLERANCE_METERS = 0.02;
const LANDMARK_CENTROID_METERS = 15;
const FACADE_ANCHOR_TOLERANCE_METERS = 0.02;

describe('placement-geo-precision (GEO-PREC-2)', () => {
  let geo: GeoCoordinateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    geo = TestBed.inject(GeoCoordinateService);
  });

  it('aligne geo bâtiment → world stocké à mieux que 10 cm (arrondi 1 décimale)', () => {
    const fixtures = createDevPlacementFixtures();
    const buildings = fixtures.buildings ?? [];
    expect(buildings.length).toBe(4);
    for (const building of buildings) {
      expect(building.geo).toBeDefined();
      const projected = geo.geoToWorld(
        building.geo!.latitude,
        building.geo!.longitude,
        building.geo!.altitude ?? 0
      );
      const err = Math.hypot(
        projected.x - building.world.x,
        projected.y - (building.world.y ?? 0),
        projected.z - building.world.z
      );
      expect(err).toBeLessThan(BUILDING_WORLD_ROUNDING_METERS);
    }
  });

  it('projette chaque anchorGeo RDC sur son hit-volume, pas sur le centroïde immeuble', () => {
    const fixtures = createDevPlacementFixtures();
    const buildings = fixtures.buildings ?? [];
    const buildingById = new Map(buildings.map((item) => [item.id, item]));

    for (const placement of fixtures.placements) {
      expect(placement.anchorGeo).toBeDefined();
      const projected = geo.geoToWorld(
        placement.anchorGeo!.latitude,
        placement.anchorGeo!.longitude,
        placement.anchorGeo!.altitude ?? 0
      );
      const err = Math.hypot(
        projected.x - placement.anchorWorld.x,
        projected.y - placement.anchorWorld.y,
        projected.z - placement.anchorWorld.z
      );
      expect(err).toBeLessThan(PLACEMENT_GEO_TOLERANCE_METERS);

      const building = buildingById.get(placement.buildingId);
      expect(building).toBeDefined();
      const vsBuilding = Math.hypot(
        placement.anchorWorld.x - building!.world.x,
        placement.anchorWorld.z - building!.world.z
      );
      expect(vsBuilding).toBeGreaterThan(1);
    }
  });

  it('garde les centroïdes landmarks OSM dans le contrat existant (< 15 m)', () => {
    const fixtures = createDevPlacementFixtures();
    const buildings = fixtures.buildings ?? [];
    for (const building of buildings) {
      const def = MARSEILLE_LANDMARK_BUILDINGS.find((item) => item.id === building.id);
      expect(def).toBeDefined();
      const center = footprintCentroid(def!.footprint, geo);
      const err = Math.hypot(center.x - building.world.x, center.z - building.world.z);
      expect(err).toBeLessThan(LANDMARK_CENTROID_METERS);
    }
  });

  it('aligne le projecteur fixtures sur GeoCoordinateService à l origine', () => {
    const sample = { latitude: 43.2946667, longitude: 5.3748399, altitude: 1.2 };
    const serviceWorld = geo.geoToWorld(sample.latitude, sample.longitude, sample.altitude);
    const utilWorld = projectGeoToMarseilleWorld(
      sample.latitude,
      sample.longitude,
      sample.altitude
    );
    const err = Math.hypot(
      serviceWorld.x - utilWorld.x,
      serviceWorld.y - utilWorld.y,
      serviceWorld.z - utilWorld.z
    );
    expect(err).toBeLessThan(0.005);
  });

  it('dérive chaque ancre RDC du bord de footprint OSM (pas d un offset AABB)', () => {
    const fixtures = createDevPlacementFixtures();
    for (const placement of fixtures.placements) {
      const landmark = MARSEILLE_LANDMARK_BUILDINGS.find(
        (item) => item.id === placement.buildingId
      );
      expect(landmark).toBeDefined();
      const derived = groundFloorAnchorFromGeoFootprint(
        landmark!.footprint,
        (latitude, longitude, altitude) =>
          geo.geoToWorld(latitude, longitude, altitude ?? 0)
      );
      expect(derived).not.toBeNull();
      const err = Math.hypot(
        derived!.world.x - placement.anchorWorld.x,
        derived!.world.y - placement.anchorWorld.y,
        derived!.world.z - placement.anchorWorld.z
      );
      expect(err).toBeLessThan(FACADE_ANCHOR_TOLERANCE_METERS);
      expect(placement.facing?.facingRad).toBeCloseTo(derived!.facingRad, 5);
    }
  });
});
