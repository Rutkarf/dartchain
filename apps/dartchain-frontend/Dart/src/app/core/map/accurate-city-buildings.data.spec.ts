import { describe, expect, it } from 'vitest';

import {
  ACCURATE_CITY_BUILDING_MIN_COUNT,
  ACCURATE_CITY_BUILDINGS,
  CANEBIERE_BEARING_DEG,
  CANEBIERE_MOUTH,
  generateCanebiereSegment,
  pointAlongCanebiere,
  worldToCanebiereAlong,
} from './accurate-city-buildings.data';
import { MARSEILLE_GEO_ORIGIN } from './geo-reference.config';

describe('accurate-city-buildings.data', () => {
  it('fournit au moins 100 empreintes GPS', () => {
    expect(ACCURATE_CITY_BUILDINGS.length).toBeGreaterThanOrEqual(
      ACCURATE_CITY_BUILDING_MIN_COUNT
    );
  });

  it('aligne la Canebière sur le bearing réel (~62° NE)', () => {
    expect(CANEBIERE_BEARING_DEG).toBeGreaterThan(55);
    expect(CANEBIERE_BEARING_DEG).toBeLessThan(70);
    expect(CANEBIERE_MOUTH.lat).toBeGreaterThan(MARSEILLE_GEO_ORIGIN.latitude);
    expect(CANEBIERE_MOUTH.lon).toBeGreaterThan(MARSEILLE_GEO_ORIGIN.longitude);
  });

  it('place les premiers îlots Canebière au NE de l’Ombrière (est +, nord +)', () => {
    const p = pointAlongCanebiere(80, 28);
    expect(p.lat).toBeGreaterThan(CANEBIERE_MOUTH.lat);
    expect(p.lon).toBeGreaterThan(CANEBIERE_MOUTH.lon - 0.002);
  });

  it('ferme chaque footprint et reste dans Marseille Vieux-Port', () => {
    for (const b of ACCURATE_CITY_BUILDINGS) {
      expect(b.footprint.length).toBeGreaterThanOrEqual(5);
      const first = b.footprint[0];
      const last = b.footprint[b.footprint.length - 1];
      expect(first.latitude).toBeCloseTo(last.latitude, 8);
      expect(first.longitude).toBeCloseTo(last.longitude, 8);
      expect(b.heightMeters ?? 0).toBeGreaterThan(8);
      for (const p of b.footprint) {
        expect(p.latitude).toBeGreaterThan(43.29);
        expect(p.latitude).toBeLessThan(43.31);
        expect(p.longitude).toBeGreaterThan(5.36);
        expect(p.longitude).toBeLessThan(5.39);
      }
    }
  });

  it('génère des segments Canebière pour le streaming joueur', () => {
    const seg = generateCanebiereSegment(400, 560, 18);
    expect(seg.length).toBeGreaterThan(20);
    expect(worldToCanebiereAlong(120, -80)).toBeGreaterThan(0);
  });
});
