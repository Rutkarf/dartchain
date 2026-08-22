import * as THREE from 'three';

import {
  disableOverlayOnCamera,
  enableOverlayOnCamera,
  MARSEILLE_OVERLAY_LAYER,
} from './overlay-layer';

describe('overlay-layer camera (phase B)', () => {
  it('ajoute le layer overlay sans éteindre le layer 0 gameplay', () => {
    const camera = new THREE.PerspectiveCamera();
    expect(camera.layers.isEnabled(0)).toBe(true);
    expect(camera.layers.isEnabled(MARSEILLE_OVERLAY_LAYER)).toBe(false);

    enableOverlayOnCamera(camera);
    expect(camera.layers.isEnabled(0)).toBe(true);
    expect(camera.layers.isEnabled(MARSEILLE_OVERLAY_LAYER)).toBe(true);

    disableOverlayOnCamera(camera);
    expect(camera.layers.isEnabled(0)).toBe(true);
    expect(camera.layers.isEnabled(MARSEILLE_OVERLAY_LAYER)).toBe(false);
  });
});
