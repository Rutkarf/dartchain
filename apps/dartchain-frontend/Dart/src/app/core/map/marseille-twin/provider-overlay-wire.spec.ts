import { shouldAttachCyberpunkOverlay } from './cyberpunk-overlay.config';
import { overlayPickIsIsolated } from './overlay-pick-guard';
import { SPAWN_FACADE_OSM_ALIGN } from './spawn-facade-align.config';

describe('provider overlay wire (phase B)', () => {
  it('attache l overlay (flag on) sans activer l align façade OSM', () => {
    expect(shouldAttachCyberpunkOverlay('medium')).toBe(true);
    expect(shouldAttachCyberpunkOverlay('low')).toBe(false);
    expect(SPAWN_FACADE_OSM_ALIGN.enabled).toBe(false);
    expect(overlayPickIsIsolated()).toBe(true);
  });
});
