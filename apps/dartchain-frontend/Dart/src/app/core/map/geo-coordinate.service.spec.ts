import { TestBed } from '@angular/core/testing';
import * as THREE from 'three';

import { MARSEILLE_START_POSITION } from './map-configuration';
import { GeoCoordinateService } from './geo-coordinate.service';
import { LocalOriginService } from './local-origin.service';
import { MapConfigService } from './map-config.service';

describe('GeoCoordinateService', () => {
  let geo: GeoCoordinateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    geo = TestBed.inject(GeoCoordinateService);
  });

  it('place l origine Marseille au centre du monde local', () => {
    const world = geo.geoToWorld(
      MARSEILLE_START_POSITION.latitude,
      MARSEILLE_START_POSITION.longitude,
      0
    );

    expect(world.x).toBeCloseTo(0, 4);
    expect(world.z).toBeCloseTo(0, 4);
    expect(world.y).toBeCloseTo(0, 4);
  });

  it('convertit inversement sans perte significative sur le Vieux-Port', () => {
    const original = {
      latitude: 43.2965,
      longitude: 5.3698,
      altitude: 12,
    };
    const world = geo.geoToWorld(original.latitude, original.longitude, original.altitude);
    const back = geo.worldToGeo(world);

    expect(back.latitude).toBeCloseTo(original.latitude, 5);
    expect(back.longitude).toBeCloseTo(original.longitude, 5);
    expect(back.altitude).toBeCloseTo(original.altitude, 3);
  });

  it('conserve l altitude sur plusieurs positions autour du Vieux-Port', () => {
    const samples = [
      { latitude: 43.295, longitude: 5.368, altitude: 8 },
      { latitude: 43.298, longitude: 5.372, altitude: 25 },
      { latitude: 43.294, longitude: 5.365, altitude: 0 },
    ];

    for (const sample of samples) {
      const world = geo.geoToWorld(sample.latitude, sample.longitude, sample.altitude);
      const back = geo.worldToGeo(world);
      expect(back.altitude).toBeCloseTo(sample.altitude, 3);
    }
  });

  it('oriente le nord géographique vers −Z', () => {
    const origin = geo.geoToWorld(43.2965, 5.3698, 0);
    const north = geo.geoToWorld(43.2975, 5.3698, 0);

    expect(north.z).toBeLessThan(origin.z);
    expect(north.x).toBeCloseTo(origin.x, 3);
  });

  it('oriente l est géographique vers +X', () => {
    const origin = geo.geoToWorld(43.2965, 5.3698, 0);
    const east = geo.geoToWorld(43.2965, 5.3708, 0);

    expect(east.x).toBeGreaterThan(origin.x);
    expect(east.z).toBeCloseTo(origin.z, 3);
  });

  it('expose l origine via LocalOriginService', () => {
    const origin = TestBed.inject(LocalOriginService);
    expect(origin.latitude).toBe(MARSEILLE_START_POSITION.latitude);
    expect(origin.longitude).toBe(MARSEILLE_START_POSITION.longitude);
    expect(origin.worldScale).toBe(1);
  });

  it('retourne des Vector3 indépendants à chaque appel', () => {
    const a = geo.geoToWorld(43.2965, 5.3698, 0);
    const b = geo.geoToWorld(43.297, 5.37, 5);
    a.x = 999;
    expect(b).toBeInstanceOf(THREE.Vector3);
    expect(b.x).not.toBe(999);
  });
});
