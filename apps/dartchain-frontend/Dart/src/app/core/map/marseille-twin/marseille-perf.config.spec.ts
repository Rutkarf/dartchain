import { MARSEILLE_PERF_GOVERNOR } from './marseille-perf.config';

describe('marseille-perf.config (ITER-011)', () => {
  it('n impose pas de cap DPR tant que non branché', () => {
    expect(MARSEILLE_PERF_GOVERNOR.enforceDprCap).toBe(false);
    expect(MARSEILLE_PERF_GOVERNOR.maxDevicePixelRatio).toBe(1.75);
    expect(MARSEILLE_PERF_GOVERNOR.pauseWhenHidden).toBe(true);
  });
});
