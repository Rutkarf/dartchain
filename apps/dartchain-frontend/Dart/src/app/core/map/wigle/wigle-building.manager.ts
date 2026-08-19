import * as THREE from 'three';

import type { MapQuality } from '../map-configuration';
import { WIGLE_GEO_CONFIG, maxActivePointsForQuality } from './wigle-visual.config';
import {
  buildingHeightFromSignal,
  colorForNetworkType,
} from './shaders/wigle-wave.shader';
import type { WigleGeoPoint } from './wigle-point.types';

/**
 * Points réseau positionnés aux coordonnées GPS réelles — InstancedMesh par type réseau.
 */
export class WigleBuildingManager {
  private root: THREE.Group | null = null;
  private wifiMesh: THREE.InstancedMesh | null = null;
  private cellMesh: THREE.InstancedMesh | null = null;
  private bleMesh: THREE.InstancedMesh | null = null;
  private readonly scratchMatrix = new THREE.Matrix4();
  private readonly scratchColor = new THREE.Color();
  private activeCount = 0;
  private maxPoints: number = WIGLE_GEO_CONFIG.maxActivePoints;

  attach(parent: THREE.Group, quality: MapQuality): void {
    this.maxPoints = maxActivePointsForQuality(quality);
    this.root = new THREE.Group();
    this.root.name = 'network-geo-buildings';
    this.root.renderOrder = 17;
    parent.add(this.root);

    const geometry = new THREE.CylinderGeometry(0.42, 0.62, 1, 6, 1);
    this.wifiMesh = this.createTypeMesh(geometry, 0x00f3ff, 'network-buildings-wifi');
    this.cellMesh = this.createTypeMesh(geometry, 0xff00ff, 'network-buildings-cell');
    this.bleMesh = this.createTypeMesh(geometry, 0x7b2cbf, 'network-buildings-ble');
    this.root.add(this.wifiMesh, this.cellMesh, this.bleMesh);
  }

  setQuality(quality: MapQuality): void {
    this.maxPoints = maxActivePointsForQuality(quality);
  }

  updateInstances(points: WigleGeoPoint[]): void {
    if (!this.wifiMesh || !this.cellMesh || !this.bleMesh) return;

    const wifi: WigleGeoPoint[] = [];
    const cell: WigleGeoPoint[] = [];
    const ble: WigleGeoPoint[] = [];

    for (const point of points.slice(0, this.maxPoints)) {
      switch (point.networkType) {
        case 'CELL':
          cell.push(point);
          break;
        case 'BLE':
          ble.push(point);
          break;
        default:
          wifi.push(point);
      }
    }

    this.fillMesh(this.wifiMesh, wifi);
    this.fillMesh(this.cellMesh, cell);
    this.fillMesh(this.bleMesh, ble);
    this.activeCount = wifi.length + cell.length + ble.length;
  }

  getActiveCount(): number {
    return this.activeCount;
  }

  dispose(): void {
    for (const mesh of [this.wifiMesh, this.cellMesh, this.bleMesh]) {
      mesh?.geometry.dispose();
      (mesh?.material as THREE.Material)?.dispose();
    }
    if (this.root?.parent) this.root.parent.remove(this.root);
    this.root = null;
    this.wifiMesh = null;
    this.cellMesh = null;
    this.bleMesh = null;
    this.activeCount = 0;
  }

  private createTypeMesh(
    geometry: THREE.BufferGeometry,
    emissive: number,
    name: string
  ): THREE.InstancedMesh {
    const material = new THREE.MeshStandardMaterial({
      color: emissive,
      emissive,
      emissiveIntensity: 1.18,
      metalness: 0.62,
      roughness: 0.22,
      transparent: true,
      opacity: 0.92,
    });
    const mesh = new THREE.InstancedMesh(geometry, material, WIGLE_GEO_CONFIG.maxActivePoints);
    mesh.name = name;
    mesh.count = 0;
    mesh.frustumCulled = false;
    mesh.renderOrder = 18;
    return mesh;
  }

  private fillMesh(mesh: THREE.InstancedMesh, points: WigleGeoPoint[]): void {
    const size = WIGLE_GEO_CONFIG.buildingBaseSize;
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const height = buildingHeightFromSignal(point.signalStrength);
      const scale = size * (0.85 + THREE.MathUtils.clamp((point.signalStrength + 80) / 100, 0, 0.25));

      this.scratchMatrix.compose(
        new THREE.Vector3(point.worldX, point.worldY + height / 2, point.worldZ),
        new THREE.Quaternion(),
        new THREE.Vector3(scale * 0.72, height, scale * 0.72)
      );
      mesh.setMatrixAt(i, this.scratchMatrix);
      this.scratchColor.setHex(colorForNetworkType(point.networkType));
      mesh.setColorAt(i, this.scratchColor);
    }
    mesh.count = points.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }
}

export function createBuildingFromWigle(point: WigleGeoPoint): {
  position: THREE.Vector3;
  height: number;
  color: number;
} {
  const height = buildingHeightFromSignal(point.signalStrength);
  return {
    position: new THREE.Vector3(point.worldX, height / 2, point.worldZ),
    height,
    color: colorForNetworkType(point.networkType),
  };
}
