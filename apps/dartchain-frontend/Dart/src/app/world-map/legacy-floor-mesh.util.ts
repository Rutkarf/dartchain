import * as THREE from 'three';

/** Noir plein — aligné fond app. */
const SCENE_BG = 0x000000;

export interface LegacyFloorMeshes {
  floor: THREE.Mesh;
  floorTexture: THREE.CanvasTexture;
  pathLine: THREE.Line;
}

/**
 * Sol procédural « neon-floor » + ligne de chemin (comportement historique).
 * Extrait de ThreeFloor pour réutilisation par LegacyFloorMapProvider.
 */
export function createLegacyFloorMeshes(scene: THREE.Scene): LegacyFloorMeshes {
  const floorTexture = createDenseGridTexture();
  floorTexture.wrapS = THREE.RepeatWrapping;
  floorTexture.wrapT = THREE.RepeatWrapping;
  floorTexture.repeat.set(48, 48);
  floorTexture.anisotropy = 1;
  floorTexture.generateMipmaps = false;
  floorTexture.minFilter = THREE.LinearFilter;
  floorTexture.magFilter = THREE.LinearFilter;
  floorTexture.colorSpace = THREE.SRGBColorSpace;

  const floorMaterial = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    map: floorTexture,
    side: THREE.FrontSide,
    transparent: false,
    opacity: 1,
  });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), floorMaterial);
  floor.name = 'neon-floor';
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.receiveShadow = false;
  scene.add(floor);

  const pathGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0.08, 5),
    new THREE.Vector3(0, 0.08, -40),
  ]);
  const pathLine = new THREE.Line(
    pathGeo,
    new THREE.LineBasicMaterial({
      color: 0x111111,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    })
  );
  pathLine.name = 'path-line';
  pathLine.raycast = () => {};
  scene.add(pathLine);

  return { floor, floorTexture, pathLine };
}

export function disposeLegacyFloorMeshes(
  scene: THREE.Scene,
  meshes: LegacyFloorMeshes | null
): void {
  if (!meshes) return;

  scene.remove(meshes.floor);
  meshes.floor.geometry.dispose();
  (meshes.floor.material as THREE.Material).dispose();
  meshes.floorTexture.dispose();

  scene.remove(meshes.pathLine);
  meshes.pathLine.geometry.dispose();
  (meshes.pathLine.material as THREE.Material).dispose();
}

function createDenseGridTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#f4f4f4';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.38)';
  ctx.lineWidth = 1;
  const step = size / 8;
  for (let i = 0; i <= 8; i++) {
    const p = i * step + 0.5;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(size, p);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.beginPath();
  ctx.moveTo(0.5, 0);
  ctx.lineTo(0.5, size);
  ctx.moveTo(0, 0.5);
  ctx.lineTo(size, 0.5);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.lineWidth = 1.25;
  ctx.strokeRect(0.5, 0.5, size - 1, size - 1);
  ctx.strokeStyle = 'rgba(20, 20, 20, 0.5)';
  ctx.beginPath();
  ctx.moveTo(size * 0.5 + 0.5, 0);
  ctx.lineTo(size * 0.5 + 0.5, size);
  ctx.moveTo(0, size * 0.5 + 0.5);
  ctx.lineTo(size, size * 0.5 + 0.5);
  ctx.stroke();
  return new THREE.CanvasTexture(canvas);
}

/** Ré-export pour cohérence couleur de fond (tests / debug). */
export const LEGACY_FLOOR_SCENE_BG = SCENE_BG;
