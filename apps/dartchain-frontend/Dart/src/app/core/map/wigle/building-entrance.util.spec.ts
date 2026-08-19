import {
  attachEntranceToBuilding,
  buildingDisplayPosition,
  resolveEntranceFromBox,
} from './building-entrance.util';
import type { BuildingReference } from './wigle.types';

describe('building-entrance.util', () => {
  it('place la porte sur la face la plus longue', () => {
    const entrance = resolveEntranceFromBox({
      centerX: 10,
      centerZ: 0,
      width: 20,
      depth: 8,
      height: 16,
    });
    expect(entrance.x).toBeGreaterThan(10);
    expect(entrance.z).toBeCloseTo(0, 5);
    expect(entrance.y).toBeGreaterThan(0);
  });

  it('expose la position d affichage depuis le registre bâtiment', () => {
    const building: BuildingReference = {
      id: 'test',
      label: 'Ensemble test',
      center: { x: 0, y: 6, z: 0 },
      minX: -10,
      maxX: 10,
      minZ: -5,
      maxZ: 5,
      height: 12,
    };
    const withEntrance = attachEntranceToBuilding(building);
    const pos = buildingDisplayPosition(withEntrance);
    expect(pos.x).not.toBe(0);
    expect(pos.y).toBeGreaterThan(0);
  });
});
