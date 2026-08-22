import { TestBed } from '@angular/core/testing';
import * as THREE from 'three';

import { GeoCoordinateService } from './geo-coordinate.service';
import {
  GEOGRAPHIC_DATA_SOURCES,
  GEO_REFERENCE_CONFIG,
  MARSEILLE_GEO_ORIGIN,
} from './geo-reference.config';
import {
  METERS_PER_DEGREE_LATITUDE,
  metersPerDegreeLongitude,
} from './geo-projection.constants';
import { MARSEILLE_COORDINATE_SYSTEM_VERSION } from './placements/coordinate-system';

/**
 * GEO-PREC-1 — contrat interne centimétrique de `marseille-local-v1`.
 *
 * La projection équirectangulaire locale (1 unité = 1 mètre) est exacte
 * par définition près de l’Ombrière. Ce n’est pas une vérité cadastrale :
 * OSM reste ~2–5 m. Un CRS métrique (Lambert-93) n’est pas introduit ici.
 */
const CENTIMETER_METERS = 0.01;
const CENTIMETER_TOLERANCE_METERS = 0.005;

const WGS84_A = 6_378_137;
const WGS84_F = 1 / 298.257223563;
const WGS84_E2 = WGS84_F * (2 - WGS84_F);

interface Wgs84MetersPerDegree {
  lat: number;
  lon: number;
}

function wgs84MetersPerDegree(latitudeDeg: number): Wgs84MetersPerDegree {
  const phi = (latitudeDeg * Math.PI) / 180;
  const sin2 = Math.sin(phi) * Math.sin(phi);
  const denom = 1 - WGS84_E2 * sin2;
  const primeVertical = WGS84_A / Math.sqrt(denom);
  const meridian = (WGS84_A * (1 - WGS84_E2)) / Math.pow(denom, 1.5);
  const deg = Math.PI / 180;
  return {
    lat: meridian * deg,
    lon: primeVertical * Math.cos(phi) * deg,
  };
}

