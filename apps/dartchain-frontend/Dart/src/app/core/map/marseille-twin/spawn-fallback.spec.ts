import { METRO_SPAWN_ANCHOR, MARSEILLE_START_ORIENTATION } from '../map-configuration';
import { MARSEILLE_SPAWN_ANCHOR } from './marseille-spawn-anchor';

describe('spawn fallback preservation (ITER-018)', () => {
  it('garde METRO_SPAWN_ANCHOR comme autorité runtime', () => {
    expect(METRO_SPAWN_ANCHOR.id).toBe('vieux-port-metro-mirror');
    expect(METRO_SPAWN_ANCHOR.spawnOffsetFromMirror.x).toBe(-6.2);
    expect(METRO_SPAWN_ANCHOR.spawnOffsetFromMirror.z).toBe(-2.4);
    expect(MARSEILLE_SPAWN_ANCHOR.applyAtRuntime).toBe(false);
  });

  it('préserve le heading gameplay (nord, caméra sud)', () => {
    expect(MARSEILLE_START_ORIENTATION.characterRotationY).toBe(0);
    expect(MARSEILLE_START_ORIENTATION.cameraYaw).toBeCloseTo(Math.PI, 6);
    expect(MARSEILLE_SPAWN_ANCHOR.worldHeadingRadians).toBe(
      MARSEILLE_START_ORIENTATION.characterRotationY
    );
  });
});
