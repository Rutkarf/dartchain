import { describe, expect, it } from 'vitest';

import {
  GROUND_SURFACE_LEVELS,
  boxCenterYForTop,
  groundTopY,
} from './ground-surface.config';
import {
  classifyGroundSurface,
  groundSurfaceHitAt,
  roadSidewalkStepMeters,
} from './ground-surface.util';

describe('ground-surface (Phase 1)', () => {
  it('crée un décalage route / trottoir lisible (≥ 10 cm)', () => {
    const step = roadSidewalkStepMeters();
    expect(step).toBeGreaterThanOrEqual(0.1);
    expect(groundTopY('road')).toBeLessThan(groundTopY('sidewalk'));
  });

  it('classe la route au centre Canebière', () => {
    expect(classifyGroundSurface(0, -40)).toBe('road');
  });

  it('classe le trottoir latéral Canebière', () => {
    expect(classifyGroundSurface(-30, -40)).toBe('sidewalk');
  });

  it('classe l esplanade Ombrière', () => {
    expect(classifyGroundSurface(0, 0)).toBe('esplanade');
  });

  it('retourne la hauteur gameplay esplanade', () => {
    const hit = groundSurfaceHitAt(0, 0);
    expect(hit.kind).toBe('esplanade');
    expect(hit.topY).toBe(GROUND_SURFACE_LEVELS.esplanadeTopY);
  });

  it('positionne le centre de box sous le dessus', () => {
    const center = boxCenterYForTop(groundTopY('road'), 0.22);
    expect(center).toBeCloseTo(groundTopY('road') - 0.11, 4);
  });
});
