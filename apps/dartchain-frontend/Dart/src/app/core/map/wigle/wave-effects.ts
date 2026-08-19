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
 * Chaque point reçoit une ripple de base + un effet signature assigné.
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

    // Ripple de base sur CHAQUE point WiGLE
    this.addRipple(color, materials, meshes, 0, 'ripple-ring');
    if (this.quality !== 'low') {
      this.addRipple(color, materials, meshes, 0.04, 'ripple-ring-secondary');
    }

    switch (point.waveEffect) {
      case 'ripple-circular':
        break;
      case 'pulse-glow':
        this.addPulseGlow(color, materials, meshes);
        break;
      case 'wave-spiral':
        this.addSpiral(color, materials, meshes);
        break;
      case 'radial-burst':
        this.addRipple(color, materials, meshes, 0.5, 'radial-burst-ring');
        break;
      case 'em-field':
        this.addEmField(color, materials, meshes);
        break;
      case 'signal-bars':
        this.addSignalBars(color, meshes, point.signalStrength);
        break;
      case 'data-stream':
        this.addDataStream(color, meshes);
        break;
      case 'holo-dome':
        this.addHoloDome(color, materials, meshes);
        break;
      case 'frequency-wave':
        this.addFrequencyWave(color, materials, meshes);
        break;
      case 'network-mesh':
        this.addRipple(color, materials, meshes, 0.25, 'network-mesh-ring');
        break;
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
    if (slot.point.waveEffect === 'radial-burst' && slot.burstTimer >= 3) {
      slot.burstTimer = 0;
      for (const mesh of slot.meshes) {
        if (mesh.name === 'radial-burst-ring') mesh.scale.setScalar(0.5);
      }
    }

    for (const mesh of slot.meshes) {
      switch (mesh.name) {
        case 'ripple-ring':
        case 'ripple-ring-secondary':
        case 'network-mesh-ring':
        case 'radial-burst-ring': {
          const speed = mesh.name === 'ripple-ring-secondary' ? 0.45 : 0.6;
          const scale = 1 + ((t * speed) % 1) * 2.5 * intensity;
          mesh.scale.set(scale, scale, scale);
          break;
        }
        case 'pulse-glow-core':
          mesh.scale.setScalar((0.7 + Math.sin(t * Math.PI * 2) * 0.3) * intensity);
          break;
        case 'signal-bar':
          mesh.scale.y = 0.5 + Math.abs(Math.sin(t * 3 + index)) * intensity;
          break;
        case 'data-stream':
          mesh.position.y = ((t * 2) % 8) * intensity;
          break;
        case 'holo-dome':
          mesh.rotation.y += delta * 0.4;
          break;
        case 'frequency-ribbon':
          mesh.rotation.z = Math.sin(t * 2) * 0.15;
          break;
      }
    }

    if (slot.particles) {
      slot.particles.rotation.y += delta * 0.8;
      (slot.particles.material as THREE.PointsMaterial).opacity =
        0.35 + Math.sin(t * 4) * 0.15;
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

  private addPulseGlow(
    color: number,
    materials: THREE.ShaderMaterial[],
    meshes: THREE.Object3D[]
  ): void {
    const mat = createWigleWaveMaterial(color);
    materials.push(mat);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 10), mat);
    core.name = 'pulse-glow-core';
    core.position.y = 1.2;
    meshes.push(core);
  }

  private addSpiral(
    color: number,
    materials: THREE.ShaderMaterial[],
    meshes: THREE.Object3D[]
  ): void {
    const mat = createWigleWaveMaterial(color);
    materials.push(mat);
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const angle = t * Math.PI * 6;
      const radius = 0.3 + t * 0.8;
      points.push(new THREE.Vector3(Math.cos(angle) * radius, t * 6, Math.sin(angle) * radius));
    }
    meshes.push(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), mat));
    meshes[meshes.length - 1].name = 'wave-spiral';
  }

  private addEmField(
    color: number,
    materials: THREE.ShaderMaterial[],
    meshes: THREE.Object3D[]
  ): void {
    const mat = createWigleWaveMaterial(color);
    materials.push(mat);
    const torus = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.04, 8, 20), mat);
    torus.rotation.x = Math.PI / 2;
    torus.position.y = 2;
    torus.name = 'em-field';
    meshes.push(torus);

    if (this.quality !== 'low') {
      const count = this.quality === 'high' ? 10 : 5;
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        positions[i * 3] = Math.cos(angle) * 1.1;
        positions[i * 3 + 1] = 2;
        positions[i * 3 + 2] = Math.sin(angle) * 1.1;
      }
      const pGeo = new THREE.BufferGeometry();
      pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const particles = new THREE.Points(
        pGeo,
        new THREE.PointsMaterial({
          color,
          size: 0.16,
          transparent: true,
          opacity: 0.6,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      particles.name = 'em-particles';
      meshes.push(particles);
    }
  }

  private addSignalBars(color: number, meshes: THREE.Object3D[], signal: number): void {
    const barMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const strength = THREE.MathUtils.clamp(Math.floor((signal + 90) / 15), 1, 4);
    for (let i = 0; i < 4; i++) {
      const h = 0.4 + i * 0.35;
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.15, h, 0.15), barMat);
      bar.position.set(-0.35 + i * 0.22, h / 2 + 0.5, 0.4);
      bar.name = 'signal-bar';
      bar.visible = i < strength;
      meshes.push(bar);
    }
  }

  private addDataStream(color: number, meshes: THREE.Object3D[]): void {
    const particle = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.12, 0),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    particle.name = 'data-stream';
    particle.position.y = 0.5;
    meshes.push(particle);
  }

  private addHoloDome(
    color: number,
    materials: THREE.ShaderMaterial[],
    meshes: THREE.Object3D[]
  ): void {
    const mat = createWigleWaveMaterial(color);
    mat.uniforms['uOpacity'].value = 0.35;
    materials.push(mat);
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(1.6, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      mat
    );
    dome.name = 'holo-dome';
    dome.position.y = 0.1;
    meshes.push(dome);
  }

  private addFrequencyWave(
    color: number,
    materials: THREE.ShaderMaterial[],
    meshes: THREE.Object3D[]
  ): void {
    const mat = createWigleWaveMaterial(color);
    materials.push(mat);
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= 28; i++) {
      const x = (i / 28 - 0.5) * 3;
      points.push(new THREE.Vector3(x, 0.15 + Math.sin(i * 0.5) * 0.2, 0));
    }
    const ribbon = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), mat);
    ribbon.name = 'frequency-ribbon';
    meshes.push(ribbon);
  }

  private rebuildMeshLines(points: WigleGeoPoint[]): void {
    if (!this.root || points.length < 2 || this.quality === 'low') return;

    const segments: THREE.Vector3[] = [];
    const radiusSq = WIGLE_GEO_CONFIG.meshConnectRadius ** 2;

    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const a = points[i];
        const b = points[j];
        const dx = a.worldX - b.worldX;
        const dz = a.worldZ - b.worldZ;
        if (dx * dx + dz * dz > radiusSq) continue;
        segments.push(
          new THREE.Vector3(a.worldX, 1.5, a.worldZ),
          new THREE.Vector3(b.worldX, 1.5, b.worldZ)
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
