import * as THREE from 'three';

import type { BuildingLodLevel } from './marseille-twin/building-lod.model';
import { IMPOSTOR_NAME, syncBuildingImpostor } from './building-impostor.util';

const DETAIL_NAME =
  /-(cornice|plinth|parapet|roof)$|facade-|roof-beacon|storefront|ground-glass|synthwave|landmark-/i;

/** Applique visibilité LOD sur un groupe bâtiment (Phase 3 + 14 impostor + 16 cache). */
export function applyBuildingLodLevel(group: THREE.Object3D, lod: BuildingLodLevel): void {
  const cached = group.userData['lodLevel'] as BuildingLodLevel | undefined;
  if (cached === lod) return;
  group.userData['lodLevel'] = lod;

  if (lod === 'culled') {
    group.visible = false;
    syncBuildingImpostor(group, lod);
    return;
  }

  group.visible = true;

  if (lod === 'impostor') {
    group.traverse((obj: THREE.Object3D) => {
      if (obj === group) return;
      if (obj.name === IMPOSTOR_NAME) return;
      obj.visible = false;
    });
    syncBuildingImpostor(group, lod);
    return;
  }

  syncBuildingImpostor(group, 'full');

  group.traverse((obj: THREE.Object3D) => {
    if (obj === group) return;
    if (lod === 'full') {
      obj.visible = true;
      return;
    }

    const name = obj.name;
    if (lod === 'massing') {
      obj.visible = !DETAIL_NAME.test(name);
      return;
    }
  });
}

export function buildingLodDistanceFrom(
  group: THREE.Object3D,
  cameraX: number,
  cameraZ: number
): number {
  const cx = (group.userData['lodCenterX'] as number | undefined) ?? group.position.x;
  const cz = (group.userData['lodCenterZ'] as number | undefined) ?? group.position.z;
  return Math.hypot(cx - cameraX, cz - cameraZ);
}

export function tagBuildingLodCenter(group: THREE.Object3D, centerX: number, centerZ: number): void {
  group.userData['lodCenterX'] = centerX;
  group.userData['lodCenterZ'] = centerZ;
}
