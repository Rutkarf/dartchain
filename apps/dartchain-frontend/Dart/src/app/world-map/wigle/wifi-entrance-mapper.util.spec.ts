import { mapGeoPointsToBuildingEntrances } from './wifi-entrance-mapper.util';
import type { WigleGeoPoint } from './wigle-point.types';
import type { BuildingReference } from './wigle.types';

describe('wifi-entrance-mapper.util', () => {
  const building: BuildingReference = {
    id: 'shop-block',
    label: 'Ensemble boutiques',
    center: { x: 0, y: 10, z: 0 },
    minX: -12,
    maxX: 12,
    minZ: -8,
    maxZ: 8,
    height: 20,
    entrance: { x: 12.16, y: 1.6, z: 0, facingRad: -Math.PI / 2 },
  };

  it('snap un point intérieur à la porte d entrée', () => {
    const point: WigleGeoPoint = {
      id: 'wifi-1',
      latitude: 43.29,
      longitude: 5.37,
      networkName: 'Shop-WiFi',
      networkType: 'WIFI',
      signalStrength: -58,
      source: 'mock',
      worldX: 2,
      worldY: 0.2,
      worldZ: 1,
      waveEffect: 'ripple-circular',
    };

    const [mapped] = mapGeoPointsToBuildingEntrances([point], [building]);
    expect(mapped.mappedAtEntrance).toBe(true);
    expect(mapped.buildingId).toBe('shop-block');
    expect(mapped.buildingLabel).toBe('Ensemble boutiques');
    expect(mapped.worldX).toBeCloseTo(12.16, 2);
    expect(mapped.worldZ).toBeCloseTo(0, 2);
  });

  it('laisse inchangé un point hors périmètre bâtiment', () => {
    const point: WigleGeoPoint = {
      id: 'wifi-far',
      latitude: 43.29,
      longitude: 5.37,
      networkName: 'Far-WiFi',
      networkType: 'WIFI',
      signalStrength: -70,
      source: 'mock',
      worldX: 200,
      worldY: 0.2,
      worldZ: 200,
      waveEffect: 'ripple-circular',
    };

    const [mapped] = mapGeoPointsToBuildingEntrances([point], [building]);
    expect(mapped.mappedAtEntrance).toBeUndefined();
    expect(mapped.worldX).toBe(200);
  });
});
