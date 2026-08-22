/**
 * Détection des Quests masquées par les panneaux Angular (pas de click-through).
 * Phase 18 — rects DOM (pas elementFromPoint dans la boucle animate).
 * Coords layout 250×550 (aligné render SC).
 */

import {
  starConquestClientToLayout,
  starConquestScaleDomLength,
} from './star-conquest-viewport.util';

export interface StarConquestLayoutRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const UI_OCCLUDER_SELECTORS = [
  'app-navbar',
  'app-swap',
  'app-showcase-tab-showcase',
  'app-dock-tabs-dock-tabs',
  'app-graph',
] as const;

/** Fallback ponctuel (clic) — hors hot path animate. */
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
 * intersectent les rects UI collectés (Phase 18 — O(rects) vs DOM hit-test).
 */
export function isQuestFullyOccluded(
  sx: number,
  sy: number,
  rects: readonly StarConquestLayoutRect[] = [],
  radiusPx = 10
): boolean {
  if (rects.length === 0) return false;
  const samples = [
    { x: sx, y: sy },
    { x: sx - radiusPx, y: sy },
    { x: sx + radiusPx, y: sy },
    { x: sx, y: sy - radiusPx },
    { x: sx, y: sy + radiusPx },
  ];
  return samples.every((p) => isPointInRects(p.x, p.y, rects));
}

export function collectUiOccluderRects(): StarConquestLayoutRect[] {
  const rects: StarConquestLayoutRect[] = [];
  for (const sel of UI_OCCLUDER_SELECTORS) {
    const el = document.querySelector(sel);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;
    rects.push({
      left: starConquestScaleDomLength(r.left, 'x'),
      top: starConquestScaleDomLength(r.top, 'y'),
      right: starConquestScaleDomLength(r.right, 'x'),
      bottom: starConquestScaleDomLength(r.bottom, 'y'),
    });
  }
  return rects;
}

export function isPointInRects(
  x: number,
  y: number,
  rects: readonly StarConquestLayoutRect[]
): boolean {
  for (const r of rects) {
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return true;
  }
  return false;
}

/** Point en espace layout 250×550. */
export function isLayoutPointBlockedByUi(layoutX: number, layoutY: number): boolean {
  const rects = collectUiOccluderRects();
  if (rects.length > 0) {
    return isPointInRects(layoutX, layoutY, rects);
  }
  return false;
}

/** Clic bloqué par un panneau Angular (sécurité hors canvas). */
export function isScreenPointBlockedByUi(clientX: number, clientY: number): boolean {
  const { x, y } = starConquestClientToLayout(clientX, clientY);
  const rects = collectUiOccluderRects();
  if (rects.length > 0) {
    return isPointInRects(x, y, rects);
  }
  return hitsAngularUi(clientX, clientY);
}
