import { METAVERSE_GEO_ORIGIN } from '../geo-reference.config';
import { ombriereGameplayDeviation } from './ombriere-reference';
import { METAVERSE_SPAWN_ANCHOR } from './metaverse-spawn-anchor';

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
    originSourceId: METAVERSE_GEO_ORIGIN.sourceId,
    spawnApplyAtRuntime: METAVERSE_SPAWN_ANCHOR.applyAtRuntime,
    ombriereLengthDeltaMeters: deviation.lengthDeltaMeters,
    ombriereWidthDeltaMeters: deviation.widthDeltaMeters,
  };
}
