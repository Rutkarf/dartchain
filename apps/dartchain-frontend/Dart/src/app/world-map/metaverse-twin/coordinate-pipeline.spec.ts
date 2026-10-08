import { GEO_REFERENCE_CONFIG } from '../geo-reference.config';
import {
  METAVERSE_COORDINATE_PIPELINE,
  pipelineMetersPerDegreeLongitude,
} from './coordinate-pipeline';

describe('coordinate-pipeline (ITER-005)', () => {
  it('fixe 1 unité Three.js = 1 mètre', () => {
    expect(METAVERSE_COORDINATE_PIPELINE.threeJsWorldUnitEqualsMeters).toBe(true);
    expect(METAVERSE_COORDINATE_PIPELINE.metersPerWorldUnit).toBe(1);
    expect(METAVERSE_COORDINATE_PIPELINE.metersPerWorldUnit).toBe(
      GEO_REFERENCE_CONFIG.metersPerWorldUnit
    );
  });

  it('aligne les axes est=+X nord=−Z', () => {
    expect(METAVERSE_COORDINATE_PIPELINE.axis.east).toBe('x');
    expect(METAVERSE_COORDINATE_PIPELINE.axis.north).toBe('-z');
    expect(METAVERSE_COORDINATE_PIPELINE.axis.up).toBe('y');
    expect(METAVERSE_COORDINATE_PIPELINE.northRotationRadians).toBe(0);
  });

  it('expose le facteur longitude à l origine Ombrière', () => {
    const metersLon = pipelineMetersPerDegreeLongitude();
    expect(metersLon).toBeGreaterThan(80_000);
    expect(metersLon).toBeLessThan(90_000);
  });
});
