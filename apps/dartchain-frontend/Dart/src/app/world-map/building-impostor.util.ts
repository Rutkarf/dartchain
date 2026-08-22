import * as THREE from 'three';

import type { BuildingLodLevel } from './marseille-twin/building-lod.model';

export const IMPOSTOR_NAME = 'building-lod-impostor-billboard';

/** Billboard low-cost — Phase 14 impostor LOD. */
export function syncBuildingImpostor(
  group: THREE.Object3D,
  lod: BuildingLodLevel,
  options?: { width?: number; height?: number; color?: number }
): void {
  let impostor = group.getObjectByName(IMPOSTOR_NAME) as THREE.Mesh | null;

  if (lod !== 'impostor') {
    if (impostor) impostor.visible = false;
    return;
  }

  const width =
    options?.width ??
    (group.userData['impostorWidth'] as number | undefined) ??
    12;
  const height =
    options?.height ??
    (group.userData['heightMeters'] as number | undefined) ??
    14;
  const color = options?.color ?? 0x8a9aa8;

  if (!impostor) {
    const geo = new THREE.PlaneGeometry(width, height);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      fog: true,
    });
    impostor = new THREE.Mesh(geo, mat);
    impostor.name = IMPOSTOR_NAME;
    impostor.position.y = height * 0.5;
    group.add(impostor);
    group.userData['impostorMesh'] = impostor;
  }

  impostor.visible = true;
  const cx = (group.userData['lodCenterX'] as number | undefined) ?? group.position.x;
  const cz = (group.userData['lodCenterZ'] as number | undefined) ?? group.position.z;
  impostor.lookAt(cx, impostor.position.y, cz + 40);
}

export function disposeBuildingImpostor(group: THREE.Object3D): void {
  const impostor = group.getObjectByName(IMPOSTOR_NAME) as THREE.Mesh | null;
  if (!impostor) return;
  impostor.geometry.dispose();
  (impostor.material as THREE.Material).dispose();
  group.remove(impostor);
}
