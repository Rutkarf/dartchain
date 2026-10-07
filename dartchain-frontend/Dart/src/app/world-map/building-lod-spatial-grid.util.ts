import type * as THREE from 'three';

/** Phase 22 — index spatial LOD bâtiments (cells → O(zone visible)). */
export class BuildingLodSpatialGrid {
  private readonly cells = new Map<string, THREE.Object3D[]>();
  private readonly buildingToCell = new Map<THREE.Object3D, string>();
  private count = 0;

  constructor(readonly cellSizeM: number) {}

  get size(): number {
    return this.count;
  }

  register(building: THREE.Object3D, centerX: number, centerZ: number): void {
    this.unregister(building);
    const key = this.cellKey(centerX, centerZ);
    let bucket = this.cells.get(key);
    if (!bucket) {
      bucket = [];
      this.cells.set(key, bucket);
    }
    bucket.push(building);
    this.buildingToCell.set(building, key);
    this.count++;
  }

  unregister(building: THREE.Object3D): void {
    const key = this.buildingToCell.get(building);
    if (!key) return;
    const bucket = this.cells.get(key);
    if (bucket) {
      const idx = bucket.indexOf(building);
      if (idx >= 0) bucket.splice(idx, 1);
      if (bucket.length === 0) this.cells.delete(key);
    }
    this.buildingToCell.delete(building);
    this.count = Math.max(0, this.count - 1);
  }

  clear(): void {
    this.cells.clear();
    this.buildingToCell.clear();
    this.count = 0;
  }

  /** Bâtiments dans les cellules intersectant le disque caméra + radiusM. */
  queryRadius(cameraX: number, cameraZ: number, radiusM: number): THREE.Object3D[] {
    if (this.count === 0) return [];

    const pad = Math.max(this.cellSizeM, radiusM);
    const minIx = Math.floor((cameraX - pad) / this.cellSizeM);
    const maxIx = Math.floor((cameraX + pad) / this.cellSizeM);
    const minIz = Math.floor((cameraZ - pad) / this.cellSizeM);
    const maxIz = Math.floor((cameraZ + pad) / this.cellSizeM);
    const radiusSq = radiusM * radiusM;
    const out: THREE.Object3D[] = [];

    for (let ix = minIx; ix <= maxIx; ix++) {
      for (let iz = minIz; iz <= maxIz; iz++) {
        const bucket = this.cells.get(`${ix},${iz}`);
        if (!bucket) continue;
        for (const building of bucket) {
          const cx = (building.userData['lodCenterX'] as number | undefined) ?? building.position.x;
          const cz = (building.userData['lodCenterZ'] as number | undefined) ?? building.position.z;
          const dx = cx - cameraX;
          const dz = cz - cameraZ;
          if (dx * dx + dz * dz <= radiusSq) {
            out.push(building);
          }
        }
      }
    }

    return out;
  }

  private cellKey(centerX: number, centerZ: number): string {
    const ix = Math.floor(centerX / this.cellSizeM);
    const iz = Math.floor(centerZ / this.cellSizeM);
    return `${ix},${iz}`;
  }
}
