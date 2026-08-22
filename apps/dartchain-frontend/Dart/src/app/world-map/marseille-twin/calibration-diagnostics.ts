import { MARSEILLE_GEO_ORIGIN } from '../geo-reference.config';
import { ombriereGameplayDeviation } from './ombriere-reference';
import { MARSEILLE_SPAWN_ANCHOR } from './marseille-spawn-anchor';

export const CALIBRATION_DIAGNOSTICS_ENABLED = false;

export interface CalibrationSnapshot {
  originSourceId: string;
  spawnApplyAtRuntime: false;
  ombriereLengthDeltaMeters: number;
  ombriereWidthDeltaMeters: number;
}

export function captureCalibrationSnapshot(): CalibrationSnapshot {
  const deviation = ombriereGameplayDeviation();
  return {
    originSourceId: MARSEILLE_GEO_ORIGIN.sourceId,
    spawnApplyAtRuntime: MARSEILLE_SPAWN_ANCHOR.applyAtRuntime,
    ombriereLengthDeltaMeters: deviation.lengthDeltaMeters,
    ombriereWidthDeltaMeters: deviation.widthDeltaMeters,
  };
}
