/**
 * Couche Three.js exclusive overlay. Le monde gameplay reste sur le layer 0.
 * Le provider active ce canal sur la caméra passée à initialize() — pas CameraControlService.
 */
export const MARSEILLE_OVERLAY_LAYER = 1;

export function enableOverlayOnCamera(camera: { layers: { enable: (n: number) => void } }): void {
  camera.layers.enable(MARSEILLE_OVERLAY_LAYER);
}

export function disableOverlayOnCamera(camera: { layers: { disable: (n: number) => void } }): void {
  camera.layers.disable(MARSEILLE_OVERLAY_LAYER);
}
