import { MIRROR_CANOPY } from '../vieux-port-mirror-canopy.util';
import {
  OMBRIERE_PUBLISHED_FOOTPRINT,
  ombriereGameplayDeviation,
} from './ombriere-reference';

describe('Ombrière reference (ITER-004)', () => {
  it('conserve la cible 46×22 sans muter le mesh gameplay', () => {
    expect(OMBRIERE_PUBLISHED_FOOTPRINT.lengthMeters).toBe(46);
    expect(OMBRIERE_PUBLISHED_FOOTPRINT.widthMeters).toBe(22);
    expect(OMBRIERE_PUBLISHED_FOOTPRINT.sourceQuality).toBe('APPROXIMATE');
    expect(MIRROR_CANOPY.width).toBe(18.4);
    expect(MIRROR_CANOPY.depth).toBe(12.2);
  });

  it('documente l écart gameplay vs cible (pas un resize)', () => {
    const deviation = ombriereGameplayDeviation();
    expect(deviation.baseGeometry).toBe('PLACEHOLDER');
    expect(deviation.lengthDeltaMeters).toBeCloseTo(18.4 - 46, 6);
    expect(deviation.widthDeltaMeters).toBeCloseTo(12.2 - 22, 6);
  });
});
