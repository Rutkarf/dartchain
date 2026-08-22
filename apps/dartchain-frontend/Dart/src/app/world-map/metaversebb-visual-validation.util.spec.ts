import { describe, expect, it } from 'vitest';

import { VIEUX_PORT_METRO_MIRROR_VIEW } from './map-configuration';
import {
  isMetroMirrorViewConfigured,
  metroMirrorValidationView,
} from './metaversebb-visual-validation.util';

describe('metaversebb-visual-validation.util Phase 6', () => {
  it('expose la vue miroir Vieux-Port', () => {
    const view = metroMirrorValidationView();
    expect(view.id).toBe(VIEUX_PORT_METRO_MIRROR_VIEW.id);
    expect(view.position.x).toBe(VIEUX_PORT_METRO_MIRROR_VIEW.position.x);
    expect(view.lookAt.z).toBe(VIEUX_PORT_METRO_MIRROR_VIEW.lookAt.z);
    expect(view.direction.length()).toBeCloseTo(1, 4);
  });

  it('valide la configuration caméra', () => {
    expect(isMetroMirrorViewConfigured()).toBe(true);
  });
});
