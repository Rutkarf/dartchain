import { Injectable } from '@angular/core';
import * as THREE from 'three';

import { FOOTPRINT_CONFIG } from './map-configuration';

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
  private readonly material = new THREE.MeshBasicMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    color: 0x40e0ff,
    opacity: FOOTPRINT_CONFIG.opacity,
  });

  private texture: THREE.CanvasTexture | null = null;
  private slots: FootprintSlot[] = [];
  private nextIndex = 0;
  private lastFootprintTimeMs = 0;
  private lastFootprintPos = new THREE.Vector2(Number.NaN, Number.NaN);
  private nextSide: -1 | 1 = 1;
  private lastFadeTickMs = 0;
  // Maintient la liste des empreintes actives pour éviter de parcourir 300 slots à vide.
  private activeIndices: number[] = [];
  private activeIndexPos: number[] = [];

  attach(root: THREE.Group): void {
    this.root = root;
    if (this.mesh) return;

    // Shared decal-like texture (cheap canvas).
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
    // Lay on ground: Plane is XY by default -> rotate to XZ.
    geo.rotateX(-Math.PI / 2);

    this.mesh = new THREE.InstancedMesh(
      geo,
      mat,
      FOOTPRINT_CONFIG.maxVisibleFootprints
    );
    this.mesh.name = 'm4t3r-footprints-instanced';
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.count = FOOTPRINT_CONFIG.maxVisibleFootprints;
    this.mesh.frustumCulled = false;

    // Initialize slots as inactive and scale=0 so it won't render.
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
      this.dummy.position.set(0, -1e6, 0);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.scale.set(0, 0, 0);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;

    root.add(this.mesh);
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

    // Create footprints only when moving (walk/run), not when the joystick is idle.
    const isMoving = horizMagSq > 1e-4 && deltaSeconds > 0;
    if (!isMoving) return;

    const x = position.x;
    const z = position.z;
    const fx = this.lastFootprintPos.x;
    const fz = this.lastFootprintPos.y;

    const dist =
      Number.isFinite(fx) && Number.isFinite(fz)
        ? Math.hypot(x - fx, z - fz)
        : Number.POSITIVE_INFINITY;

    if (dist < FOOTPRINT_CONFIG.minStepDistance) return;
    if (nowMs - this.lastFootprintTimeMs < FOOTPRINT_CONFIG.minStepIntervalMs) return;

    // Footprints use movement direction (yaw). VelocityDisplacement magnitude is irrelevant.
    const yaw = Math.atan2(horizDx, horizDz);
    const y = groundY + FOOTPRINT_CONFIG.groundOffset;

    this.placeFootprint(x, y, z, yaw);

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
    slot.x = x;
    slot.y = y;
    slot.z = z;
    slot.side = this.nextSide;

    // Alternate slight yaw to differentiate left/right.
    const yawJitter = slot.side * 0.18;
    slot.yaw = yaw + yawJitter;

    // Ajout dans la liste active si nécessaire.
    if (this.activeIndexPos[this.nextIndex] === -1) {
      this.activeIndexPos[this.nextIndex] = this.activeIndices.length;
      this.activeIndices.push(this.nextIndex);
    }

    this.dummy.position.set(slot.x, slot.y, slot.z);
    this.dummy.rotation.set(0, slot.yaw + yawJitter, 0);
    this.dummy.scale.set(1, 1, 1);
    this.dummy.updateMatrix();
    this.mesh.setMatrixAt(this.nextIndex, this.dummy.matrix);

    this.nextIndex = (this.nextIndex + 1) % this.slots.length;

    this.mesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * Simple fade by scaling down the footprint over time.
   * We do it in-place (no extra allocations), and update at ~10Hz.
   */
  tickFade(): void {
    if (!this.mesh) return;
    const nowMs = performance.now();
    if (nowMs - this.lastFadeTickMs < 90) return; // ~11Hz
    this.lastFadeTickMs = nowMs;

    let changed = false;
    for (let ai = 0; ai < this.activeIndices.length; ) {
      const i = this.activeIndices[ai];
      const s = this.slots[i];

      if (nowMs >= s.expiresAtMs) {
        s.active = false;
        // Remove from active list via swap-pop.
        const last = this.activeIndices[this.activeIndices.length - 1];
        this.activeIndices[ai] = last;
        this.activeIndices.pop();
        this.activeIndexPos[last] = ai;
        this.activeIndexPos[i] = -1;

        this.dummy.position.set(0, -1e6, 0);
        this.dummy.rotation.set(0, 0, 0);
        this.dummy.scale.set(0, 0, 0);
        this.dummy.updateMatrix();
        this.mesh.setMatrixAt(i, this.dummy.matrix);
        changed = true;
        // Element swapped in at same index: re-check without increment.
        continue;
      }

      // Fade start -> lifetime.
      const fadeStart = s.createdAtMs + FOOTPRINT_CONFIG.fadeStartMs;
      if (nowMs > fadeStart) {
        const p = (nowMs - fadeStart) / Math.max(1, s.expiresAtMs - fadeStart);
        const scale = Math.max(0, 1 - p);
        this.dummy.position.set(s.x, s.y, s.z);
        this.dummy.rotation.set(0, s.yaw, 0);
        this.dummy.scale.set(scale, scale, scale);
        this.dummy.updateMatrix();
        this.mesh.setMatrixAt(i, this.dummy.matrix);
        changed = true;
      }

      ai++;
    }

    if (changed) {
      this.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  private createFootprintTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      const tex = new THREE.CanvasTexture(canvas);
      return tex;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Neon footprint: a darker base + cyan glow ring.
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const rMax = canvas.width * 0.45;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rMax);
    grad.addColorStop(0, 'rgba(64,224,255,0.55)');
    grad.addColorStop(0.35, 'rgba(40,90,255,0.20)');
    grad.addColorStop(0.7, 'rgba(0,0,0,0.0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, rMax, 0, Math.PI * 2);
    ctx.fill();

    // Inner darker footprint shape (two-lobes).
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(cx - 18, cy, 22, 16, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 18, cy, 22, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  dispose(): void {
    if (this.root && this.mesh) this.root.remove(this.mesh);
    if (this.mesh) {
      this.mesh.geometry.dispose();
      // MeshBasicMaterial created via clone; safe to dispose it.
      (this.mesh.material as THREE.Material).dispose();
    }
    this.mesh = null;
    this.root = null;
    this.texture?.dispose?.();
    this.texture = null;
    this.slots = [];
    this.lastFootprintPos.set(Number.NaN, Number.NaN);
    this.nextIndex = 0;
    this.lastFootprintTimeMs = 0;
  }
}

