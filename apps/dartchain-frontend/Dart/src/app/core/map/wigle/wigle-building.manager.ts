import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

import type { MapQuality } from '../map-configuration';
import { WIGLE_GEO_CONFIG, maxActivePointsForQuality } from './wigle-visual.config';
import { colorForNetworkType } from './shaders/wigle-wave.shader';
import type { WigleGeoPoint } from './wigle-point.types';

/**
 * Icônes WiFi 3D (arcs + point) entourées d’un cercle au sol — InstancedMesh par type.
 */
export class WigleBuildingManager {
  private root: THREE.Group | null = null;
  private wifiMesh: THREE.InstancedMesh | null = null;
  private cellMesh: THREE.InstancedMesh | null = null;
  private bleMesh: THREE.InstancedMesh | null = null;
  private circleMesh: THREE.InstancedMesh | null = null;
  private readonly scratchMatrix = new THREE.Matrix4();
  private readonly scratchColor = new THREE.Color();
  private readonly scratchQuat = new THREE.Quaternion();
  private readonly scratchPos = new THREE.Vector3();
  private readonly scratchScale = new THREE.Vector3();
  private activeCount = 0;
  private maxPoints: number = WIGLE_GEO_CONFIG.maxActivePoints;
  private iconGeometry: THREE.BufferGeometry | null = null;
  private circleGeometry: THREE.BufferGeometry | null = null;

  attach(parent: THREE.Group, quality: MapQuality): void {
    this.maxPoints = maxActivePointsForQuality(quality);
    this.root = new THREE.Group();
    this.root.name = 'network-geo-buildings';
    this.root.renderOrder = 17;
    parent.add(this.root);

    this.iconGeometry = createWifiIconGeometry();
    this.circleGeometry = createWifiCircleGeometry();

    this.wifiMesh = this.createTypeMesh(this.iconGeometry, 0x00f3ff, 'network-buildings-wifi');
    this.cellMesh = this.createTypeMesh(this.iconGeometry, 0xff00ff, 'network-buildings-cell');
    this.bleMesh = this.createTypeMesh(this.iconGeometry, 0x7b2cbf, 'network-buildings-ble');
    this.circleMesh = this.createCircleMesh(this.circleGeometry);

    this.root.add(this.wifiMesh, this.cellMesh, this.bleMesh, this.circleMesh);
  }

  setQuality(quality: MapQuality): void {
    this.maxPoints = maxActivePointsForQuality(quality);
  }

  updateInstances(points: WigleGeoPoint[]): void {
    if (!this.wifiMesh || !this.cellMesh || !this.bleMesh || !this.circleMesh) return;

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

    this.fillIconMesh(this.wifiMesh, wifi);
    this.fillIconMesh(this.cellMesh, cell);
    this.fillIconMesh(this.bleMesh, ble);
    this.fillCircleMesh(this.circleMesh, points.slice(0, this.maxPoints));
    this.activeCount = wifi.length + cell.length + ble.length;
  }

  getActiveCount(): number {
    return this.activeCount;
  }

  dispose(): void {
    for (const mesh of [this.wifiMesh, this.cellMesh, this.bleMesh, this.circleMesh]) {
      (mesh?.material as THREE.Material)?.dispose();
    }
    this.iconGeometry?.dispose();
    this.circleGeometry?.dispose();
    if (this.root?.parent) this.root.parent.remove(this.root);
    this.root = null;
    this.wifiMesh = null;
    this.cellMesh = null;
    this.bleMesh = null;
    this.circleMesh = null;
    this.iconGeometry = null;
    this.circleGeometry = null;
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
      emissiveIntensity: 1.35,
      metalness: 0.55,
      roughness: 0.28,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.InstancedMesh(geometry, material, WIGLE_GEO_CONFIG.maxActivePoints);
    mesh.name = name;
    mesh.count = 0;
    mesh.frustumCulled = true;
    mesh.renderOrder = 18;
    return mesh;
  }

