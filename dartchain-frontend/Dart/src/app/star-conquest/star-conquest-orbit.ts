import { STAR_CONQUEST_CONTROLS } from './star-conquest-controls.config';
import { STAR_CONQUEST_DESIGN_VIEWPORT } from './star-conquest-scale';
import type { StarConquestPointerStroke } from './star-conquest-pointer-safety';

export interface StarConquestOrbitPan {
  dxWorld: number;
  dyWorld: number;
}

/**
 * Drag écran → pan monde (grab the nebula).
 * dxPx>0 (droite) déplace la caméra vers la gauche pour que le contenu suive le doigt.
 */
export function screenDeltaToWorldPan(
  dxPx: number,
  dyPx: number,
  panMaxX: number,
  panMaxY: number,
  viewportW: number = STAR_CONQUEST_DESIGN_VIEWPORT.w,
  viewportH: number = STAR_CONQUEST_DESIGN_VIEWPORT.h
): StarConquestOrbitPan {
  const w = Math.max(1, viewportW);
  const h = Math.max(1, viewportH);
  return {
    dxWorld: -(dxPx * (panMaxX * 2)) / w,
    dyWorld: (dyPx * (panMaxY * 2)) / h,
  };
}

export function starConquestOrbitShouldPick(
  stroke: StarConquestPointerStroke | null,
  thresholdPx = STAR_CONQUEST_CONTROLS.tapDragThresholdPx
): boolean {
  if (!stroke) return false;
  return !stroke.dragging && Math.hypot(stroke.lastX - stroke.startX, stroke.lastY - stroke.startY) < thresholdPx;
}

export const STAR_CONQUEST_ORBIT_DOUBLE_TAP_MS = 280;
