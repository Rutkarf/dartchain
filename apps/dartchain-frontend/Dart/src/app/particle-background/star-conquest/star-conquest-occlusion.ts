/**
 * Détection des Quests masquées par les panneaux Angular (pas de click-through).
 */

const UI_OCCLUDER_SELECTORS = [
  'app-navbar',
  'app-swap',
  'app-showcase-tab-showcase',
  'app-dock-tabs-dock-tabs',
  'app-graph',
] as const;

function hitsAngularUi(clientX: number, clientY: number): boolean {
  if (typeof document.elementFromPoint !== 'function') return false;
  const el = document.elementFromPoint(clientX, clientY);
  if (!el) return false;
  if (el.closest('[data-star-conquest="canvas"]')) return false;
  if (el.closest('app-particle-background')) return false;
  if (el.closest('app-star-quest-panel')) return false;
  if (el.closest('app-star-quest-scanner')) return false;
  if (el.closest('.sc-reward-label')) return false;
  if (el.closest('app-three-floor')) return false;
  return UI_OCCLUDER_SELECTORS.some((sel) => !!el.closest(sel));
}

/**
 * Quest totalement masquée si le centre et un anneau d’échantillons
 * touchent tous un panneau Angular (elementFromPoint respecte pointer-events).
 */
export function isQuestFullyOccluded(
  sx: number,
  sy: number,
  _rects: readonly DOMRect[] = [],
  radiusPx = 10
): boolean {
  const samples = [
    { x: sx, y: sy },
    { x: sx - radiusPx, y: sy },
    { x: sx + radiusPx, y: sy },
    { x: sx, y: sy - radiusPx },
    { x: sx, y: sy + radiusPx },
  ];
  return samples.every((p) => hitsAngularUi(p.x, p.y));
}

/** Rects conservés pour ResizeObserver / debug — l’occlusion utilise elementFromPoint. */
export function collectUiOccluderRects(): DOMRect[] {
  const rects: DOMRect[] = [];
  for (const sel of UI_OCCLUDER_SELECTORS) {
    const el = document.querySelector(sel);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;
    rects.push(r);
  }
  return rects;
}

export function isPointInRects(x: number, y: number, rects: readonly DOMRect[]): boolean {
  for (const r of rects) {
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return true;
  }
  return false;
}

/** Clic bloqué par un panneau Angular (sécurité hors canvas). */
export function isScreenPointBlockedByUi(clientX: number, clientY: number): boolean {
  return hitsAngularUi(clientX, clientY);
}
