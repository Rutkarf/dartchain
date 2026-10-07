import { STAR_CONQUEST_CONTROLS } from './star-conquest-controls.config';

export interface StarConquestPointerStroke {
  pointerId: number;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  dragging: boolean;
}

export function beginStarConquestPointerStroke(
  pointerId: number,
  x: number,
  y: number
): StarConquestPointerStroke {
  return {
    pointerId,
    startX: x,
    startY: y,
    lastX: x,
    lastY: y,
    dragging: false,
  };
}

export function updateStarConquestPointerStroke(
  stroke: StarConquestPointerStroke,
  x: number,
  y: number,
  thresholdPx = STAR_CONQUEST_CONTROLS.tapDragThresholdPx
): StarConquestPointerStroke {
  const dist = Math.hypot(x - stroke.startX, y - stroke.startY);
  return {
    ...stroke,
    lastX: x,
    lastY: y,
    dragging: stroke.dragging || dist >= thresholdPx,
  };
}

export function starConquestStrokeIsTap(stroke: StarConquestPointerStroke): boolean {
  return !stroke.dragging;
}

export function starConquestShouldResetStickOnCancel(
  type: 'pointercancel' | 'blur' | 'visibility'
): boolean {
  if (type === 'pointercancel') return STAR_CONQUEST_CONTROLS.pointerCancelResetsStick;
  if (type === 'blur') return STAR_CONQUEST_CONTROLS.blurResetsStick;
  return STAR_CONQUEST_CONTROLS.visibilityHiddenResetsStick;
}
