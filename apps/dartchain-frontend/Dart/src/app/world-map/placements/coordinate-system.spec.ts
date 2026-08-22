import { TestBed } from '@angular/core/testing';

import { GeoCoordinateService } from '../geo-coordinate.service';
import { GEO_REFERENCE_CONFIG, MARSEILLE_GEO_ORIGIN } from '../geo-reference.config';
import {
  MARSEILLE_COORDINATE_SYSTEM_VERSION,
  MARSEILLE_PLACEMENT_LINK_TOLERANCE_METERS,
  isMarseilleLocalV1,
  toWorldCoordinate,
} from './coordinate-system';

describe('placements/coordinate-system (marseille-local-v1)', () => {
  let geo: GeoCoordinateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    geo = TestBed.inject(GeoCoordinateService);
  });

  it('fixe la version de coordonnées monde', () => {
    expect(MARSEILLE_COORDINATE_SYSTEM_VERSION).toBe('marseille-local-v1');
    expect(GEO_REFERENCE_CONFIG.coordinateSystemVersion).toBe(
      MARSEILLE_COORDINATE_SYSTEM_VERSION
    );
    expect(isMarseilleLocalV1('marseille-local-v1')).toBe(true);
    expect(isMarseilleLocalV1('other')).toBe(false);
  });

  it('est exposée par GeoCoordinateService.getReferenceConfig', () => {
    expect(geo.getReferenceConfig().coordinateSystemVersion).toBe(
      MARSEILLE_COORDINATE_SYSTEM_VERSION
    );
  });

  it('tamponne une ancre monde avec la version courante', () => {
    const origin = geo.geoToWorld(
      MARSEILLE_GEO_ORIGIN.latitude,
      MARSEILLE_GEO_ORIGIN.longitude,
      0
    );
    const stamped = toWorldCoordinate(origin.x, origin.y, origin.z);
    expect(stamped.x).toBeCloseTo(0, 4);
    expect(stamped.z).toBeCloseTo(0, 4);
    expect(stamped.coordinateSystemVersion).toBe('marseille-local-v1');
  });

  it('conserve le pipeline lat/lng → monde (nord = −Z, 1 u = 1 m)', () => {
    expect(GEO_REFERENCE_CONFIG.metersPerWorldUnit).toBe(1);
    expect(GEO_REFERENCE_CONFIG.axisMapping.north).toBe('-z');
    expect(GEO_REFERENCE_CONFIG.axisMapping.east).toBe('x');
    expect(MARSEILLE_PLACEMENT_LINK_TOLERANCE_METERS).toBe(5);

    const origin = geo.geoToWorld(
      MARSEILLE_GEO_ORIGIN.latitude,
      MARSEILLE_GEO_ORIGIN.longitude,
      0
    );
    const north = geo.geoToWorld(
      MARSEILLE_GEO_ORIGIN.latitude + 0.001,
      MARSEILLE_GEO_ORIGIN.longitude,
      0
    );
    expect(north.z).toBeLessThan(origin.z);
  });
});
