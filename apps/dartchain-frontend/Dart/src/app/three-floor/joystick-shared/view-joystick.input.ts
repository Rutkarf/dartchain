import type { JoystickVector } from './virtual-joystick.component';

/**
 * Intention caméra émise par le joystick VIEW.
 * Conversion yaw/pitch → CameraControlService inchangée (x=yaw, y=pitch).
 */
export interface ViewInput {
  yaw: number;
  pitch: number;
  magnitude: number;
  active: boolean;
}

/**
 * Paramètres VIEW locaux à metaverseBB.
 * yawSpeed/pitchSpeed de CameraControlService restent la vitesse au bord (magnitude 1).
 * Ajuster ici sans toucher au service partagé.
 */
export interface ViewJoystickInputConfig {
  readonly deadZone: number;
  readonly responseCurve: number;
  readonly invertY: boolean;
  /** Multiplier yaw après courbe. 1 = vitesse max inchangée (clampée à ±1). */
  readonly yawSensitivity: number;
  /** Multiplier pitch après courbe. 1 = vitesse max inchangée (clampée à ±1). */
  readonly pitchSensitivity: number;
  /** Plafond de magnitude après courbe. 1 = pas de plafond supplémentaire. */
  readonly maxMagnitude: number;
  /**
   * Lissage exponentiel (Hz) de l’intention VIEW. 0 = off.
   * Plus élevé que le lerp caméra (~10) pour rester précis.
   * Release / zone morte → 0 immédiat (pas de rotation résiduelle).
   */
  readonly smoothingHz: number;
}

export const VIEW_JOYSTICK_INPUT_CONFIG: ViewJoystickInputConfig = {
  /** Aligné sur MOVE (0.08) : ~2 px de jitter ignorés sur stick 54 px. */
  deadZone: 0.08,
  /** > 1.5 : plus précis au centre, bord toujours à 1. */
  responseCurve: 1.75,
  invertY: false,
  yawSensitivity: 1,
  /** Un peu plus lent que le yaw : viser une façade sans retournement nerveux. */
  pitchSensitivity: 0.85,
  maxMagnitude: 1,
  smoothingHz: 18,
};

function clampUnit(value: number): number {
  if (value > 1) return 1;
  if (value < -1) return -1;
  return value;
}

const NEUTRAL_VIEW: ViewInput = {
  yaw: 0,
  pitch: 0,
  magnitude: 0,
  active: false,
};

/**
 * Raw stick → intention VIEW : dead zone rescalée + courbe de réponse.
 * Magnitude 0 sous la zone morte ; maxMagnitude au bord du stick.
 */
export function mapViewJoystickVector(
  raw: JoystickVector,
  config: ViewJoystickInputConfig = VIEW_JOYSTICK_INPUT_CONFIG
): ViewInput {
  const x = clampUnit(raw.x);
  let y = clampUnit(raw.y);
  if (config.invertY) y = -y;

  const magnitude = Math.hypot(x, y);
  if (magnitude < config.deadZone || magnitude === 0) {
    return NEUTRAL_VIEW;
  }

  const range = Math.max(1e-6, 1 - config.deadZone);
  const rescaled = Math.min(1, (magnitude - config.deadZone) / range);
  const curved = Math.pow(rescaled, config.responseCurve);
  const capped = Math.min(curved, Math.max(0, config.maxMagnitude));
  const scale = capped / magnitude;

  return {
    yaw: clampUnit(x * scale * config.yawSensitivity),
    pitch: clampUnit(y * scale * config.pitchSensitivity),
    magnitude: capped,
    active: true,
  };
}

/**
 * Lisse l’intention VIEW dans le temps. Stateless mapping → cet état local.
 * Ne touche pas CameraControlService : release et dead zone restent un stop net.
 */
export class ViewJoystickSmoother {
  private yaw = 0;
  private pitch = 0;
  private lastTimeMs = 0;
  private primed = false;

  push(
    next: ViewInput,
    nowMs: number,
    config: ViewJoystickInputConfig = VIEW_JOYSTICK_INPUT_CONFIG
  ): ViewInput {
    if (!next.active) {
      return this.reset();
    }

    if (config.smoothingHz <= 0 || !this.primed) {
      this.yaw = next.yaw;
      this.pitch = next.pitch;
      this.lastTimeMs = nowMs;
      this.primed = true;
      return { ...next, yaw: this.yaw, pitch: this.pitch };
    }

    const dt = Math.max(0, (nowMs - this.lastTimeMs) / 1000);
    this.lastTimeMs = nowMs;
    const k = 1 - Math.exp(-config.smoothingHz * dt);
    this.yaw += (next.yaw - this.yaw) * k;
    this.pitch += (next.pitch - this.pitch) * k;
    const magnitude = Math.hypot(this.yaw, this.pitch);
    return {
      yaw: clampUnit(this.yaw),
      pitch: clampUnit(this.pitch),
      magnitude,
      active: true,
    };
  }

  reset(): ViewInput {
    this.yaw = 0;
    this.pitch = 0;
    this.lastTimeMs = 0;
    this.primed = false;
    return NEUTRAL_VIEW;
  }
}