  private createCircleMesh(geometry: THREE.BufferGeometry): THREE.InstancedMesh {
    const material = new THREE.MeshStandardMaterial({
      color: 0x00f3ff,
      emissive: 0x00f3ff,
      emissiveIntensity: 0.85,
      metalness: 0.4,
      roughness: 0.35,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.InstancedMesh(geometry, material, WIGLE_GEO_CONFIG.maxActivePoints);
    mesh.name = 'network-buildings-circle';
    mesh.count = 0;
    mesh.frustumCulled = true;
    mesh.renderOrder = 17;
    return mesh;
  }

  private fillIconMesh(mesh: THREE.InstancedMesh, points: WigleGeoPoint[]): void {
    const size = WIGLE_GEO_CONFIG.buildingBaseSize;
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const signalBoost = THREE.MathUtils.clamp((point.signalStrength + 80) / 100, 0, 0.35);
      const scale = size * (0.85 + signalBoost * 0.4);

      this.scratchPos.set(point.worldX, point.worldY + 1.15, point.worldZ);
      this.scratchQuat.identity();
      this.scratchScale.set(scale, scale, scale);
      this.scratchMatrix.compose(this.scratchPos, this.scratchQuat, this.scratchScale);
      mesh.setMatrixAt(i, this.scratchMatrix);
      this.scratchColor.setHex(colorForNetworkType(point.networkType));
      mesh.setColorAt(i, this.scratchColor);
    }
    mesh.count = points.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  private fillCircleMesh(mesh: THREE.InstancedMesh, points: WigleGeoPoint[]): void {
    const size = WIGLE_GEO_CONFIG.buildingBaseSize;
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const signalBoost = THREE.MathUtils.clamp((point.signalStrength + 80) / 100, 0, 0.35);
      const scale = size * (1.05 + signalBoost * 0.35);

      this.scratchPos.set(point.worldX, point.worldY + 0.05, point.worldZ);
      this.scratchQuat.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
      this.scratchScale.set(scale, scale, 1);
      this.scratchMatrix.compose(this.scratchPos, this.scratchQuat, this.scratchScale);
      mesh.setMatrixAt(i, this.scratchMatrix);
      this.scratchColor.setHex(colorForNetworkType(point.networkType));
      mesh.setColorAt(i, this.scratchColor);
    }
    mesh.count = points.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }
}

/** Arc WiFi + point central (géométrie unitée, Y = hauteur). */
function createWifiIconGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  const dot = new THREE.SphereGeometry(0.12, 10, 8);
  dot.translate(0, 0.12, 0);
  parts.push(dot);

  const arcs: Array<{ r: number; y: number }> = [
    { r: 0.32, y: 0.28 },
    { r: 0.52, y: 0.42 },
    { r: 0.72, y: 0.56 },
  ];

  for (const arc of arcs) {
    const torus = new THREE.TorusGeometry(arc.r, 0.045, 6, 20, Math.PI * 0.95);
    torus.rotateX(Math.PI / 2);
    torus.rotateZ(Math.PI);
    torus.translate(0, arc.y, 0);
    parts.push(torus);
  }

  const merged = mergeGeometries(parts, false);
  for (const part of parts) {
    part.dispose();
  }
  if (!merged) {
    return new THREE.SphereGeometry(0.2, 8, 8);
  }
  merged.computeVertexNormals();
  return merged;
}

function createWifiCircleGeometry(): THREE.BufferGeometry {
  return new THREE.RingGeometry(0.78, 0.98, 40);
}

export function createBuildingFromWigle(point: WigleGeoPoint): {
  position: THREE.Vector3;
  height: number;
  color: number;
} {
  return {
    position: new THREE.Vector3(point.worldX, point.worldY + 1.15, point.worldZ),
    height: 1.2,
    color: colorForNetworkType(point.networkType),
  };
}
