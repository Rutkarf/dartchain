import { WORLD_SCALE } from '../map-configuration';
import {
  MARSEILLE_TILE_STRATEGY,
  districtForWorld,
} from './marseille-district.types';

describe('marseille-district.types (ITER-016)', () => {
  it('réutilise la taille de chunk existante sans élargir la ville', () => {
    expect(MARSEILLE_TILE_STRATEGY.chunkSizeMeters).toBe(WORLD_SCALE.chunkSizeMeters);
    expect(MARSEILLE_TILE_STRATEGY.expandBeyondCore).toBe(false);
    expect(districtForWorld(0, 0)).toBe('vieux-port-core');
    expect(districtForWorld(400, 400)).toBe('unknown');
  });
});
