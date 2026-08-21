import * as THREE from 'three';

import type { MapQuality } from '../map-configuration';
import { WIGLE_GEO_CONFIG, maxActivePointsForQuality } from './wigle-visual.config';
import {
  colorForNetworkType,
  createWigleWaveMaterial,
} from './shaders/wigle-wave.shader';
import type { WigleGeoPoint } from './wigle-point.types';

export interface WaveEffectSlot {
  point: WigleGeoPoint;
  group: THREE.Group;
  materials: THREE.ShaderMaterial[];
  meshes: THREE.Object3D[];
  particles?: THREE.Points;
  burstTimer: number;
}

export class WaveEffectPool {
  private pool: THREE.Group[] = [];

  acquire(): THREE.Group {
    const recycled = this.pool.pop();
    if (recycled) {
      recycled.visible = true;
      return recycled;
    }
    const group = new THREE.Group();
    group.name = 'network-wave-slot';
    return group;
  }

  release(group: THREE.Group): void {
    group.visible = false;
    this.pool.push(group);
  }
}

/**
 * Système des effets d'ondes réseau — pooling + shaders unifiés.
 * Affiche uniquement des ripples au sol + liens mesh entre points.
 */
export class WaveEffectSystem {
  private root: THREE.Group | null = null;
  private slots: WaveEffectSlot[] = [];
  private readonly pool = new WaveEffectPool();
  private meshLines: THREE.LineSegments | null = null;
  private quality: MapQuality = 'medium';
  private enabled = true;
  private elapsed = 0;
  private maxPoints: number = WIGLE_GEO_CONFIG.maxActivePoints;

  attach(parent: THREE.Group, quality: MapQuality): void {
    this.quality = quality;
    this.maxPoints = maxActivePointsForQuality(quality);
    this.root = new THREE.Group();
    this.root.name = 'network-wave-effects';
    this.root.renderOrder = 16;
    parent.add(this.root);
  }

  setQuality(quality: MapQuality): void {
    this.quality = quality;
    this.maxPoints = maxActivePointsForQuality(quality);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (this.root) this.root.visible = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  rebuild(points: WigleGeoPoint[]): void {
    if (!this.root) return;
    this.clearSlots();

    for (const point of points.slice(0, this.maxPoints)) {
      const group = this.pool.acquire();
      group.position.set(point.worldX, point.worldY, point.worldZ);
      const slot = this.createEffectForPoint(point, group);
      this.slots.push(slot);
      this.root.add(group);
    }

    this.rebuildMeshLines(points.slice(0, this.maxPoints));
  }

  update(deltaSeconds: number, _cameraPosition: THREE.Vector3): void {
    if (!this.enabled) return;
    this.elapsed += deltaSeconds;

    for (let i = 0; i < this.slots.length; i++) {
      this.animateSlot(this.slots[i], deltaSeconds, i);
    }

    if (this.meshLines) {
      const mat = this.meshLines.material as THREE.LineBasicMaterial;
      mat.opacity = 0.35 + Math.sin(this.elapsed * 2) * 0.1;
    }
  }

  getActiveEffectCount(): number {
    return this.slots.length;
  }

  estimateDrawCalls(): number {
    return this.slots.length * 2 + (this.meshLines ? 1 : 0);
  }

  dispose(): void {
    this.clearSlots();
    this.meshLines?.geometry.dispose();
    (this.meshLines?.material as THREE.Material)?.dispose();
    this.meshLines = null;
    if (this.root?.parent) this.root.parent.remove(this.root);
    this.root = null;
  }

  private clearSlots(): void {
    for (const slot of this.slots) {
      for (const mat of slot.materials) mat.dispose();
      slot.group.clear();
      this.pool.release(slot.group);
    }
    this.slots = [];
    if (this.meshLines && this.root) {
      this.root.remove(this.meshLines);
      this.meshLines.geometry.dispose();
      (this.meshLines.material as THREE.Material).dispose();
      this.meshLines = null;
    }
  }

  private createEffectForPoint(point: WigleGeoPoint, group: THREE.Group): WaveEffectSlot {
    const color = colorForNetworkType(point.networkType);
    const materials: THREE.ShaderMaterial[] = [];
    const meshes: THREE.Object3D[] = [];

    // Zones de connexion au sol uniquement (pas d'hologrammes flottants).
    this.addRipple(color, materials, meshes, 0, 'ripple-ring');
    if (this.quality !== 'low') {
      this.addRipple(color, materials, meshes, 0.04, 'ripple-ring-secondary');
    }

    group.add(...meshes);
    return { point, group, materials, meshes, burstTimer: 0 };
  }

  private animateSlot(slot: WaveEffectSlot, delta: number, index: number): void {
    const t = this.elapsed + index * 0.17;
    const intensity = THREE.MathUtils.clamp((slot.point.signalStrength + 90) / 50, 0.3, 1.2);

    for (const mat of slot.materials) {
      mat.uniforms['uTime'].value = t;
      mat.uniforms['uIntensity'].value = intensity;
      mat.uniforms['uEffectSeed'].value = index * 1.618;
    }

    slot.burstTimer += delta;

    for (const mesh of slot.meshes) {
      if (mesh.name === 'ripple-ring' || mesh.name === 'ripple-ring-secondary') {
        const speed = mesh.name === 'ripple-ring-secondary' ? 0.45 : 0.6;
        const scale = 1 + ((t * speed) % 1) * 2.5 * intensity;
        mesh.scale.set(scale, scale, scale);
      }
    }
  }

  private addRipple(
    color: number,
    materials: THREE.ShaderMaterial[],
    meshes: THREE.Object3D[],
    yOffset: number,
    name: string
  ): void {
    const mat = createWigleWaveMaterial(color);
    materials.push(mat);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.55, 24), mat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.06 + yOffset;
    ring.name = name;
    meshes.push(ring);
  }

  private rebuildMeshLines(points: WigleGeoPoint[]): void {
    if (!this.root || points.length < 2 || this.quality === 'low') return;

    const segments: THREE.Vector3[] = [];
    const radiusSq = WIGLE_GEO_CONFIG.meshConnectRadius ** 2;
    const linkHeight = 0.35;

    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const a = points[i];
        const b = points[j];
        const dx = a.worldX - b.worldX;
        const dz = a.worldZ - b.worldZ;
        if (dx * dx + dz * dz > radiusSq) continue;
        segments.push(
          new THREE.Vector3(a.worldX, a.worldY + linkHeight, a.worldZ),
          new THREE.Vector3(b.worldX, b.worldY + linkHeight, b.worldZ)
        );
      }
    }

    if (segments.length === 0) return;

    this.meshLines = new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(segments),
      new THREE.LineBasicMaterial({
        color: 0x00f3ff,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    this.meshLines.name = 'network-mesh-lines';
    this.root.add(this.meshLines);
  }
}

export function createWaveEffect(
  type: WigleGeoPoint['waveEffect'],
  _position: THREE.Vector3,
  _intensity: number
): WaveEffectTypeLabel {
  return type;
}

export type WaveEffectTypeLabel = WigleGeoPoint['waveEffect'];
