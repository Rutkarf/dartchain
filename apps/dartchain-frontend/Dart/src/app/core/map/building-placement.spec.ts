import { TestBed } from '@angular/core/testing';
import * as THREE from 'three';

import { GeoCoordinateService } from './geo-coordinate.service';
import { MARSEILLE_LANDMARK_BUILDINGS } from './geo-reference.config';
import {
  createBuildingFromGeoData,
  footprintBounds,
  classifyPlacementError,
} from './geo-building.util';

describe('building-placement', () => {
  let geo: GeoCoordinateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    geo = TestBed.inject(GeoCoordinateService);
  });

  it('crée un bâtiment depuis une empreinte géographique', () => {
    const def = MARSEILLE_LANDMARK_BUILDINGS[0];
    const wall = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const built = createBuildingFromGeoData(def, geo, { wall });
    expect(built).not.toBeNull();
    expect(built!.group.name).toBe(def.id);
    expect(built!.group.userData['geoBuilding']).toBe(true);
    expect(built!.group.userData['sourceId']).toBe(def.sourceId);
    wall.dispose();
  });

  it('conserve les dimensions empreinte en bounds monde', () => {
    const def = MARSEILLE_LANDMARK_BUILDINGS[1];
    const bounds = footprintBounds(def.footprint, geo);
    const width = bounds.maxX - bounds.minX;
    const depth = bounds.maxZ - bounds.minZ;
    expect(width).toBeGreaterThan(10);
    expect(width).toBeLessThan(35);
    expect(depth).toBeGreaterThan(10);
    expect(depth).toBeLessThan(30);
  });

  it('ne déplace pas le bâtiment avec le joueur (world space stable)', () => {
    const def = MARSEILLE_LANDMARK_BUILDINGS[0];
    const wall = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const built = createBuildingFromGeoData(def, geo, { wall });
    const before = built!.center.clone();
    built!.group.position.copy(new THREE.Vector3(999, 0, 999));
    expect(built!.center.x).toBeCloseTo(before.x, 3);
    wall.dispose();
  });

  it('classifie les erreurs de placement', () => {
    expect(classifyPlacementError(0.5)).toBe('ok');
    expect(classifyPlacementError(3)).toBe('acceptable');
    expect(classifyPlacementError(10)).toBe('warning');
    expect(classifyPlacementError(20)).toBe('critical');
  });
});
