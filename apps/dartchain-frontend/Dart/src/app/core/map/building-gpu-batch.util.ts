import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

import type { BuildingLodLevel } from './marseille-twin/building-lod.model';

const BATCH_NAME_PREFIX = 'ground-osm-batched-';
const MERGE_NAME_PREFIXES = ['ground-osm-poly-', 'ground-osm-curb-'] as const;

export interface GroundBatchResult {
  mergedMeshes: number;
  sourceMeshes: number;
}

/**
 * Phase 24 — fusion sol OSM par matériau (même visuel, moins de draw calls).
 */
export function batchGroundMeshesByMaterial(root: THREE.Group): GroundBatchResult {
  try {
    return batchGroundMeshesByMaterialInner(root);
  } catch (err) {
    console.warn('[BuildingGpuBatch] Fusion sol OSM ignorée (fallback meshes individuels).', err);
    return { mergedMeshes: 0, sourceMeshes: 0 };
  }
}

function batchGroundMeshesByMaterialInner(root: THREE.Group): GroundBatchResult {
  root.updateMatrixWorld(true);
  const invRoot = new THREE.Matrix4().copy(root.matrixWorld).invert();

  const buckets = new Map<
    string,
    { material: THREE.Material; geometries: THREE.BufferGeometry[] }
  >();
  const toRemove: THREE.Mesh[] = [];

  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    if (!MERGE_NAME_PREFIXES.some((prefix) => obj.name.startsWith(prefix))) return;

    const material = obj.material as THREE.Material;
    const key = material.uuid;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { material, geometries: [] };
      buckets.set(key, bucket);
    }

    const geo = obj.geometry.clone();
    const local = new THREE.Matrix4().multiplyMatrices(invRoot, obj.matrixWorld);
    geo.applyMatrix4(local);
    bucket.geometries.push(geo);
    toRemove.push(obj);
  });

  if (toRemove.length === 0) {
    return { mergedMeshes: 0, sourceMeshes: 0 };
  }

  let mergedMeshes = 0;
  for (const [key, bucket] of buckets) {
    if (bucket.geometries.length === 0) continue;
    const merged =
      bucket.geometries.length === 1
        ? bucket.geometries[0]!
        : mergeGeometries(bucket.geometries, false);
    if (!merged) continue;

    for (const geo of bucket.geometries) {
      if (geo !== merged) geo.dispose();
    }

    const mesh = new THREE.Mesh(merged, bucket.material);
    mesh.name = `${BATCH_NAME_PREFIX}${key.slice(0, 8)}`;
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    root.add(mesh);
    mergedMeshes++;
  }

  for (const mesh of toRemove) {
    root.remove(mesh);
    mesh.geometry.dispose();
  }

  return { mergedMeshes, sourceMeshes: toRemove.length };
}

interface MassingBatchEntry {
  group: THREE.Object3D;
  batchMaterialKey: string;
  instanceIndex: number;
  wallMesh: THREE.Mesh;
  roofMesh: THREE.Mesh | null;
}

/** Phase 24 — massing OSM via InstancedMesh (1 DC / matériau au lieu de N). */
export class BuildingMassingInstancedPool {
  private readonly pools = new Map<string, THREE.InstancedMesh>();
  private readonly entries = new Map<THREE.Object3D, MassingBatchEntry>();
  private readonly freeSlots = new Map<string, number[]>();
  private readonly dummy = new THREE.Object3D();
  private readonly hiddenMatrix = new THREE.Matrix4().makeScale(0, 0, 0);

  constructor(
    private readonly root: THREE.Group,
    private readonly maxInstancesPerMaterial = 4096
  ) {}

  get activePools(): number {
    return this.pools.size;
  }

  get batchedBuildingCount(): number {
    return this.entries.size;
  }

  register(group: THREE.Object3D): void {
    if (this.entries.has(group)) return;
    if (group.userData['heroLandmark'] === true || group.userData['visualTier'] === 'hero') {
      return;
    }
    if (group.userData['skylineLandmark'] === true) return;

    const wallMesh = findPrimaryWallMesh(group);
    if (!wallMesh) return;

    const sourceMaterial = wallMesh.material as THREE.Material;
    const batchMaterial = cloneMaterialForInstancing(sourceMaterial);
    const pool = this.ensurePool(batchMaterial);
    const instanceIndex = this.allocateSlot(pool);
    if (instanceIndex < 0) return;

    const bounds = new THREE.Box3().setFromObject(wallMesh);
    const size = bounds.getSize(new THREE.Vector3());
    group.userData['massingWidth'] = Math.max(2, size.x);
    group.userData['massingDepth'] = Math.max(2, size.z);

    const roofMesh =
      (group.getObjectByName(`${group.name}-roof`) as THREE.Mesh | null) ??
      group.children.find(
        (c) => c instanceof THREE.Mesh && String(c.name).endsWith('-roof')
      ) ??
      null;

    this.entries.set(group, {
      group,
      batchMaterialKey: batchMaterial.uuid,
      instanceIndex,
      wallMesh,
      roofMesh: roofMesh instanceof THREE.Mesh ? roofMesh : null,
    });
    pool.setMatrixAt(instanceIndex, this.hiddenMatrix);
    pool.instanceMatrix.needsUpdate = true;
  }

