import { MIRROR_CANOPY } from '@world-map/vieux-port-mirror-canopy.util';
import { METRO_SPAWN_ANCHOR } from '@world-map/map-configuration';

/**
 * Intro MetaVerseBB :
 * caméra 90° figée sur l’ombrière → spirale → POV perso.
 * Aucun morph du titre (titre = texture Ombrière seule).
 */
export const METAVERSE_INTRO_CAMERA = {
  playOncePerSession: true,
  /** Durée totale ciné (s). */
  durationSeconds: 8.0,
  /** Tours de spirale — assez pour l’effet, pas trop pour éviter le vertige. */
  spiralTurns: 1.75,
  startHeight: 46,
  startRadius: 0.05,
  peakRadius: 16,
  lookAtCanopyY: MIRROR_CANOPY.deckY + MIRROR_CANOPY.titleClearance * 0.35,
  centerX: METRO_SPAWN_ANCHOR.mirror.x,
  centerZ: METRO_SPAWN_ANCHOR.mirror.z,
  /** Blend doux vers le framing perso (début relatif à la spirale 0–1). */
  characterBlendStart: 0.48,
  /** Contemplation titre figé avant ouverture spirale (s). */
  holdTitleSeconds: 1.55,
  /** Fade-in voile bord à l’armement (s). */
  veilEnterSeconds: 0.7,
  /** Opacité voile pendant hold (centre ouvert — ne teinte pas le titre). */
  holdVeilOpacity: 0.85,
  /** Fade-out voile pendant ouverture spirale (s). */
  veilRevealSeconds: 1.65,
  skipAfterSeconds: 1.35,
  startFov: 34,
  endFov: 48,
} as const;

/** Courbe ciné douce : accélération / freinage symétriques. */
export function easeHeroicFantasy(t: number): number {
  return easeInOutCubic(t);
}

export function easeInOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

/** Ease-out pour ouverture de spirale (départ lent depuis le nadir). */
export function easeOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return 1 - Math.pow(1 - x, 3);
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge0 >= edge1) return x >= edge1 ? 1 : 0;
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}
