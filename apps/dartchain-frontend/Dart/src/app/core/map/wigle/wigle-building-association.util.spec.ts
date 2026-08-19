import * as THREE from 'three';

import type { BuildingReference } from './wigle.types';
import {
  associateWIGLEObservationToBuilding,
  densityTierFromCount,
} from './wigle-building-association.util';

describe('wigle-building-association.util', () => {
  const buildings: BuildingReference[] = [
    {
      id: 'test-building',
      center: { x: 10, y: 5, z: -10 },
      minX: 0,
      maxX: 20,
      minZ: -20,
      maxZ: 0,
      height: 10,
    },
  ];

  const converter = {
    geoToWorld: () => new THREE.Vector3(10, 0, -10),
  };

  it('associates a point inside a footprint', () => {
    const association = associateWIGLEObservationToBuilding(
      {
        id: 'obs-1',
        anonymizedId: 'wig-abc',
        latitudeApprox: 43.2965,
        longitudeApprox: 5.3698,
        confidence: 'medium',
        source: 'mock',
      },
      buildings,
      converter
    );
    expect(association.associationType).toBe('inside-footprint');
    expect(association.buildingId).toBe('test-building');
  });

  it('classifies density tiers', () => {
    expect(densityTierFromCount(0)).toBe('unknown');
    expect(densityTierFromCount(1)).toBe('low');
    expect(densityTierFromCount(4)).toBe('medium');
    expect(densityTierFromCount(8)).toBe('high');
  });
});