  unregister(group: THREE.Object3D): void {
    const entry = this.entries.get(group);
    if (!entry) return;
    const pool = this.pools.get(entry.batchMaterialKey);
    if (pool) {
      this.releaseSlot(pool, entry.instanceIndex);
    }
    this.entries.delete(group);
  }

  /** Après applyBuildingLodLevel — remplace wall/roof par instance en massing. */
  syncLod(group: THREE.Object3D, lod: BuildingLodLevel): void {
    try {
      this.syncLodInner(group, lod);
    } catch (err) {
      console.warn('[BuildingGpuBatch] syncLod ignoré pour', group.name, err);
    }
  }

  private syncLodInner(group: THREE.Object3D, lod: BuildingLodLevel): void {
    const entry = this.entries.get(group);
    if (!entry) return;

    const pool = this.pools.get(entry.batchMaterialKey);
    if (!pool) return;

    if (lod === 'massing') {
      entry.wallMesh.visible = false;
      if (entry.roofMesh) entry.roofMesh.visible = false;
      this.writeMassingMatrix(group, entry, pool);
      return;
    }

    pool.setMatrixAt(entry.instanceIndex, this.hiddenMatrix);
    pool.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    for (const pool of this.pools.values()) {
      pool.geometry.dispose();
      (pool.material as THREE.Material).dispose();
      this.root.remove(pool);
    }
    this.pools.clear();
    this.entries.clear();
    this.freeSlots.clear();
  }

  private writeMassingMatrix(
    group: THREE.Object3D,
    entry: MassingBatchEntry,
    pool: THREE.InstancedMesh
  ): void {
    const cx = (group.userData['lodCenterX'] as number | undefined) ?? group.position.x;
    const cz = (group.userData['lodCenterZ'] as number | undefined) ?? group.position.z;
    const h = (group.userData['heightMeters'] as number | undefined) ?? 12;
    const w = (group.userData['massingWidth'] as number | undefined) ?? 10;
    const d = (group.userData['massingDepth'] as number | undefined) ?? 10;

    this.dummy.position.set(cx, h * 0.5, cz);
    this.dummy.rotation.set(0, 0, 0);
    this.dummy.scale.set(w, h, d);
    this.dummy.updateMatrix();
    pool.setMatrixAt(entry.instanceIndex, this.dummy.matrix);
    pool.instanceMatrix.needsUpdate = true;
  }

  private ensurePool(material: THREE.Material): THREE.InstancedMesh {
    const key = material.uuid;
    let pool = this.pools.get(key);
    if (!pool) {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      pool = new THREE.InstancedMesh(geometry, material, this.maxInstancesPerMaterial);
      pool.name = `building-massing-instanced-${key.slice(0, 8)}`;
      pool.count = 0;
      pool.frustumCulled = true;
      pool.castShadow = false;
      pool.receiveShadow = false;
      this.root.add(pool);
      this.pools.set(key, pool);
    }
    return pool;
  }

  private allocateSlot(pool: THREE.InstancedMesh): number {
    const key = (pool.material as THREE.Material).uuid;
    const free = this.freeSlots.get(key);
    if (free && free.length > 0) {
      return free.pop()!;
    }
    if (pool.count >= this.maxInstancesPerMaterial) return -1;
    const index = pool.count;
    pool.count = index + 1;
    return index;
  }

  private releaseSlot(pool: THREE.InstancedMesh, index: number): void {
    pool.setMatrixAt(index, this.hiddenMatrix);
    pool.instanceMatrix.needsUpdate = true;
    const key = (pool.material as THREE.Material).uuid;
    let free = this.freeSlots.get(key);
    if (!free) {
      free = [];
      this.freeSlots.set(key, free);
    }
    free.push(index);
  }
}

function cloneMaterialForInstancing(material: THREE.Material): THREE.Material {
  const cloned = material.clone();
  cloned.name = `${material.name || 'wall'}-massing-instanced`;
  return cloned;
}

function findPrimaryWallMesh(group: THREE.Object3D): THREE.Mesh | null {
  for (const child of group.children) {
    if (!(child instanceof THREE.Mesh)) continue;
    if (String(child.name).endsWith('-roof')) continue;
    if (String(child.name).includes('impostor')) continue;
    return child;
  }
  return null;
}
