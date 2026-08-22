import { Injectable } from '@angular/core';
import * as THREE from 'three';

import { FOOTPRINT_CONFIG } from './map-configuration';
import { isGroundCellExcluded } from './m4t3r-ground-exclusion.util';

interface FootprintSlot {
  active: boolean;
  createdAtMs: number;
  expiresAtMs: number;
  x: number;
  z: number;
  y: number;
  yaw: number;
  side: -1 | 1;
}

@Injectable({ providedIn: 'root' })
export class FootprintTrailManager {
  private root: THREE.Group | null = null;
  private mesh: THREE.InstancedMesh | null = null;
  private readonly dummy = new THREE.Object3D();
  private readonly color = new THREE.Color();
  private readonly material = new THREE.MeshBasicMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    color: 0xffffff,
    opacity: FOOTPRINT_CONFIG.opacity,
  });

  private texture: THREE.CanvasTexture | null = null;
  private slots: FootprintSlot[] = [];
  private nextIndex = 0;
  private lastFootprintTimeMs = 0;
  private lastFootprintPos = new THREE.Vector2(Number.NaN, Number.NaN);
  private nextSide: -1 | 1 = 1;
  private lastFadeTickMs = 0;
  private activeIndices: number[] = [];
  private activeIndexPos: number[] = [];

  attach(root: THREE.Group): void {
    this.root = root;
    if (this.mesh) return;

    const tex = this.createFootprintTexture();
    this.texture = tex;
    const mat = this.material.clone();
    (mat as THREE.MeshBasicMaterial).map = tex;
    (mat as THREE.MeshBasicMaterial).needsUpdate = true;

    const geo = new THREE.PlaneGeometry(
      FOOTPRINT_CONFIG.footprintSizeX,
      FOOTPRINT_CONFIG.footprintSizeZ,
      1,
      1
    );
    geo.rotateX(-Math.PI / 2);

    this.mesh = new THREE.InstancedMesh(
      geo,
      mat,
      FOOTPRINT_CONFIG.maxVisibleFootprints
    );
    this.mesh.name = 'm4t3r-footprints-instanced';
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(FOOTPRINT_CONFIG.maxVisibleFootprints * 3),
      3
    );
    this.mesh.count = FOOTPRINT_CONFIG.maxVisibleFootprints;
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1;

    const now = performance.now();
    this.slots = Array.from({ length: FOOTPRINT_CONFIG.maxVisibleFootprints }, () => ({
      active: false,
      createdAtMs: 0,
      expiresAtMs: 0,
      x: 0,
      z: 0,
      y: 0,
      yaw: 0,
      side: 1 as const,
    }));
    this.activeIndices.length = 0;
    this.activeIndexPos = Array.from({ length: FOOTPRINT_CONFIG.maxVisibleFootprints }, () => -1);

    for (let i = 0; i < this.slots.length; i++) {
      this.hideSlot(i);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;

    root.add(this.mesh);
  }

  activeFootprintCount(): number {
    return this.activeIndices.length;
  }

  update(
    position: THREE.Vector3,
    velocityDisplacement: THREE.Vector3,
    deltaSeconds: number,
    groundY: number
  ): void {
    if (!this.mesh || !this.root) return;

    const nowMs = performance.now();
    const horizDx = velocityDisplacement.x;
    const horizDz = velocityDisplacement.z;
    const horizMagSq = horizDx * horizDx + horizDz * horizDz;

    const isMoving = horizMagSq > 1e-4 && deltaSeconds > 0;
    if (!isMoving) return;

    const x = position.x;
    const z = position.z;
    if (isGroundCellExcluded(x, z)) return;
    const fx = this.lastFootprintPos.x;
    const fz = this.lastFootprintPos.y;

    const dist =
      Number.isFinite(fx) && Number.isFinite(fz)
        ? Math.hypot(x - fx, z - fz)
        : Number.POSITIVE_INFINITY;

    if (dist < FOOTPRINT_CONFIG.minStepDistance) return;
    if (nowMs - this.lastFootprintTimeMs < FOOTPRINT_CONFIG.minStepIntervalMs) return;

    const yaw = Math.atan2(horizDx, horizDz);
    const y = groundY + FOOTPRINT_CONFIG.groundOffset;

    this.placeFootprint(x, y, z, yaw);
    this.nextSide = this.nextSide === 1 ? -1 : 1;

    this.lastFootprintTimeMs = nowMs;
    this.lastFootprintPos.set(x, z);
  }

  private placeFootprint(x: number, y: number, z: number, yaw: number): void {
    if (!this.mesh) return;

    const slot = this.slots[this.nextIndex];
    const createdAtMs = performance.now();
    slot.active = true;
    slot.createdAtMs = createdAtMs;
    slot.expiresAtMs = createdAtMs + FOOTPRINT_CONFIG.lifetimeMs;
    slot.side = this.nextSide;
    slot.yaw = yaw + slot.side * 0.14;

    const lateral = FOOTPRINT_CONFIG.lateralOffset;
    const perpX = Math.cos(yaw) * lateral * slot.side;
    const perpZ = -Math.sin(yaw) * lateral * slot.side;
    slot.x = x + perpX;
    slot.z = z + perpZ;
    slot.y = y;

    if (this.activeIndexPos[this.nextIndex] === -1) {
      this.activeIndexPos[this.nextIndex] = this.activeIndices.length;
      this.activeIndices.push(this.nextIndex);
    }

    this.applySlotMatrix(this.nextIndex, slot, 1, 1);
    this.nextIndex = (this.nextIndex + 1) % this.slots.length;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  tickFade(): void {
    if (!this.mesh) return;
    const nowMs = performance.now();
    if (nowMs - this.lastFadeTickMs < 90) return;
    this.lastFadeTickMs = nowMs;

    let changed = false;
    for (let ai = 0; ai < this.activeIndices.length; ) {
      const i = this.activeIndices[ai];
      const s = this.slots[i];

      if (nowMs >= s.expiresAtMs) {
        s.active = false;
        const last = this.activeIndices[this.activeIndices.length - 1];
        this.activeIndices[ai] = last;
        this.activeIndices.pop();
        this.activeIndexPos[last] = ai;
        this.activeIndexPos[i] = -1;
        this.hideSlot(i);
        changed = true;
        continue;
      }

      const fadeStart = s.createdAtMs + FOOTPRINT_CONFIG.fadeStartMs;
      if (nowMs > fadeStart) {
        const p = (nowMs - fadeStart) / Math.max(1, s.expiresAtMs - fadeStart);
        const intensity = Math.max(0, 1 - p);
        this.applySlotMatrix(i, s, 0.65 + intensity * 0.35, intensity);
        changed = true;
      }

      ai++;
    }

    if (changed) {
      this.mesh.instanceMatrix.needsUpdate = true;
      if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    }
  }

  private applySlotMatrix(
    index: number,
    slot: FootprintSlot,
    scale: number,
    colorIntensity: number
  ): void {
    const mesh = this.mesh;
    if (!mesh) return;

    this.dummy.position.set(slot.x, slot.y, slot.z);
    this.dummy.rotation.set(0, slot.yaw, 0);
    this.dummy.scale.set(scale, scale, scale);
    this.dummy.updateMatrix();
    mesh.setMatrixAt(index, this.dummy.matrix);

    this.color.setRGB(0.25 * colorIntensity, 0.88 * colorIntensity, 1.0 * colorIntensity);
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

  private createFootprintTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return new THREE.CanvasTexture(canvas);
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    // Halo externe — calé sur la largeur de traînée (0.8 m).
    const rOuter = canvas.width * 0.46;
    const outer = ctx.createRadialGradient(cx, cy, rOuter * 0.2, cx, cy, rOuter);
    outer.addColorStop(0, 'rgba(64,224,255,0.0)');
    outer.addColorStop(0.55, 'rgba(64,224,255,0.22)');
    outer.addColorStop(0.85, 'rgba(255,62,207,0.08)');
    outer.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = outer;
    ctx.beginPath();
    ctx.arc(cx, cy, rOuter, 0, Math.PI * 2);
    ctx.fill();

    // Empreinte R4V3 : deux lobes + hex central.
    ctx.fillStyle = 'rgba(8,18,32,0.38)';
    ctx.beginPath();
    ctx.ellipse(cx - 16, cy + 2, 20, 14, -0.12, 0, Math.PI * 2);
    ctx.ellipse(cx + 16, cy + 2, 20, 14, 0.12, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(64,224,255,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      const px = cx + Math.cos(a) * 10;
      const py = cy - 6 + Math.sin(a) * 10;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  dispose(): void {
    if (this.root && this.mesh) this.root.remove(this.mesh);
    if (this.mesh) {
      this.mesh.geometry.dispose();
      (this.mesh.material as THREE.Material).dispose();
    }
    this.mesh = null;
    this.root = null;
    this.texture?.dispose?.();
    this.texture = null;
    this.slots = [];
    this.activeIndices.length = 0;
    this.activeIndexPos = [];
    this.lastFootprintPos.set(Number.NaN, Number.NaN);
    this.nextIndex = 0;
    this.lastFootprintTimeMs = 0;
    this.nextSide = 1;
  }
}
