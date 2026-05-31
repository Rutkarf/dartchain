/**
 * Palier shell compact ~300 px de large (référence design 300×600).
 * Bande continue 251–349 px : même comportement à 299, 300 et 301 px.
 */
export const VIEWPORT_COMPACT_CLASS = 'vp-compact';

/** Largeur min/max du palier (aligné sur les media queries compact du projet). */
export const VIEWPORT_COMPACT_WIDTH_MIN = 251;
export const VIEWPORT_COMPACT_WIDTH_MAX = 349;

export function isCompactShellViewport(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const w = Math.round(window.innerWidth);
  return w >= VIEWPORT_COMPACT_WIDTH_MIN && w <= VIEWPORT_COMPACT_WIDTH_MAX;
}

export function syncViewportCompactClass(): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.classList.toggle(
    VIEWPORT_COMPACT_CLASS,
    isCompactShellViewport()
  );
}

export function bindViewportCompactClass(): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  syncViewportCompactClass();

  const onChange = (): void => syncViewportCompactClass();
  window.addEventListener('resize', onChange, { passive: true });
  window.visualViewport?.addEventListener('resize', onChange, { passive: true });

  return () => {
    window.removeEventListener('resize', onChange);
    window.visualViewport?.removeEventListener('resize', onChange);
  };
}

/** @deprecated Utiliser isCompactShellViewport */
export const isViewport300x600 = isCompactShellViewport;

/** @deprecated Utiliser VIEWPORT_COMPACT_CLASS */
export const VIEWPORT_300X600_CLASS = VIEWPORT_COMPACT_CLASS;

/** @deprecated Utiliser syncViewportCompactClass */
export const syncViewport300x600Class = syncViewportCompactClass;

/** @deprecated Utiliser bindViewportCompactClass */
export const bindViewport300x600Class = bindViewportCompactClass;
