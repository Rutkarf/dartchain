import { describe, expect, it, beforeEach } from 'vitest';

import {
  DualContextGovernorService,
  SC_IDLE_SIM_INTERVAL_MS,
  SC_IDLE_SIM_INTERVAL_OSM_MS,
  effectiveMapIdleTickSkip,
  scaledStreamCheckIntervalMs,
  shouldRunScActiveSimTick,
} from './dual-context-governor.service';

describe('DualContextGovernorService Phase 21', () => {
  let governor: DualContextGovernorService;

  beforeEach(() => {
    governor = new DualContextGovernorService();
  });

  it('dual actif scale le streaming OSM', () => {
    const hints = governor.prepareFrame(true, false);
    expect(hints.streamIntervalScale).toBe(1.5);
    expect(scaledStreamCheckIntervalMs(8000, hints.streamIntervalScale)).toBe(12000);
  });

  it('batch OSM ralentit sim SC idle et boost map idle skip', () => {
    governor.beginOsmBatch();
    const hints = governor.prepareFrame(true, false);
    expect(hints.osmBatchActive).toBe(true);
    expect(hints.scIdleSimIntervalMs).toBe(SC_IDLE_SIM_INTERVAL_OSM_MS);
    expect(hints.mapIdleTickSkipBoost).toBe(1);
    expect(effectiveMapIdleTickSkip(1, hints.mapIdleTickSkipBoost)).toBe(2);
    governor.endOsmBatch();
    expect(governor.osmBatchActive).toBe(false);
  });

  it('stick SC + floor moving décime sim SC active', () => {
    governor.setScWorldNavigating(true);
    governor.setFloorAvatarMoving(true);
    const hints = governor.prepareFrame(true, false);
    expect(hints.decimateScActiveSim).toBe(true);
    expect(shouldRunScActiveSimTick(0, hints.decimateScActiveSim)).toBe(true);
    expect(shouldRunScActiveSimTick(1, hints.decimateScActiveSim)).toBe(false);
  });

  it('overBudget reporte sim SC idle', () => {
    const hints = governor.prepareFrame(true, true);
    expect(hints.deferScIdleSim).toBe(true);
  });

  it('hors dual conserve intervalle SC idle par défaut', () => {
    const hints = governor.prepareFrame(false, false);
    expect(hints.scIdleSimIntervalMs).toBe(SC_IDLE_SIM_INTERVAL_MS);
    expect(hints.streamIntervalScale).toBe(1);
  });
});
