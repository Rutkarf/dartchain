import {
  MARSEILLE_CYBERPUNK_OVERLAY,
  shouldAttachCyberpunkOverlay,
} from './cyberpunk-overlay.config';
import { overlayPickIsIsolated } from './overlay-pick-guard';

describe('cyberpunk-overlay.config (phase B)', () => {
  it('attache l overlay visuel sans changer la géométrie des rues', () => {
    expect(MARSEILLE_CYBERPUNK_OVERLAY.enabled).toBe(true);
    expect(MARSEILLE_CYBERPUNK_OVERLAY.geometricDeviation).toBe('CYBERPUNK_VISUAL_ONLY');
    expect(MARSEILLE_CYBERPUNK_OVERLAY.layerName).toBe('marseille-cyberpunk-overlay');
    expect(shouldAttachCyberpunkOverlay()).toBe(true);
  });

  it('reste isolé du raycast placements RDC', () => {
    expect(overlayPickIsIsolated()).toBe(true);
  });
});
