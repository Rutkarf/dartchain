import type { JoystickVector } from './virtual-joystick.component';

/**
 * Intention déplacement émise par le joystick MOVE.
 * x/y transmis tels quels à CharacterControlService (gait walk/run inchangé).
 */
export interface MoveInput {
  x: number;
  y: number;
  magnitude: number;
  active: boolean;
}

function clampUnit(value: number): number {
  if (value > 1) return 1;
  if (value < -1) return -1;
  return value;
}

const NEUTRAL_MOVE: MoveInput = {
  x: 0,
  y: 0,
  magnitude: 0,
  active: false,
};

/**
 * Raw stick → intention MOVE sans recourber ni zone morte locale.
 * Dead zone 0.08, walkRing et collisions restent dans CharacterControlService.
 */
export function mapMoveJoystickVector(raw: JoystickVector): MoveInput {
  const x = clampUnit(raw.x);
  const y = clampUnit(raw.y);
  const magnitude = Math.hypot(x, y);
  if (magnitude === 0) {
    return NEUTRAL_MOVE;
  }
  return {
    x,
    y,
    magnitude,
    active: true,
  };
}
