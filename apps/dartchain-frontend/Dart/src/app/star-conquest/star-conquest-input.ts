/**
 * Intentions de pan Star Conquest — normalisées, hors DOM / hors caméra.
 * Le stick floor MOVE/VIEW (metaverse) n’est pas ce contrat.
 */

export interface StarConquestPanIntent {
  /** Axe horizontal, −1…1 (gauche / droite). */
  x: number;
  /** Axe vertical, −1…1 (bas / haut, convention stick écran). */
  y: number;
  /** Magnitude après dead-zone, 0…1. */
  magnitude: number;
  active: boolean;
}

export interface StarConquestStickNormalizeOptions {
  deadzone: number;
  /** Empêche la diagonale d’aller plus vite que 1. */
  clampMagnitude: boolean;
}

const DEFAULT_STICK_OPTIONS: StarConquestStickNormalizeOptions = {
  deadzone: 0.04,
  clampMagnitude: true,
};

function clampUnit(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(-1, Math.min(1, v));
}

/**
 * Normalise un vecteur stick brut. Comportement historique : dead-zone
 * par axe puis pan ; ici dead-zone sur la magnitude + clamp diagonale,
 * avec dead-zone par axe conservée via `applyAxisDeadzone`.
 */
export function normalizeStarConquestStick(
  rawX: number,
  rawY: number,
  options: Partial<StarConquestStickNormalizeOptions> = {}
): StarConquestPanIntent {
  const opts = { ...DEFAULT_STICK_OPTIONS, ...options };
  let x = clampUnit(rawX);
  let y = clampUnit(rawY);
  const mag = Math.hypot(x, y);
  if (mag < opts.deadzone) {
    return { x: 0, y: 0, magnitude: 0, active: false };
  }
  if (opts.clampMagnitude && mag > 1) {
    x /= mag;
    y /= mag;
  }
  const outMag = Math.min(1, Math.hypot(x, y));
  return { x, y, magnitude: outMag, active: outMag > 0 };
}

/** Dead-zone historique par axe (world.tick). */
export function applyAxisDeadzone(value: number, deadzone: number): number {
  return Math.abs(value) < deadzone ? 0 : clampUnit(value);
}

export function idleStarConquestPanIntent(): StarConquestPanIntent {
  return { x: 0, y: 0, magnitude: 0, active: false };
}
