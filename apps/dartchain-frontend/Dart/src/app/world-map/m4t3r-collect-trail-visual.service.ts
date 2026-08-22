import { Injectable } from '@angular/core';
import * as THREE from 'three';

import { COLLECT_TRAIL_VISUAL_CONFIG } from './map-configuration';
import { isGroundCellExcluded } from './m4t3r-ground-exclusion.util';
import { clusterWorldCenter, sampleCollectTrailVisualPoints } from './m4t3r-trail.util';

interface CollectTrailSlot {
  active: boolean;
  createdAtMs: number;
  expiresAtMs: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
}

/**
 * Glow résiduel au sol après collecte M4T3R — pool InstancedMesh, fade 2–3 s.
 * Aucun impact gameplay ; purement visuel, aligné sur TRAIL_CONFIG.width.
 */
@Injectable({ providedIn: 'root' })
export class M4t3rCollectTrailVisualService {
  private root: THREE.Group | null = null;
  private mesh: THREE.InstancedMesh | null = null;
  private readonly dummy = new THREE.Object3D();
  private readonly color = new THREE.Color();
  private readonly prevScratch = new THREE.Vector3();
  private readonly curScratch = new THREE.Vector3();
  private readonly slots: CollectTrailSlot[] = [];
  private nextIndex = 0;
  private lastFadeTickMs = 0;
  private activeIndices: number[] = [];
  private activeIndexPos: number[] = [];

