import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { measureStarConquestRenderBand } from './star-conquest-viewport-band.util';

describe('star-conquest-viewport-band Phase 26', () => {
  beforeEach(() => {
    vi.stubGlobal('document', {
      querySelector: vi.fn(() => null),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('exclut la bande floor du raster SC', () => {
    const band = measureStarConquestRenderBand(250, 550, 220);
    expect(band.fullWidth).toBe(250);
    expect(band.fullHeight).toBe(550);
    expect(band.bandHeight).toBe(330);
    expect(band.floorOcclusionPx).toBe(220);
  });
});
