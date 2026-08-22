import { TestBed } from '@angular/core/testing';

import { GeoCoordinateService } from '../geo-coordinate.service';
import { LocalOriginService } from '../local-origin.service';
import { OSMBuildingProvider, type OSMBuildingFootprint } from '../osm-building.provider';
import { MARSEILLE_GEO_ORIGIN } from '../geo-reference.config';
import { GeoMappingService } from './geo-mapping.service';

describe('GeoMappingService', () => {
  let service: GeoMappingService;

  const footprint: OSMBuildingFootprint = {
    id: 'osm-way-test',
    height: 12,
    heightSource: 'height',
    points: [
      { latitude: 43.2965, longitude: 5.3695 },
      { latitude: 43.2965, longitude: 5.3705 },
      { latitude: 43.296, longitude: 5.3705 },
      { latitude: 43.296, longitude: 5.3695 },
      { latitude: 43.2965, longitude: 5.3695 },
    ],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        GeoMappingService,
        GeoCoordinateService,
        {
          provide: LocalOriginService,
          useValue: {
            latitude: MARSEILLE_GEO_ORIGIN.latitude,
            longitude: MARSEILLE_GEO_ORIGIN.longitude,
            altitude: 0,
            worldScale: 1,
          },
        },
        { provide: OSMBuildingProvider, useValue: { loadBuildingsAround: async () => [] } },
      ],
    });
    service = TestBed.inject(GeoMappingService);
  });

  it('detects point inside OSM footprint', () => {
    expect(service.isPointInFootprint(43.29625, 5.37, footprint)).toBe(true);
    expect(service.isPointInFootprint(43.2975, 5.37, footprint)).toBe(false);
  });

  it('geoToWorld matches equirectangular meter scale at Ombrière origin', () => {
    const origin = service.geoToWorld(MARSEILLE_GEO_ORIGIN.latitude, MARSEILLE_GEO_ORIGIN.longitude, 0);
    expect(origin.x).toBeCloseTo(0, 1);
    expect(origin.z).toBeCloseTo(0, 1);
  });
});
