import * as THREE from 'three';

import { MARSEILLE_CYBERPUNK_OVERLAY } from './cyberpunk-overlay.config';
import { OverlayResourceRegistry } from './overlay-resource-registry';
import { shopsEastNeonSignageZones } from './neon-signage-zones';
import { MARSEILLE_OVERLAY_LAYER } from './overlay-layer';
import { DEFAULT_OVERLAY_PICK } from './building-pick.metadata';

export interface CyberpunkOverlayBuild {
  group: THREE.Group;
  registry: OverlayResourceRegistry;
}

const OVERLAY_LAYER = MARSEILLE_OVERLAY_LAYER;

/**
 * Factory overlay — n’altère pas les meshes bâtiments existants.
 * Accents émissifs sur zones enseigne OSM, dispose via registry.
 */
export function createCyberpunkOverlayGroup(
  enabled: boolean = MARSEILLE_CYBERPUNK_OVERLAY.enabled
): CyberpunkOverlayBuild {
  const registry = new OverlayResourceRegistry();
  const group = new THREE.Group();
  group.name = MARSEILLE_CYBERPUNK_OVERLAY.layerName;
  group.userData['cyberpunkOverlay'] = true;
  group.userData['enabled'] = enabled;
  group.userData['pick'] = DEFAULT_OVERLAY_PICK;
  group.layers.set(OVERLAY_LAYER);
  guardAgainstRaycast(group);

  if (!enabled) {
    return { group, registry };
  }

  const geo = registry.trackGeometry(new THREE.PlaneGeometry(1.6, 0.85));
  const mat = registry.trackMaterial(
    new THREE.MeshBasicMaterial({
      color: 0x40e0ff,
      transparent: true,
      opacity: MARSEILLE_CYBERPUNK_OVERLAY.hologramOpacity,
      depthWrite: false,
      toneMapped: false,
    })
  );

  const zones = shopsEastNeonSignageZones();
  const samples = zones.length > 0 ? zones : [{ x: 0, y: 3.2, z: -4.8, id: 'fallback' }];
  for (const zone of samples) {
    const hologram = new THREE.Mesh(geo, mat);
    hologram.name = `marseille-cyberpunk-hologram-${zone.id}`;
    hologram.position.set(zone.x, zone.y, zone.z);
    hologram.layers.set(OVERLAY_LAYER);
    hologram.renderOrder = 4;
    guardAgainstRaycast(hologram);
    group.add(hologram);
  }
  return { group, registry };
}

export function disposeCyberpunkOverlay(build: CyberpunkOverlayBuild): void {
  build.group.removeFromParent();
  build.registry.dispose();
}

function guardAgainstRaycast(object: THREE.Object3D): void {
  object.raycast = () => undefined;
}
