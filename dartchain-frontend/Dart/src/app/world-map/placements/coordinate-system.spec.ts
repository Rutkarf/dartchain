import { TestBed } from '@angular/core/testing';

import { GeoCoordinateService } from '../geo-coordinate.service';
import { GEO_REFERENCE_CONFIG, METAVERSE_GEO_ORIGIN } from '../geo-reference.config';
import {
  METAVERSE_COORDINATE_SYSTEM_VERSION,
  METAVERSE_PLACEMENT_LINK_TOLERANCE_METERS,
  isMetaverseLocalV1,
  toWorldCoordinate,
} from './coordinate-system';

describe('placements/coordinate-system (metaverse-local-v1)', () => {
  let geo: GeoCoordinateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    geo = TestBed.inject(GeoCoordinateService);
  });

  it('fixe la version de coordonnées monde', () => {
    expect(METAVERSE_COORDINATE_SYSTEM_VERSION).toBe('metaverse-local-v1');
    expect(GEO_REFERENCE_CONFIG.coordinateSystemVersion).toBe(
      METAVERSE_COORDINATE_SYSTEM_VERSION
    );
    expect(isMetaverseLocalV1('metaverse-local-v1')).toBe(true);
    expect(isMetaverseLocalV1('other')).toBe(false);
  });

  it('est exposée par GeoCoordinateService.getReferenceConfig', () => {
    expect(geo.getReferenceConfig().coordinateSystemVersion).toBe(
      METAVERSE_COORDINATE_SYSTEM_VERSION
    );
  });

  it('tamponne une ancre monde avec la version courante', () => {
    const origin = geo.geoToWorld(
      METAVERSE_GEO_ORIGIN.latitude,
      METAVERSE_GEO_ORIGIN.longitude,
      0
    );
    const stamped = toWorldCoordinate(origin.x, origin.y, origin.z);
    expect(stamped.x).toBeCloseTo(0, 4);
    expect(stamped.z).toBeCloseTo(0, 4);
    expect(stamped.coordinateSystemVersion).toBe('metaverse-local-v1');
  });

  it('conserve le pipeline lat/lng → monde (nord = −Z, 1 u = 1 m)', () => {
    expect(GEO_REFERENCE_CONFIG.metersPerWorldUnit).toBe(1);
    expect(GEO_REFERENCE_CONFIG.axisMapping.north).toBe('-z');
    expect(GEO_REFERENCE_CONFIG.axisMapping.east).toBe('x');
    expect(METAVERSE_PLACEMENT_LINK_TOLERANCE_METERS).toBe(5);

    const origin = geo.geoToWorld(
      METAVERSE_GEO_ORIGIN.latitude,
      METAVERSE_GEO_ORIGIN.longitude,
      0
    );
    const north = geo.geoToWorld(
      METAVERSE_GEO_ORIGIN.latitude + 0.001,
      METAVERSE_GEO_ORIGIN.longitude,
      0
    );
    expect(north.z).toBeLessThan(origin.z);
  });
});
