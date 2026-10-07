import * as THREE from 'three';

/**
 * Traits + bevel DA — miroir de
 * docs/directionArtistique/bordures traits epaisseur three.js.txt
 *
 * Largeur produit = hairline 1 px (WebGL ignore LineBasicMaterial.linewidth).
 * Le look « dense 0.5 » = STROKE.dense (α 0.14), pas une largeur 0.5.
 */

export interface StrokeToken {
  readonly color: number;
  readonly opacity: number;
}

export const STROKE = {
  width: { hairline: 1, accent: 2 },

  /** Blanc cassé — chrome idle */
  subtle: { color: 0xede7d9, opacity: 0.06 },
  default: { color: 0xede7d9, opacity: 0.1 },
  frame: { color: 0xede7d9, opacity: 0.48 },

  /** Bleu gris — structure / dense */
  dense: { color: 0x8a95a5, opacity: 0.14 },
  struct: { color: 0x8a95a5, opacity: 0.22 },
  active: { color: 0x8a95a5, opacity: 0.45 },

  /** Sémantique — une teinte à la fois */
  ok: { color: 0x09814a, opacity: 0.55 },
  danger: { color: 0x7b0d1e, opacity: 0.85 },
  seam: { color: 0x0d0630, opacity: 0.45 },
} as const satisfies { width: { hairline: number; accent: number } } & Record<
  string,
  StrokeToken | { hairline: number; accent: number }
>;

export type StrokeRole = Exclude<keyof typeof STROKE, 'width'>;

export interface BevelPreset {
  readonly bevelEnabled: boolean;
  readonly depth?: number;
  readonly bevelThickness?: number;
  readonly bevelSize?: number;
  readonly bevelSegments?: number;
  readonly bevelOffset?: number;
  readonly curveSegments?: number;
  readonly steps?: number;
}

/** thick/depth UI ≈ 0.21–0.25. Urbain = chamfer fixe en mètres. */
export const BEVEL = {
  micro: {
    depth: 0.4,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.06,
    bevelSegments: 2,
    curveSegments: 2,
  },
  card: {
    depth: 0.07,
    bevelEnabled: true,
    bevelThickness: 0.016,
    bevelSize: 0.016,
    bevelOffset: 0,
    bevelSegments: 2,
    curveSegments: 8,
  },
  urban: {
    bevelEnabled: true,
    bevelThickness: 0.045,
    bevelSize: 0.035,
    bevelSegments: 1,
    steps: 1,
  },
  flat: {
    bevelEnabled: false,
  },
} as const satisfies Record<string, BevelPreset>;

/** Matériaux relief existants — chiffres inchangés (icon ≠ digit). */
export const RELIEF = {
  microMat: {
    color: 0xede7d9,
    metalness: 0.22,
    roughness: 0.28,
    emissive: 0xede7d9,
    emissiveIntensity: 0.12,
  },
  digitMat: {
    color: 0xede7d9,
    metalness: 0.12,
    roughness: 0.22,
    emissive: 0xede7d9,
    emissiveIntensity: 0.18,
  },
} as const;

/**
 * LineBasic hairline. `linewidth` n’est pas exposé (no-op WebGL).
 * `extras` peut surcharger opacity / blending sans changer la teinte token.
 */
export function createStrokeLineMaterial(
  token: StrokeToken,
  extras?: THREE.LineBasicMaterialParameters
): THREE.LineBasicMaterial {
  return new THREE.LineBasicMaterial({
    color: token.color,
    transparent: true,
    opacity: token.opacity,
    ...extras,
  });
}

/** Trait FX additif. L’opacité animée se surchage via `extras`, la teinte reste le token. */
export function createFxLineMaterial(
  token: StrokeToken,
  extras?: THREE.LineBasicMaterialParameters
): THREE.LineBasicMaterial {
  return createStrokeLineMaterial(token, {
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    ...extras,
  });
}

/** Écart local (m) entre lèvre claire et lèvre sombre d’un panneau plat. */
export const DUAL_EDGE_OFFSET = 0.035;

/**
 * Paire clair / sombre pour un panneau sans extrude.
 * Les deux lignes partagent la géométrie ; le décalage est local Z.
 */
export function createDualEdgePair(
  geometry: THREE.BufferGeometry,
  light: StrokeToken = STROKE.frame,
  dark: StrokeToken = STROKE.seam
): { light: THREE.LineSegments; dark: THREE.LineSegments } {
  const lightLine = new THREE.LineSegments(geometry, createStrokeLineMaterial(light));
  const darkLine = new THREE.LineSegments(geometry, createStrokeLineMaterial(dark));
  lightLine.position.z = DUAL_EDGE_OFFSET * 0.5;
  darkLine.position.z = -DUAL_EDGE_OFFSET * 0.5;
  lightLine.raycast = () => {};
  darkLine.raycast = () => {};
  return { light: lightLine, dark: darkLine };
}

export function extrudeOptionsFromBevel(
  preset: BevelPreset,
  depthOverride?: number
): THREE.ExtrudeGeometryOptions {
  const depth = depthOverride ?? preset.depth ?? 0;
  if (!preset.bevelEnabled) {
    return { depth, bevelEnabled: false };
  }

  const options: THREE.ExtrudeGeometryOptions = {
    depth,
    bevelEnabled: true,
    bevelThickness: preset.bevelThickness,
    bevelSize: preset.bevelSize,
    bevelSegments: preset.bevelSegments,
  };
  if (preset.bevelOffset !== undefined) {
    options.bevelOffset = preset.bevelOffset;
  }
  if (preset.curveSegments !== undefined) {
    options.curveSegments = preset.curveSegments;
  }
  if (preset.steps !== undefined) {
    options.steps = preset.steps;
  }
  return options;
}
