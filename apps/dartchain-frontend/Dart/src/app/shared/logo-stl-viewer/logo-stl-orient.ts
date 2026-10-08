/**
 * Orientation logo.stl — pointe du rebord à 6h (bas), face caméra.
 * Tip max-R sur -Y (spin parent Y la maintient en bas).
 * Le « R » se lit de face ; le stem suit l’axe tip bas ↔ haut.
 *
 * Appliquer `LOGO_TIP6_EULER` sur le mesh, puis `LOGO_TIP6_PITCH` sur un parent
 * (launch). Pitch ≤ ~0.05 rad pour ne pas remonter la pointe.
 */
export const LOGO_TIP6_EULER = {
  x: 1.570796,
  y: 0.490476,
  z: -1.570796,
} as const;

/** Pitch parent autour de X — léger, face lisible. */
export const LOGO_TIP6_PITCH = -0.05;
