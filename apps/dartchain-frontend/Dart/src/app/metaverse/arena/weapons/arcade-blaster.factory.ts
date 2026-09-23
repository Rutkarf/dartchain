import * as THREE from 'three';

/** Fusil arcade futuriste low-poly — fictionnel, non identifiable. */
export function createArcadeBlasterGroup(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'bb-pulse-rifle';

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x1e2228,
    metalness: 0.35,
    roughness: 0.55,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: 0xa04078,
    emissive: 0x501030,
    emissiveIntensity: 0.35,
    metalness: 0.15,
    roughness: 0.45,
  });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.55), bodyMat);
  body.position.set(0, 0, 0.12);
  group.add(body);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.42, 6), bodyMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.02, -0.28);
  group.add(barrel);

  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.18), bodyMat);
  stock.position.set(0, -0.02, 0.42);
  group.add(stock);

  const glow = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.08), accentMat);
  glow.position.set(0, 0.08, -0.05);
  group.add(glow);

  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.castShadow = false;
      obj.receiveShadow = false;
    }
  });

  return group;
}

export function disposeArcadeBlaster(group: THREE.Group | null | undefined): void {
  if (!group) return;
  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry?.dispose();
      const mat = obj.material;
      if (Array.isArray(mat)) {
        mat.forEach((m) => m.dispose());
      } else {
        mat?.dispose();
      }
    }
  });
  group.clear();
}