describe('geo-precision (GEO-PREC-1, marseille-local-v1)', () => {
  let geo: GeoCoordinateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    geo = TestBed.inject(GeoCoordinateService);
  });

  it('fixe 1 unité monde = 1 mètre, pas 1 centimètre', () => {
    expect(GEO_REFERENCE_CONFIG.metersPerWorldUnit).toBe(1);
    expect(GEO_REFERENCE_CONFIG.coordinateSystemVersion).toBe(
      MARSEILLE_COORDINATE_SYSTEM_VERSION
    );
    expect(geo.metersToWorldUnits(CENTIMETER_METERS)).toBeCloseTo(0.01, 6);
  });

  it('projette un offset GPS de 1 cm à l origine vers 0,01 m ± 0,005 m', () => {
    const latOffset = CENTIMETER_METERS / METERS_PER_DEGREE_LATITUDE;
    const lonOffset =
      CENTIMETER_METERS / metersPerDegreeLongitude(MARSEILLE_GEO_ORIGIN.latitude);

    const origin = geo.geoToWorld(
      MARSEILLE_GEO_ORIGIN.latitude,
      MARSEILLE_GEO_ORIGIN.longitude,
      0
    );
    const north = geo.geoToWorld(
      MARSEILLE_GEO_ORIGIN.latitude + latOffset,
      MARSEILLE_GEO_ORIGIN.longitude,
      0
    );
    const east = geo.geoToWorld(
      MARSEILLE_GEO_ORIGIN.latitude,
      MARSEILLE_GEO_ORIGIN.longitude + lonOffset,
      0
    );
    const up = geo.geoToWorld(
      MARSEILLE_GEO_ORIGIN.latitude,
      MARSEILLE_GEO_ORIGIN.longitude,
      CENTIMETER_METERS
    );

    expect(Math.abs(origin.x)).toBeLessThan(CENTIMETER_TOLERANCE_METERS);
    expect(Math.abs(origin.z)).toBeLessThan(CENTIMETER_TOLERANCE_METERS);

    expect(Math.abs(-north.z - CENTIMETER_METERS)).toBeLessThan(
      CENTIMETER_TOLERANCE_METERS
    );
    expect(Math.abs(north.x)).toBeLessThan(CENTIMETER_TOLERANCE_METERS);

    expect(Math.abs(east.x - CENTIMETER_METERS)).toBeLessThan(
      CENTIMETER_TOLERANCE_METERS
    );
    expect(Math.abs(east.z)).toBeLessThan(CENTIMETER_TOLERANCE_METERS);

    expect(Math.abs(up.y - CENTIMETER_METERS)).toBeLessThan(
      CENTIMETER_TOLERANCE_METERS
    );
  });

  it('conserve un aller-retour cm près de l Ombrière (erreur monde < 0,5 cm)', () => {
    const samples: ReadonlyArray<{ n: number; e: number; up: number }> = [
      { n: 0.01, e: 0, up: 0 },
      { n: 0, e: 0.01, up: 0 },
      { n: 0.1, e: -0.1, up: 0.01 },
      { n: 1, e: 1, up: 0.5 },
    ];

    for (const sample of samples) {
      const world = new THREE.Vector3(sample.e, sample.up, -sample.n);
      const geoPos = geo.worldToGeo(world);
      const back = geo.geoToWorld(geoPos.latitude, geoPos.longitude, geoPos.altitude);
      const err = Math.hypot(back.x - world.x, back.y - world.y, back.z - world.z);
      expect(err).toBeLessThan(CENTIMETER_TOLERANCE_METERS);
    }
  });

  it('conserve l aller-retour lat/lon à 5 décimales sur le Vieux-Port', () => {
    const sample = {
      latitude: 43.2950145,
      longitude: 5.3748504,
      altitude: 8,
    };
    const world = geo.geoToWorld(sample.latitude, sample.longitude, sample.altitude);
    const back = geo.worldToGeo(world);
    expect(back.latitude).toBeCloseTo(sample.latitude, 5);
    expect(back.longitude).toBeCloseTo(sample.longitude, 5);
    expect(back.altitude).toBeCloseTo(sample.altitude, 3);
  });

  it('documente la dérive équirectangulaire vs ellipsoïde WGS84 (pas un nouveau CRS)', () => {
    const wgsOrigin = wgs84MetersPerDegree(MARSEILLE_GEO_ORIGIN.latitude);
    const distances = [100, 500, 2_000, 10_000] as const;
    const northDrifts: number[] = [];
    const eastDrifts: number[] = [];

    for (const distance of distances) {
      const northLat =
        MARSEILLE_GEO_ORIGIN.latitude + distance / wgsOrigin.lat;
      const northWorld = geo.geoToWorld(
        northLat,
        MARSEILLE_GEO_ORIGIN.longitude,
        0
      );
      northDrifts.push(Math.abs(-northWorld.z - distance));

      const eastLon =
        MARSEILLE_GEO_ORIGIN.longitude + distance / wgsOrigin.lon;
      const eastWorld = geo.geoToWorld(
        MARSEILLE_GEO_ORIGIN.latitude,
        eastLon,
        0
      );
      eastDrifts.push(Math.abs(eastWorld.x - distance));
    }

    // 100 m : encore sub-métrique, pas centimétrique vs WGS84.
    expect(northDrifts[0]).toBeGreaterThan(0.05);
    expect(northDrifts[0]).toBeLessThan(0.35);
    expect(eastDrifts[0]).toBeLessThan(0.35);

    // 500 m : ~1 m de dérive nord.
    expect(northDrifts[1]).toBeGreaterThan(0.4);
    expect(northDrifts[1]).toBeLessThan(1.5);

    // 2 km : plusieurs mètres.
    expect(northDrifts[2]).toBeGreaterThan(2);
    expect(northDrifts[2]).toBeLessThan(6);

    // 10 km : hors contrat cm — Marseille entière exige un CRS métrique.
    expect(northDrifts[3]).toBeGreaterThan(10);
    expect(northDrifts[3]).toBeLessThan(30);
    expect(eastDrifts[3]).toBeGreaterThan(8);
    expect(eastDrifts[3]).toBeLessThan(25);
  });

  it('rappelle que la source OSM n est pas une vérité centimétrique', () => {
    const osm = GEOGRAPHIC_DATA_SOURCES.find(
      (source) => source.id === 'osm-overpass-marseille-buildings'
    );
    expect(osm?.isUsed).toBe(true);
    expect(osm?.accuracy).toContain('2–5 m');
    expect(osm?.accuracy).not.toMatch(/cm|centimètre/i);
  });
});
