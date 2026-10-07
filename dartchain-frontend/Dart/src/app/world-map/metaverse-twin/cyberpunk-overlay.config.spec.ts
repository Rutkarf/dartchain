import {
  METAVERSE_CYBERPUNK_OVERLAY,
  shouldAttachCyberpunkOverlay,
} from './cyberpunk-overlay.config';
import { overlayPickIsIsolated } from './overlay-pick-guard';

describe('cyberpunk-overlay.config (phase B)', () => {
  it('attache l overlay visuel sans changer la géométrie des rues', () => {
    expect(METAVERSE_CYBERPUNK_OVERLAY.enabled).toBe(true);
    expect(METAVERSE_CYBERPUNK_OVERLAY.geometricDeviation).toBe('CYBERPUNK_VISUAL_ONLY');
    expect(METAVERSE_CYBERPUNK_OVERLAY.layerName).toBe('metaverse-cyberpunk-overlay');
    expect(shouldAttachCyberpunkOverlay('medium')).toBe(true);
    expect(shouldAttachCyberpunkOverlay('high')).toBe(true);
    expect(shouldAttachCyberpunkOverlay('low')).toBe(true);
    expect(shouldAttachCyberpunkOverlay('ultra-low')).toBe(true);
  });

  it('reste isolé du raycast placements RDC', () => {
    expect(overlayPickIsIsolated()).toBe(true);
  });
});
