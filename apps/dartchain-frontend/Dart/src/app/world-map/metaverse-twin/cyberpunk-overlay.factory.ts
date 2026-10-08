import * as THREE from 'three';
import { createDualEdgePair, STROKE } from '../../core/constants/stroke-bevel';

import { METAVERSE_CYBERPUNK_OVERLAY } from './cyberpunk-overlay.config';
import { OverlayResourceRegistry } from './overlay-resource-registry';
import { shopsEastNeonSignageZones } from './neon-signage-zones';
import { METAVERSE_OVERLAY_LAYER } from './overlay-layer';
import { DEFAULT_OVERLAY_PICK } from './building-pick.metadata';

export interface CyberpunkOverlayBuild {
  group: THREE.Group;
  registry: OverlayResourceRegistry;
}

const OVERLAY_LAYER = METAVERSE_OVERLAY_LAYER;

/**
 * Factory overlay — n’altère pas les meshes bâtiments existants.
 * Accents émissifs sur zones enseigne OSM, dispose via registry.
 */
export function createCyberpunkOverlayGroup(
  enabled: boolean = METAVERSE_CYBERPUNK_OVERLAY.enabled
): CyberpunkOverlayBuild {
  const registry = new OverlayResourceRegistry();
  const group = new THREE.Group();
  group.name = METAVERSE_CYBERPUNK_OVERLAY.layerName;
  group.userData['cyberpunkOverlay'] = true;
  group.userData['enabled'] = enabled;
  group.userData['pick'] = DEFAULT_OVERLAY_PICK;
  group.layers.set(OVERLAY_LAYER);
  guardAgainstRaycast(group);

  if (!enabled) {
    return { group, registry };
  }

  const geo = registry.trackGeometry(new THREE.PlaneGeometry(1.6, 0.85));
  const edges = registry.trackGeometry(new THREE.EdgesGeometry(geo));
  const lip = createDualEdgePair(edges, STROKE.default, STROKE.seam);
  registry.trackMaterial(lip.light.material as THREE.Material);
  registry.trackMaterial(lip.dark.material as THREE.Material);
  const mat = registry.trackMaterial(
    new THREE.MeshBasicMaterial({
      color: 0x8a95a5,
      transparent: true,
      opacity: METAVERSE_CYBERPUNK_OVERLAY.hologramOpacity,
      depthWrite: false,
      toneMapped: false,
    })
  );

  const zones = shopsEastNeonSignageZones();
  const samples = zones.length > 0 ? zones : [{ x: 0, y: 3.2, z: -4.8, id: 'fallback' }];
  for (const zone of samples) {
    const hologram = new THREE.Mesh(geo, mat);
    hologram.name = `metaverse-cyberpunk-hologram-${zone.id}`;
    hologram.position.set(zone.x, zone.y, zone.z);
    hologram.layers.set(OVERLAY_LAYER);
    hologram.renderOrder = 4;
    guardAgainstRaycast(hologram);
    const light = new THREE.LineSegments(edges, lip.light.material);
    const dark = new THREE.LineSegments(edges, lip.dark.material);
    light.position.z = lip.light.position.z;
    dark.position.z = lip.dark.position.z;
    light.name = `metaverse-cyberpunk-edge-light-${zone.id}`;
    dark.name = `metaverse-cyberpunk-edge-dark-${zone.id}`;
    light.layers.set(OVERLAY_LAYER);
    dark.layers.set(OVERLAY_LAYER);
    guardAgainstRaycast(light);
    guardAgainstRaycast(dark);
    hologram.add(light, dark);
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
