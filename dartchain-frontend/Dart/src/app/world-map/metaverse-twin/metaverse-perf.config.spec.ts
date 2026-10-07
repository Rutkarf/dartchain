import { METAVERSE_PERF_GOVERNOR } from './metaverse-perf.config';

describe('metaverse-perf.config (ITER-011)', () => {
  it('n impose pas de cap DPR tant que non branché', () => {
    expect(METAVERSE_PERF_GOVERNOR.enforceDprCap).toBe(false);
    expect(METAVERSE_PERF_GOVERNOR.maxDevicePixelRatio).toBe(1.75);
    expect(METAVERSE_PERF_GOVERNOR.pauseWhenHidden).toBe(true);
  });
});
