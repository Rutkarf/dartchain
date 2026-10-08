import {
  INITIAL_METAVERSE_SCENE_STATE,
  advanceScenePhase,
} from './metaverse-scene-state';

describe('metaverse-scene-state (ITER-010)', () => {
  it('part de idle sans overlay (état actuel préservé)', () => {
    expect(INITIAL_METAVERSE_SCENE_STATE.phase).toBe('idle');
    expect(INITIAL_METAVERSE_SCENE_STATE.overlayAttached).toBe(false);
    expect(INITIAL_METAVERSE_SCENE_STATE.fallbackLegacy).toBe(false);
  });

  it('avance de phase sans muter l état précédent', () => {
    const next = advanceScenePhase(INITIAL_METAVERSE_SCENE_STATE, 'spawn-ready');
    expect(next.phase).toBe('spawn-ready');
    expect(INITIAL_METAVERSE_SCENE_STATE.phase).toBe('idle');
  });
});
