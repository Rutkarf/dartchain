export type MarseilleScenePhase =
  | 'idle'
  | 'terrain-ready'
  | 'spawn-ready'
  | 'osm-streaming'
  | 'ready'
  | 'degraded'
  | 'error';

export interface MarseilleSceneState {
  phase: MarseilleScenePhase;
  fallbackLegacy: boolean;
  overlayAttached: boolean;
  lastError: string | null;
}

export const INITIAL_MARSEILLE_SCENE_STATE: MarseilleSceneState = {
  phase: 'idle',
  fallbackLegacy: false,
  overlayAttached: false,
  lastError: null,
};

export function advanceScenePhase(
  current: MarseilleSceneState,
  phase: MarseilleScenePhase
): MarseilleSceneState {
  return { ...current, phase };
}
