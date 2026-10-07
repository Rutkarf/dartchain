/** États overlay additifs — n’écrasent pas panel/scanner existants. */

export type StarConquestRuntimePhase = 'ready' | 'loading' | 'error';

export interface StarConquestRuntimeOverlay {
  phase: StarConquestRuntimePhase;
  message: string | null;
}

export const STAR_CONQUEST_RUNTIME_IDLE: StarConquestRuntimeOverlay = {
  phase: 'ready',
  message: null,
};

export function starConquestRuntimeError(message: string): StarConquestRuntimeOverlay {
  return { phase: 'error', message };
}

export function starConquestRuntimeLoading(message = 'Chargement de l’univers'): StarConquestRuntimeOverlay {
  return { phase: 'loading', message };
}
