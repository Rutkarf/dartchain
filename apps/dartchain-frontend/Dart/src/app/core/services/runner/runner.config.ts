/**
 * Paramètres endless runner (Subway-like) — tout ajustable ici.
 */
export const RUNNER_CONFIG = {
  /** Largeur d’une voie (unités monde). */
  laneWidth: 1.35,
  /** Indices de voie : -1 gauche, 0 centre, +1 droite. */
  laneMin: -1,
  laneMax: 1,

  /** Vitesse avant (stick haut plein). */
  forwardSpeed: 3.2,
  /** Vitesse min si stick bas (ralentir). */
  slowSpeed: 0.55,
  /** Recul autorisé (stick bas fort). */
  reverseSpeed: 1.1,
  reverseStickThreshold: -0.65,

  /** Durée d’un changement de voie (s). */
  laneChangeDuration: 0.28,
  /** Stick X pour déclencher un lane change. */
  laneStickTrigger: 0.55,
  /** Stick doit repasser sous ce seuil avant un nouveau lane change. */
  laneStickRelease: 0.22,
  deadZone: 0.1,

  /**
   * Rayon de courbure planétaire (cylindre axe X).
   * Grand = courbure légère / jouable.
   */
  curveRadius: 90,
  /** Longueur d’un segment le long du parcours (arc). */
  segmentLength: 14,
  /** Segments générés devant le joueur. */
  segmentsAhead: 7,
  /** Segments gardés derrière. */
  segmentsBehind: 2,

  /** Décalage latéral des bâtiments hors voies. */
  buildingSideGap: 3.8,
  /** Probabilité bâtiment gauche / droite par segment. */
  buildingChance: 0.72,
  /** Graine RNG pour parcours reproductible. */
  seed: 20260815,

  /** Hauteur cible personnage (+50 %). */
  characterTargetHeight: 4.2,
  characterRadius: 0.65,

  /** Échelle / mur plat sur floor XZ (Z négatif = avant). */
  ladderZ: -40,
  /** Stop zone — 2.5u avant l’échelle (ne traverse pas). */
  ladderStopZ: -37.5,
  stopZoneThickness: 1.0,
  /** Zone interaction E climb (entre stop et échelle). */
  ladderInteractionZ: -39.0,
  ladderInteractionRadiusX: 1.15,
  ladderInteractionRadiusZ: 1.5,
  climbSpeed: 2.8,
  climbMaxHeight: 14,

  /** Progress streaming (segments) — aligné sur −Z. */
  horizonWallProgress: 40,

  /** Caméra 3ᵉ personne — distance orbite (perso plus grand). */
  camDistance: 10,
  camHeight: 3.2,
  camLookAhead: 10,
  camYawLimit: Math.PI,
  camPitchMin: 0.08,
  camPitchMax: 1.45,
} as const;

export type RunnerConfig = typeof RUNNER_CONFIG;
