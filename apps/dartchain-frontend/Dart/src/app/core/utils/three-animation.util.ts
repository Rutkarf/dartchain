/** Pause les boucles WebGL quand l'onglet est masqué ou si reduced-motion est actif. */
export function shouldAnimateWebGl(): boolean {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return false;
  }

  if (document.hidden) {
    return false;
  }

  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Démarre la boucle rAF si elle n'est pas déjà active. */
export function startWebGlAnimationLoop(
  isRunning: () => boolean,
  start: () => void
): void {
  if (isRunning()) {
    return;
  }

  start();
}

/** Arrête la boucle rAF. */
export function stopWebGlAnimationLoop(
  setRunning: (running: boolean) => void,
  cancelFrame: () => void
): void {
  setRunning(false);
  cancelFrame();
}

export interface WebGlVisibilityBinding {
  unsubscribe: () => void;
}

export function bindWebGlVisibilityPause(
  onPause: () => void,
  onResume: () => void
): WebGlVisibilityBinding {
  const sync = (): void => {
    if (shouldAnimateWebGl()) {
      onResume();
    } else {
      onPause();
    }
  };

  const onVisibility = (): void => sync();
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const onMotion = (): void => sync();

  document.addEventListener('visibilitychange', onVisibility);
  motionQuery.addEventListener('change', onMotion);
  sync();

  return {
    unsubscribe: () => {
      document.removeEventListener('visibilitychange', onVisibility);
      motionQuery.removeEventListener('change', onMotion);
    },
  };
}
