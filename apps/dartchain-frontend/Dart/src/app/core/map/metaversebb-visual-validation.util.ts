import * as THREE from 'three';

import { VIEUX_PORT_METRO_MIRROR_VIEW } from './map-configuration';

export interface VisualValidationView {
  id: string;
  position: THREE.Vector3;
  lookAt: THREE.Vector3;
  direction: THREE.Vector3;
}

/** Vecteurs caméra pour la vue miroir Vieux-Port (validation visuelle Phase 6). */
export function metroMirrorValidationView(): VisualValidationView {
  const view = VIEUX_PORT_METRO_MIRROR_VIEW;
  const position = new THREE.Vector3(view.position.x, view.position.y, view.position.z);
  const lookAt = new THREE.Vector3(view.lookAt.x, view.lookAt.y, view.lookAt.z);
  const direction = lookAt.clone().sub(position).normalize();
  return { id: view.id, position, lookAt, direction };
}

/** Sanity check — position élevée, regard vers le quai/spawn. */
export function isMetroMirrorViewConfigured(): boolean {
  const { position, lookAt, direction } = metroMirrorValidationView();
  return (
    position.y >= 10 &&
    lookAt.y <= position.y &&
    direction.lengthSq() > 0.99 &&
    direction.lengthSq() < 1.01
  );
}
