import {
  INITIAL_MARSEILLE_SCENE_STATE,
  advanceScenePhase,
} from './marseille-scene-state';

describe('marseille-scene-state (ITER-010)', () => {
  it('part de idle sans overlay (état actuel préservé)', () => {
    expect(INITIAL_MARSEILLE_SCENE_STATE.phase).toBe('idle');
    expect(INITIAL_MARSEILLE_SCENE_STATE.overlayAttached).toBe(false);
    expect(INITIAL_MARSEILLE_SCENE_STATE.fallbackLegacy).toBe(false);
  });

  it('avance de phase sans muter l état précédent', () => {
    const next = advanceScenePhase(INITIAL_MARSEILLE_SCENE_STATE, 'spawn-ready');
    expect(next.phase).toBe('spawn-ready');
    expect(INITIAL_MARSEILLE_SCENE_STATE.phase).toBe('idle');
  });
});