  attach(root: THREE.Group): void {
    this.root = root;
    if (this.mesh) return;

    const tex = this.createGlowTexture();
    const material = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      color: 0xffffff,
      opacity: COLLECT_TRAIL_VISUAL_CONFIG.opacity,
      blending: THREE.AdditiveBlending,
    });

    const geo = new THREE.PlaneGeometry(
      COLLECT_TRAIL_VISUAL_CONFIG.quadLength,
      COLLECT_TRAIL_VISUAL_CONFIG.quadWidth,
      1,
      1
    );
    geo.rotateX(-Math.PI / 2);

    const capacity = COLLECT_TRAIL_VISUAL_CONFIG.maxVisibleQuads;
    this.mesh = new THREE.InstancedMesh(geo, material, capacity);
    this.mesh.name = 'm4t3r-collect-trail-instanced';
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
    this.mesh.count = capacity;
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 3;

    this.slots.length = 0;
    this.activeIndices.length = 0;
    this.activeIndexPos = Array.from({ length: capacity }, () => -1);

    for (let i = 0; i < capacity; i++) {
      this.slots.push({
        active: false,
        createdAtMs: 0,
        expiresAtMs: 0,
        x: 0,
        y: 0,
        z: 0,
        yaw: 0,
      });
      this.hideSlot(i);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;

    root.add(this.mesh);
  }

  /**
   * Ajoute un glow le long du segment collecté + aux centres de clusters touchés.
   */
  addCollectSegment(
    previous: { x: number; y: number; z: number },
    current: { x: number; y: number; z: number },
    clusterIds: readonly string[],
    groundY: number
  ): void {
    if (!this.mesh) return;

    const y = groundY + COLLECT_TRAIL_VISUAL_CONFIG.groundOffset;
    this.prevScratch.set(previous.x, previous.y, previous.z);
    this.curScratch.set(current.x, current.y, current.z);
    const points = sampleCollectTrailVisualPoints(this.prevScratch, this.curScratch);
    for (const point of points) {
      if (isGroundCellExcluded(point.x, point.z)) continue;
      this.placeQuad(point.x, y, point.z, point.yaw, 0xff3ecf);
    }

    const seen = new Set<string>();
    for (const id of clusterIds) {
      if (seen.has(id)) continue;
      seen.add(id);
      const center = clusterWorldCenter(id);
      if (!center || isGroundCellExcluded(center.x, center.z)) continue;
      const yaw = Math.atan2(this.curScratch.x - this.prevScratch.x, this.curScratch.z - this.prevScratch.z);
      this.placeQuad(center.x, y, center.z, yaw, 0x40e0ff);
    }
  }

  activeQuadCount(): number {
    return this.activeIndices.length;
  }

  tickFade(): void {
    const mesh = this.mesh;
    if (!mesh) return;

    const nowMs = performance.now();
    if (nowMs - this.lastFadeTickMs < 90) return;
    this.lastFadeTickMs = nowMs;

    let changed = false;
    for (let ai = 0; ai < this.activeIndices.length; ) {
      const i = this.activeIndices[ai];
      const slot = this.slots[i];

      if (nowMs >= slot.expiresAtMs) {
        slot.active = false;
        const last = this.activeIndices[this.activeIndices.length - 1];
        this.activeIndices[ai] = last;
        this.activeIndices.pop();
        this.activeIndexPos[last] = ai;
        this.activeIndexPos[i] = -1;
        this.hideSlot(i);
        changed = true;
        continue;
      }

      const fadeStart = slot.createdAtMs + COLLECT_TRAIL_VISUAL_CONFIG.fadeStartMs;
      if (nowMs > fadeStart) {
        const p = (nowMs - fadeStart) / Math.max(1, slot.expiresAtMs - fadeStart);
        const intensity = Math.max(0, 1 - p);
        this.applySlotMatrix(i, slot, intensity * 0.85 + 0.15, intensity);
        changed = true;
      }

      ai++;
    }

    if (changed) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }

  dispose(): void {
    if (this.root && this.mesh) this.root.remove(this.mesh);
    if (this.mesh) {
      this.mesh.geometry.dispose();
      (this.mesh.material as THREE.Material).dispose();
      const map = (this.mesh.material as THREE.MeshBasicMaterial).map;
      map?.dispose();
    }
    this.mesh = null;
    this.root = null;
    this.slots.length = 0;
    this.activeIndices.length = 0;
    this.activeIndexPos = [];
    this.nextIndex = 0;
  }

  private placeQuad(x: number, y: number, z: number, yaw: number, tint: number): void {
    const mesh = this.mesh;
    if (!mesh) return;

    const slot = this.slots[this.nextIndex];
    const nowMs = performance.now();
    slot.active = true;
    slot.createdAtMs = nowMs;
    slot.expiresAtMs = nowMs + COLLECT_TRAIL_VISUAL_CONFIG.lifetimeMs;
    slot.x = x;
    slot.y = y;
    slot.z = z;
    slot.yaw = yaw;

    if (this.activeIndexPos[this.nextIndex] === -1) {
      this.activeIndexPos[this.nextIndex] = this.activeIndices.length;
      this.activeIndices.push(this.nextIndex);
    }

    this.applySlotMatrix(this.nextIndex, slot, 1, 1, tint);
    this.nextIndex = (this.nextIndex + 1) % this.slots.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  private applySlotMatrix(
    index: number,
    slot: CollectTrailSlot,
    scale: number,
    colorIntensity: number,
    tint = 0xff3ecf
  ): void {
    const mesh = this.mesh;
    if (!mesh) return;

    this.dummy.position.set(slot.x, slot.y, slot.z);
    this.dummy.rotation.set(0, slot.yaw, 0);
    this.dummy.scale.set(scale, scale, scale);
    this.dummy.updateMatrix();
    mesh.setMatrixAt(index, this.dummy.matrix);

    this.color.setHex(tint).multiplyScalar(colorIntensity);
    mesh.setColorAt(index, this.color);
  }

  private hideSlot(index: number): void {
    const mesh = this.mesh;
    if (!mesh) return;
    this.dummy.position.set(0, -1e6, 0);
    this.dummy.rotation.set(0, 0, 0);
    this.dummy.scale.set(0, 0, 0);
    this.dummy.updateMatrix();
    mesh.setMatrixAt(index, this.dummy.matrix);
    this.color.setRGB(0, 0, 0);
    mesh.setColorAt(index, this.color);
  }

  private createGlowTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(canvas);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const rMax = canvas.width * 0.48;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rMax);
    grad.addColorStop(0, 'rgba(255,255,255,0.95)');
    grad.addColorStop(0.25, 'rgba(255,62,207,0.55)');
    grad.addColorStop(0.55, 'rgba(64,224,255,0.28)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Anneau R4V3 léger.
    ctx.strokeStyle = 'rgba(64,224,255,0.35)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, rMax * 0.72, 0, Math.PI * 2);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }
}
