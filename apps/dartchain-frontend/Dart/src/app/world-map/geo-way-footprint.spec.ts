import { TestBed } from '@angular/core/testing';
import * as THREE from 'three';

import { GeoCoordinateService } from './geo-coordinate.service';
import { createBuildingFromGeoData, footprintCentroid } from './geo-building.util';
import {
  MARSEILLE_LANDMARK_BUILDINGS,
  closedOsmWayFootprint,
} from './geo-reference.config';

/**
 * GEO-WAY-1 — empreintes landmarks = sommets OSM way/*, pas un rectangle AABB.
 * Snapshot API 0.6 du 2026-08-20. Overpass runtime inchangé.
 */
const OSM_WAY_IDS = {
  'mirror-adjacent-building-01': 'osm-way-67705148',
  'mirror-adjacent-building-02': 'osm-way-67704902',
  'harbor-west-building': 'osm-way-67701479',
  'harbor-east-building': 'osm-way-67708729',
} as const;

const RECTANGLE_CENTROIDS: Record<string, { x: number; z: number }> = {
  'mirror-adjacent-building-01': { x: 58.1, z: -7.5 },
  'mirror-adjacent-building-02': { x: 52.6, z: -26.2 },
  'harbor-west-building': { x: -28.7, z: 85.2 },
  'harbor-east-building': { x: 113.4, z: -9.9 },
};

describe('geo-way-footprint (GEO-WAY-1)', () => {
  let geo: GeoCoordinateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    geo = TestBed.inject(GeoCoordinateService);
  });

  it('ferme un anneau OSM si le dernier sommet manque', () => {
    const ring = closedOsmWayFootprint([
      [43.29, 5.37],
      [43.29, 5.38],
      [43.28, 5.38],
    ]);
    expect(ring.length).toBe(4);
    expect(ring[0]).toEqual(ring[ring.length - 1]);
  });

  it('remplace les rectangles AABB par les sommets des 4 ways OSM', () => {
    for (const def of MARSEILLE_LANDMARK_BUILDINGS) {
      expect(def.sourceId).toBe(OSM_WAY_IDS[def.id as keyof typeof OSM_WAY_IDS]);
      const unique = def.footprint.slice(0, -1);
      expect(unique.length).toBeGreaterThan(4);
      expect(def.footprint[0]).toEqual(def.footprint[def.footprint.length - 1]);
    }
  });

  it('garde les centroïdes way à moins de 15 m des anciens rectangles', () => {
    for (const def of MARSEILLE_LANDMARK_BUILDINGS) {
      const center = footprintCentroid(def.footprint, geo);
      const previous = RECTANGLE_CENTROIDS[def.id];
      const err = Math.hypot(center.x - previous.x, center.z - previous.z);
      expect(err).toBeLessThan(15);
      expect(err).toBeGreaterThan(0.2);
    }
  });

  it('extrude toujours les 4 héros depuis l empreinte OSM', () => {
    const wall = new THREE.MeshLambertMaterial({ color: 0xffffff });
    for (const def of MARSEILLE_LANDMARK_BUILDINGS) {
      const built = createBuildingFromGeoData(def, geo, { wall });
      expect(built).not.toBeNull();
      expect(built!.group.userData['sourceId']).toBe(def.sourceId);
    }
    wall.dispose();
  });
});
