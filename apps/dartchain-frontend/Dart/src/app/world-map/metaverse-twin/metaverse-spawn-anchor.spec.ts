import { METRO_SPAWN_ANCHOR } from '../map-configuration';
import { METAVERSE_SPAWN_ANCHOR } from './metaverse-spawn-anchor';

describe('MetaverseSpawnAnchor (ITER-003)', () => {
  it('documente le spawn existant sans l appliquer au runtime', () => {
    expect(METAVERSE_SPAWN_ANCHOR.applyAtRuntime).toBe(false);
    expect(METAVERSE_SPAWN_ANCHOR.runtimeBinding).toBe('METRO_SPAWN_ANCHOR');
    expect(METAVERSE_SPAWN_ANCHOR.id).toBe('vieux-port-ombriere');
    expect(METAVERSE_SPAWN_ANCHOR.sourceQuality).toBe('PROJECTED');
  });

  it('reproduit le world spawn actuel (offset miroir)', () => {
    expect(METAVERSE_SPAWN_ANCHOR.worldPosition.x).toBeCloseTo(
      METRO_SPAWN_ANCHOR.mirror.x + METRO_SPAWN_ANCHOR.spawnOffsetFromMirror.x,
      6
    );
    expect(METAVERSE_SPAWN_ANCHOR.worldPosition.z).toBeCloseTo(
      METRO_SPAWN_ANCHOR.mirror.z + METRO_SPAWN_ANCHOR.spawnOffsetFromMirror.z,
      6
    );
    expect(METAVERSE_SPAWN_ANCHOR.worldPosition.y).toBe(0);
  });

  it('oriente le personnage vers la Canebière (−Z), mer au sud', () => {
    expect(METAVERSE_SPAWN_ANCHOR.worldHeadingRadians).toBeCloseTo(Math.PI, 6);
  });
});
