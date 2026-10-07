import { METRO_SPAWN_ANCHOR, METAVERSE_START_ORIENTATION } from '../map-configuration';
import { METAVERSE_SPAWN_ANCHOR } from './metaverse-spawn-anchor';

describe('spawn fallback preservation (ITER-018)', () => {
  it('garde METRO_SPAWN_ANCHOR comme autorité runtime', () => {
    expect(METRO_SPAWN_ANCHOR.id).toBe('vieux-port-metro-mirror');
    expect(METRO_SPAWN_ANCHOR.spawnOffsetFromMirror.x).toBe(0);
    expect(METRO_SPAWN_ANCHOR.spawnOffsetFromMirror.z).toBe(5);
    expect(METAVERSE_SPAWN_ANCHOR.applyAtRuntime).toBe(false);
  });

  it('préserve le heading gameplay (Canebière −Z, caméra depuis la mer)', () => {
    expect(METAVERSE_START_ORIENTATION.characterRotationY).toBeCloseTo(Math.PI, 6);
    expect(METAVERSE_START_ORIENTATION.cameraYaw).toBe(0);
    expect(METAVERSE_SPAWN_ANCHOR.worldHeadingRadians).toBe(
      METAVERSE_START_ORIENTATION.characterRotationY
    );
  });
});
