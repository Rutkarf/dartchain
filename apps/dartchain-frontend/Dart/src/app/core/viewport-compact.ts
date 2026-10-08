/**
 * Palier shell compact — grille 250×550, zero-scroll.
 * vp-compact : bande canon 250–349 (toute orientation)
 * ou téléphone portrait (largeur ≤ 480, même grille étirée).
 * Les @media recopient 349 et 480 : var() y est interdit.
 */
export const VIEWPORT_COMPACT_CLASS = 'vp-compact';

/** Largeur min/max du palier canon (inclut 250 px — cible MVP). */
export const VIEWPORT_COMPACT_WIDTH_MIN = 250;
export const VIEWPORT_COMPACT_WIDTH_MAX = 349;

/**
 * Plafond portrait téléphone. Au-delà, shim mid / roomy / desktop.
 * Même littéral que --bp-phone-portrait-max.
 */
export const PHONE_PORTRAIT_MAX = 480;

/** Écart layout − visual viewport au-delà duquel le clavier est ouvert. */
export const KEYBOARD_OPEN_DELTA_PX = 120;

/** Hauteur de référence MVP (documentaire ; layout piloté par tokens). */
export const VIEWPORT_MVP_HEIGHT = 550;
export const VIEWPORT_MVP_WIDTH = 250;

/**
 * Plancher hauteur du palier CSS phone-tall (shell-stack / phone-tall-fit / dock).
 * Portrait 360–480 × ≥ cette hauteur → polices/onglets lisibles (ex. 436×653).
 * Les @media recopient le littéral 600 (var() interdit dans @media).
 */
export const PHONE_TALL_MIN_HEIGHT = 600;

/** Paliers DA — mêmes littéraux que --bp-* (design-system-tokens.css). */
export const BP_COMPACT_MAX = 349;
export const BP_MID_MIN = 350;
export const BP_MID_MAX = 699;
export const BP_ROOMY_MIN = 700;
export const BP_ROOMY_MAX = 1099;
export const BP_DESKTOP_MIN = 1100;

export type ShellBreakpoint = 'compact' | 'mid' | 'roomy' | 'desktop';

export function shellBreakpoint(width = typeof window === 'undefined' ? 0 : Math.round(window.innerWidth)): ShellBreakpoint {
  if (width >= BP_DESKTOP_MIN) return 'desktop';
  if (width >= BP_ROOMY_MIN) return 'roomy';
  if (width >= BP_MID_MIN) return 'mid';
  return 'compact';
}

/** Bande 250–349, ou portrait et largeur ≤ 480. */
export function isViewportCompact(width: number, portrait: boolean): boolean {
  const canonBand = width >= VIEWPORT_COMPACT_WIDTH_MIN && width <= VIEWPORT_COMPACT_WIDTH_MAX;
  const phonePortrait = portrait && width <= PHONE_PORTRAIT_MAX;
  return canonBand || phonePortrait;
}

export function isCompactShellViewport(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const width = Math.round(window.innerWidth);
  const portrait = window.matchMedia('(orientation: portrait)').matches;
  return isViewportCompact(width, portrait);
}

export function isKeyboardOpen(layoutHeight: number, visualHeight: number): boolean {
  return layoutHeight - visualHeight > KEYBOARD_OPEN_DELTA_PX;
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

/** Hauteur visible + classe clavier. Un seul écouteur, partagé avec le compact. */
export function syncVisualViewportMetrics(): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return;
  }

  const root = document.documentElement;
  const viewport = window.visualViewport;
  if (!viewport) {
    root.style.removeProperty('--vv-height');
    root.style.removeProperty('--vv-offset-top');
    root.classList.remove('kb-open');
    return;
  }

  root.style.setProperty('--vv-height', `${Math.round(viewport.height)}px`);
  root.style.setProperty('--vv-offset-top', `${Math.round(viewport.offsetTop)}px`);
  const open = isKeyboardOpen(window.innerHeight, viewport.height);
  const wasOpen = root.classList.contains('kb-open');
  root.classList.toggle('kb-open', open);
  if (open && !wasOpen) {
    const active = document.activeElement;
    if (active instanceof HTMLElement && active !== document.body) {
      active.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }
}

export function bindViewportCompactClass(): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const onChange = (): void => {
    syncViewportCompactClass();
    syncVisualViewportMetrics();
  };
  const portraitQuery = window.matchMedia('(orientation: portrait)');
  onChange();
  window.addEventListener('resize', onChange, { passive: true });
  window.visualViewport?.addEventListener('resize', onChange, { passive: true });
  window.visualViewport?.addEventListener('scroll', onChange, { passive: true });
  portraitQuery.addEventListener('change', onChange);

  return () => {
    window.removeEventListener('resize', onChange);
    window.visualViewport?.removeEventListener('resize', onChange);
    window.visualViewport?.removeEventListener('scroll', onChange);
    portraitQuery.removeEventListener('change', onChange);
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
