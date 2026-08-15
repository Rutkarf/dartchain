/**
 * Palier shell compact — viewport MVP exclusif 250×550, zero-scroll.
 * Plage élargie 250–349 conservée pour media queries / classes existantes.
 */
export const VIEWPORT_COMPACT_CLASS = 'vp-compact';

/** Largeur min/max du palier (inclut 250 px — cible MVP). */
export const VIEWPORT_COMPACT_WIDTH_MIN = 250;
export const VIEWPORT_COMPACT_WIDTH_MAX = 349;

/** Hauteur de référence MVP (documentaire ; layout piloté par tokens). */
export const VIEWPORT_MVP_HEIGHT = 550;
export const VIEWPORT_MVP_WIDTH = 250;

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
