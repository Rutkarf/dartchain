export type MetaverseScenePhase =
  | 'idle'
  | 'terrain-ready'
  | 'spawn-ready'
  | 'osm-streaming'
  | 'ready'
  | 'degraded'
  | 'error';

export interface MetaverseSceneState {
  phase: MetaverseScenePhase;
  fallbackLegacy: boolean;
  overlayAttached: boolean;
  lastError: string | null;
}

export const INITIAL_METAVERSE_SCENE_STATE: MetaverseSceneState = {
  phase: 'idle',
  fallbackLegacy: false,
  overlayAttached: false,
  lastError: null,
};

export function advanceScenePhase(
  current: MetaverseSceneState,
  phase: MetaverseScenePhase
): MetaverseSceneState {
  return { ...current, phase };
}
