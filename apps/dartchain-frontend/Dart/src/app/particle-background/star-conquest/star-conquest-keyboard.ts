import { idleStarConquestPanIntent, type StarConquestPanIntent } from './star-conquest-input';
import { STAR_CONQUEST_CONTROLS } from './star-conquest-controls.config';

const KEY_AXIS: Record<string, { x: number; y: number }> = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  KeyA: { x: -1, y: 0 },
  KeyD: { x: 1, y: 0 },
  KeyW: { x: 0, y: -1 },
  KeyS: { x: 0, y: 1 },
};

export function starConquestKeyToPanDelta(
  code: string,
  step: number = STAR_CONQUEST_CONTROLS.keyboardPanStep
): StarConquestPanIntent | null {
  const axis = KEY_AXIS[code];
  if (!axis) return null;
  return {
    x: axis.x * step,
    y: axis.y * step,
    magnitude: step,
    active: true,
  };
}

export function mergeStarConquestKeyPan(
  _current: StarConquestPanIntent,
  held: ReadonlySet<string>,
  step: number = STAR_CONQUEST_CONTROLS.keyboardPanStep
): StarConquestPanIntent {
  let x = 0;
  let y = 0;
  for (const code of held) {
    const delta = starConquestKeyToPanDelta(code, 1);
    if (!delta) continue;
    x += delta.x;
    y += delta.y;
  }
  if (x === 0 && y === 0) return idleStarConquestPanIntent();
  const mag = Math.hypot(x, y) || 1;
  x = (x / mag) * step;
  y = (y / mag) * step;
  return { x, y, magnitude: step, active: true };
}
