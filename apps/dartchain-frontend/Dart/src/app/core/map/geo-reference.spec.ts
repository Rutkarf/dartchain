import { TestBed } from '@angular/core/testing';
import * as THREE from 'three';

import { GeoCoordinateService } from './geo-coordinate.service';
import {
  GEO_REFERENCE_CONFIG,
  MARSEILLE_GEO_ORIGIN,
  MARSEILLE_LANDMARK_BUILDINGS,
  MARSEILLE_VALIDATION_ANCHORS,
  metersToWorld,
  worldToMeters,
} from './geo-reference.config';
import { footprintCentroid } from './geo-building.util';
import { MARSEILLE_START_POSITION, METRO_SPAWN_ANCHOR } from './map-configuration';

describe('geo-reference', () => {
  let geo: GeoCoordinateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    geo = TestBed.inject(GeoCoordinateService);
  });

  it('utilise l Ombrière comme origine géographique', () => {
    expect(GEO_REFERENCE_CONFIG.originLatitude).toBe(MARSEILLE_GEO_ORIGIN.latitude);
    expect(GEO_REFERENCE_CONFIG.originLongitude).toBe(MARSEILLE_GEO_ORIGIN.longitude);
    expect(GEO_REFERENCE_CONFIG.metersPerWorldUnit).toBe(1);
    expect(GEO_REFERENCE_CONFIG.coordinateSystemVersion).toBe('marseille-local-v1');
    expect(GEO_REFERENCE_CONFIG.axisMapping.north).toBe('-z');
    expect(GEO_REFERENCE_CONFIG.axisMapping.east).toBe('x');
  });

  it('place le miroir à l origine monde', () => {
    const mirror = geo.geoToWorld(
      MARSEILLE_GEO_ORIGIN.latitude,
      MARSEILLE_GEO_ORIGIN.longitude,
      0
    );
    expect(mirror.x).toBeCloseTo(METRO_SPAWN_ANCHOR.mirror.x, 3);
    expect(mirror.z).toBeCloseTo(METRO_SPAWN_ANCHOR.mirror.z, 3);
  });

  it('convertit aller-retour lat/lon ↔ monde', () => {
    const sample = { latitude: 43.2950145, longitude: 5.3748504, altitude: 8 };
    const world = geo.geoToWorld(sample.latitude, sample.longitude, sample.altitude);
    const back = geo.worldToGeo(world);
    expect(back.latitude).toBeCloseTo(sample.latitude, 5);
    expect(back.longitude).toBeCloseTo(sample.longitude, 5);
    expect(back.altitude).toBeCloseTo(sample.altitude, 3);
  });

  it('conserve mètres/monde à 1:1', () => {
    expect(metersToWorld(12)).toBe(12);
    expect(worldToMeters(12)).toBe(12);
    expect(geo.metersToWorldUnits(7.5)).toBeCloseTo(7.5, 4);
  });

  it('oriente le nord vers −Z', () => {
    const origin = geo.geoToWorld(MARSEILLE_GEO_ORIGIN.latitude, MARSEILLE_GEO_ORIGIN.longitude, 0);
    const north = geo.geoToWorld(MARSEILLE_GEO_ORIGIN.latitude + 0.001, MARSEILLE_GEO_ORIGIN.longitude, 0);
    expect(north.z).toBeLessThan(origin.z);
  });

  it('aligne MARSEILLE_START_POSITION sur l origine', () => {
    expect(MARSEILLE_START_POSITION.latitude).toBe(MARSEILLE_GEO_ORIGIN.latitude);
    expect(MARSEILLE_START_POSITION.longitude).toBe(MARSEILLE_GEO_ORIGIN.longitude);
  });

  it('place les landmarks proches de positions OSM attendues (< 15 m)', () => {
    const expected: Record<string, THREE.Vector3> = {
      'mirror-adjacent-building-01': new THREE.Vector3(58.1, 0, -7.5),
      'mirror-adjacent-building-02': new THREE.Vector3(52.6, 0, -26.2),
      'harbor-west-building': new THREE.Vector3(-28.7, 0, 85.2),
      'harbor-east-building': new THREE.Vector3(113.4, 0, -9.9),
    };

    for (const def of MARSEILLE_LANDMARK_BUILDINGS) {
      const center = footprintCentroid(def.footprint, geo);
      const exp = expected[def.id];
      expect(exp).toBeDefined();
      const err = Math.hypot(center.x - exp!.x, center.z - exp!.z);
      expect(err).toBeLessThan(15);
    }
  });

  it('expose des ancres de validation avec tolérances', () => {
    expect(MARSEILLE_VALIDATION_ANCHORS.length).toBeGreaterThan(3);
    const mirrorAnchor = MARSEILLE_VALIDATION_ANCHORS.find((a) => a.id === 'ombriere-mirror');
    expect(mirrorAnchor?.expectedWorldPosition.x).toBe(0);
    expect(mirrorAnchor?.expectedWorldPosition.z).toBe(0);
  });
});
