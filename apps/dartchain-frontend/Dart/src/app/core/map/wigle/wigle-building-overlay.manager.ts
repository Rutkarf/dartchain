import * as THREE from 'three';

import type { MapQuality } from '../map-configuration';
import {
  attachEntranceToBuilding,
  buildingDisplayPosition,
} from './building-entrance.util';
import {
  colorForDensityTier,
  densityTierFromCount,
} from './wigle-building-association.util';
import { WIGLE_VISUAL_CONFIG } from './wigle-visual.config';
import type { BuildingReference, WIGLEBuildingAggregate, WigleDebugStats } from './wigle.types';

interface OverlayEntry {
  buildingId: string;
  aggregate: WIGLEBuildingAggregate;
  building: BuildingReference;
}

export class WIGLEBuildingOverlayManager {
  private root: THREE.Group | null = null;
  private ringMesh: THREE.InstancedMesh | null = null;
  private columnMesh: THREE.InstancedMesh | null = null;
  private entries: OverlayEntry[] = [];
  private quality: MapQuality = 'medium';
  private readonly scratchMatrix = new THREE.Matrix4();
  private readonly scratchColor = new THREE.Color();
  private readonly scratchPosition = new THREE.Vector3();
  private readonly scratchQuaternion = new THREE.Quaternion();
  private readonly scratchScale = new THREE.Vector3();

  attach(parent: THREE.Group, quality: MapQuality): void {
    this.quality = quality;
    this.root = new THREE.Group();
    this.root.name = 'building-network-overlays';
    parent.add(this.root);
  }

  setAggregates(aggregates: WIGLEBuildingAggregate[], buildings: BuildingReference[]): void {
    this.entries = [];
    const buildingById = new Map(buildings.map((b) => [b.id, b]));

    for (const aggregate of aggregates) {
      const building = buildingById.get(aggregate.buildingId);
      if (!building) continue;
      this.entries.push({ buildingId: aggregate.buildingId, aggregate, building });
    }

    this.rebuildMeshes();
  }

  update(cameraPosition: THREE.Vector3, elapsedSeconds: number): void {
    if (!this.ringMesh || !this.columnMesh) return;

    const maxDistance = WIGLE_VISUAL_CONFIG.maxVisibleDistanceMeters;
    let visibleCount = 0;

    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];
      const building = attachEntranceToBuilding(entry.building);
      const door = buildingDisplayPosition(building);
      this.scratchPosition.set(door.x, door.y, door.z);
      const distance = cameraPosition.distanceTo(this.scratchPosition);
      const visible = distance <= maxDistance;
      const scale = visible ? 1 : 0.001;

      const tier = densityTierFromCount(entry.aggregate.observationCount);
      const color = colorForDensityTier(tier);
      this.scratchColor.setHex(color);

      const ringScale =
        WIGLE_VISUAL_CONFIG.baseRadius *
        (0.85 + Math.min(entry.aggregate.observationCount, 8) * 0.06);
      this.composeInstance(
        this.ringMesh,
        i,
        door.x,
        door.y + 0.02,
        door.z,
        ringScale,
        ringScale,
        ringScale * scale
      );
      this.ringMesh.setColorAt(i, this.scratchColor);

      const columnHeight =
        this.quality === 'low'
          ? 0.001
          : Math.min(
              WIGLE_VISUAL_CONFIG.maxIndicatorHeight,
              1.5 + entry.aggregate.observationCount * 0.9
            );
      const pulse =
        this.quality === 'high' ? 1 + Math.sin(elapsedSeconds * 1.4 + i) * 0.04 : 1;
      this.composeInstance(
        this.columnMesh,
        i,
        door.x,
        door.y + columnHeight * 0.5 * pulse,
        door.z,
        0.12 * scale,
        columnHeight * pulse * scale,
        0.12 * scale
      );
      this.columnMesh.setColorAt(i, this.scratchColor);

      if (visible) visibleCount++;
    }

    this.ringMesh.count = this.entries.length;
    this.columnMesh.count = this.entries.length;
    this.ringMesh.instanceMatrix.needsUpdate = true;
    this.columnMesh.instanceMatrix.needsUpdate = true;
    if (this.ringMesh.instanceColor) this.ringMesh.instanceColor.needsUpdate = true;
    if (this.columnMesh.instanceColor) this.columnMesh.instanceColor.needsUpdate = true;

    this.lastVisibleCount = visibleCount;
  }

  getDebugStats(): Pick<
    WigleDebugStats,
    'visibleBuildingOverlays' | 'activeWIGLEInstances'
  > {
    return {
      visibleBuildingOverlays: this.lastVisibleCount,
      activeWIGLEInstances: this.entries.length * (this.quality === 'low' ? 1 : 2),
    };
  }

  dispose(): void {
    this.ringMesh?.geometry.dispose();
    this.columnMesh?.geometry.dispose();
    (this.ringMesh?.material as THREE.Material)?.dispose();
    (this.columnMesh?.material as THREE.Material)?.dispose();
    if (this.root?.parent) {
      this.root.parent.remove(this.root);
    }
    this.root = null;
    this.ringMesh = null;
    this.columnMesh = null;
    this.entries = [];
  }

  private lastVisibleCount = 0;

  private rebuildMeshes(): void {
    if (!this.root) return;
    this.disposeMeshesOnly();

    const capacity = Math.max(this.entries.length, 1);
    const ringGeometry = new THREE.TorusGeometry(1, 0.06, 8, 24);
    ringGeometry.rotateX(Math.PI / 2);
    const ringMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: WIGLE_VISUAL_CONFIG.opacity,
      depthWrite: false,
      toneMapped: false,
    });
    this.ringMesh = new THREE.InstancedMesh(ringGeometry, ringMaterial, capacity);
    this.ringMesh.name = 'building-network-halo-rings';
    this.ringMesh.frustumCulled = false;

    const columnGeometry = new THREE.BoxGeometry(1, 1, 1);
    const columnMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: this.quality === 'high' ? 0.55 : 0.38,
      depthWrite: false,
      toneMapped: false,
    });
    this.columnMesh = new THREE.InstancedMesh(columnGeometry, columnMaterial, capacity);
    this.columnMesh.name = 'building-network-columns';
    this.columnMesh.frustumCulled = false;

    this.root.add(this.ringMesh, this.columnMesh);
    this.update(new THREE.Vector3(), 0);
  }

  private disposeMeshesOnly(): void {
    if (!this.root) return;
    for (const child of [...this.root.children]) {
      this.root.remove(child);
      const mesh = child as THREE.Mesh;
      mesh.geometry?.dispose?.();
      const material = mesh.material;
      if (Array.isArray(material)) material.forEach((m) => m.dispose());
      else material?.dispose?.();
    }
    this.ringMesh = null;
    this.columnMesh = null;
  }

  private composeInstance(
    mesh: THREE.InstancedMesh,
    index: number,
    x: number,
    y: number,
    z: number,
    scaleX: number,
    scaleY: number,
    scaleZ: number
  ): void {
    this.scratchPosition.set(x, y, z);
    this.scratchQuaternion.identity();
    this.scratchScale.set(scaleX, scaleY, scaleZ);
    this.scratchMatrix.compose(this.scratchPosition, this.scratchQuaternion, this.scratchScale);
    mesh.setMatrixAt(index, this.scratchMatrix);
  }
}
