import {
  CALIBRATION_DIAGNOSTICS_ENABLED,
  captureCalibrationSnapshot,
} from './calibration-diagnostics';

describe('calibration-diagnostics (ITER-017)', () => {
  it('reste off et ne repositionne pas le spawn', () => {
    expect(CALIBRATION_DIAGNOSTICS_ENABLED).toBe(false);
    const snap = captureCalibrationSnapshot();
    expect(snap.spawnApplyAtRuntime).toBe(false);
    expect(snap.originSourceId).toBe('osm-way-200273945');
    expect(snap.ombriereLengthDeltaMeters).toBeLessThan(0);
  });
});
