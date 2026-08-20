/**
 * Configuration locale des contrôles Star Conquest (pan monde).
 * Valeurs = comportement historique de `StarConquestWorld` / HorizonJoystick.
 */

export interface StarConquestControlsConfig {
  stickDeadzone: number;
  panSpeed: number;
  tapDragThresholdPx: number;
  pointerCancelResetsStick: boolean;
  blurResetsStick: boolean;
  visibilityHiddenResetsStick: boolean;
  recenterOnRelease: boolean;
  panStickSizePx: number;
  keyboardPanStep: number;
}

export const STAR_CONQUEST_CONTROLS: StarConquestControlsConfig = {
  stickDeadzone: 0.04,
  panSpeed: 66,
  tapDragThresholdPx: 7,
  pointerCancelResetsStick: true,
  blurResetsStick: true,
  visibilityHiddenResetsStick: true,
  recenterOnRelease: true,
  panStickSizePx: 44,
  keyboardPanStep: 0.55,
};
