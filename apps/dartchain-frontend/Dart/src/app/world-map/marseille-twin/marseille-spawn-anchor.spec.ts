import { METRO_SPAWN_ANCHOR } from '../map-configuration';
import { MARSEILLE_SPAWN_ANCHOR } from './marseille-spawn-anchor';

describe('MarseilleSpawnAnchor (ITER-003)', () => {
  it('documente le spawn existant sans l appliquer au runtime', () => {
    expect(MARSEILLE_SPAWN_ANCHOR.applyAtRuntime).toBe(false);
    expect(MARSEILLE_SPAWN_ANCHOR.runtimeBinding).toBe('METRO_SPAWN_ANCHOR');
    expect(MARSEILLE_SPAWN_ANCHOR.id).toBe('vieux-port-ombriere');
    expect(MARSEILLE_SPAWN_ANCHOR.sourceQuality).toBe('PROJECTED');
  });

  it('reproduit le world spawn actuel (offset miroir)', () => {
    expect(MARSEILLE_SPAWN_ANCHOR.worldPosition.x).toBeCloseTo(
      METRO_SPAWN_ANCHOR.mirror.x + METRO_SPAWN_ANCHOR.spawnOffsetFromMirror.x,
      6
    );
    expect(MARSEILLE_SPAWN_ANCHOR.worldPosition.z).toBeCloseTo(
      METRO_SPAWN_ANCHOR.mirror.z + METRO_SPAWN_ANCHOR.spawnOffsetFromMirror.z,
      6
    );
    expect(MARSEILLE_SPAWN_ANCHOR.worldPosition.y).toBe(0);
  });

  it('oriente le personnage vers la Canebière (−Z), mer au sud', () => {
    expect(MARSEILLE_SPAWN_ANCHOR.worldHeadingRadians).toBeCloseTo(Math.PI, 6);
  });
});
