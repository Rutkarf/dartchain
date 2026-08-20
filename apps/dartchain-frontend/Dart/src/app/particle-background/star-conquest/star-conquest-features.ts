/**
 * Flags locaux Star Conquest.
 * `overlayHud` est OFF : le bandeau haut a été retiré à la demande produit.
 */

export interface StarConquestFeatureFlags {
  overlayHud: boolean;
  overlayHelp: boolean;
  panStick: boolean;
  /** Drag canvas = pan orbite (masque l’overlay stick, contrat stick conservé). */
  canvasOrbit: boolean;
  keyboardPan: boolean;
  reducedMotionCss: boolean;
  diagnostics: boolean;
  cameraResetControl: boolean;
}

export const STAR_CONQUEST_FEATURES: StarConquestFeatureFlags = {
  overlayHud: false,
  overlayHelp: true,
  panStick: true,
  canvasOrbit: true,
  keyboardPan: true,
  reducedMotionCss: true,
  diagnostics: true,
  cameraResetControl: true,
};

export function starConquestFeatureEnabled(
  key: keyof StarConquestFeatureFlags,
  flags: StarConquestFeatureFlags = STAR_CONQUEST_FEATURES
): boolean {
  return flags[key] !== false;
}
