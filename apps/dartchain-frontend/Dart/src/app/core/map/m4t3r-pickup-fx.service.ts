import { Injectable } from '@angular/core';
import * as THREE from 'three';

import { M4T3R_PICKUP_FX } from './map-configuration';
import { getPlayerHeadWorldPosition } from './m4t3r-trail.util';

interface PickupSlot {
  sprite: THREE.Sprite;
  material: THREE.SpriteMaterial;
  canvas: HTMLCanvasElement;
  texture: THREE.CanvasTexture;
  age: number;
  active: boolean;
  follow: THREE.Object3D | null;
  renderKey: string;
  stackLane: number;
}

/**
 * « +1 » vert arcade — un par pièce visuelle, empilés verticalement sans chevauchement.
 */
@Injectable({ providedIn: 'root' })
export class M4t3rPickupFxService {
  private readonly slots: PickupSlot[] = [];
  private scene: THREE.Scene | null = null;
  private readonly head = new THREE.Vector3();

  attach(scene: THREE.Scene): void {
    this.dispose();
    this.scene = scene;
    for (let i = 0; i < M4T3R_PICKUP_FX.poolSize; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.generateMipmaps = false;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0,
        depthTest: false,
        depthWrite: false,
        sizeAttenuation: true,
        toneMapped: false,
      });
      const sprite = new THREE.Sprite(material);
      sprite.name = `m4t3r-pickup-plus-one-${i}`;
      sprite.visible = false;
      sprite.frustumCulled = false;
      sprite.renderOrder = 24;
      sprite.center.set(0.5, 0.15);
      sprite.scale.set(M4T3R_PICKUP_FX.spriteStartScale, M4T3R_PICKUP_FX.spriteStartScale, 1);
      scene.add(sprite);
      this.slots.push({
        sprite,
        material,
        canvas,
        texture,
        age: 0,
        active: false,
        follow: null,
        renderKey: '',
        stackLane: 0,
      });
    }
    this.drawTemplate();
  }

  spawnOne(character: THREE.Object3D, renderKey: string): boolean {
    const slot = this.acquireSlot();
    if (!slot) return false;

    slot.active = true;
    slot.age = 0;
    slot.follow = character;
    slot.renderKey = renderKey;
    slot.stackLane = this.reserveStackLane();
    slot.sprite.visible = true;
    slot.material.opacity = 1;
    slot.sprite.scale.set(M4T3R_PICKUP_FX.spriteStartScale, M4T3R_PICKUP_FX.spriteStartScale, 1);
    this.place(slot, 0);
    return true;
  }

  update(deltaSeconds: number): void {
    const duration = M4T3R_PICKUP_FX.durationMs / 1000;
    for (const slot of this.slots) {
      if (!slot.active) continue;
      slot.age += deltaSeconds;
      const t = Math.min(1, slot.age / duration);
      const pop = t < 0.12 ? t / 0.12 : 1;
      const fade = t < 0.55 ? 1 : 1 - (t - 0.55) / 0.45;
      slot.material.opacity = Math.max(0, fade);
      const size =
        M4T3R_PICKUP_FX.spriteStartScale +
        pop * M4T3R_PICKUP_FX.spritePopBoost +
        t * M4T3R_PICKUP_FX.spriteGrowScale;
      slot.sprite.scale.set(size, size, 1);
      this.place(slot, t);
      if (t >= 1) {
        this.releaseSlot(slot);
      }
    }
  }

  dispose(): void {
    for (const slot of this.slots) {
      this.scene?.remove(slot.sprite);
      slot.material.dispose();
      slot.texture.dispose();
    }
    this.slots.length = 0;
    this.scene = null;
  }

  private acquireSlot(): PickupSlot | undefined {
    let slot = this.slots.find((item) => !item.active);
    if (slot) return slot;
    const oldest = this.findOldestActiveSlot();
    if (oldest) this.releaseSlot(oldest);
    return this.slots.find((item) => !item.active);
  }

  private findOldestActiveSlot(): PickupSlot | undefined {
    let oldest: PickupSlot | undefined;
    for (const slot of this.slots) {
      if (!slot.active) continue;
      if (!oldest || slot.age > oldest.age) oldest = slot;
    }
    return oldest;
  }

  private releaseSlot(slot: PickupSlot): void {
    slot.active = false;
    slot.follow = null;
    slot.renderKey = '';
    slot.stackLane = 0;
    slot.sprite.visible = false;
    slot.material.opacity = 0;
  }

  /** Chaque +1 reçoit une lane unique — empilement vertical strict. */
  private reserveStackLane(): number {
    let maxLane = -1;
    for (const slot of this.slots) {
      if (!slot.active) continue;
      maxLane = Math.max(maxLane, slot.stackLane);
    }
    return maxLane + 1;
  }

  private place(slot: PickupSlot, t: number): void {
    if (!slot.follow) return;
    getPlayerHeadWorldPosition(slot.follow, this.head);
    const lift = Math.max(0, t);
    const laneLift = slot.stackLane * M4T3R_PICKUP_FX.stackLaneSpacingMeters;
    slot.sprite.position.set(
      this.head.x,
      this.head.y +
        M4T3R_PICKUP_FX.headOffsetMeters +
        laneLift +
        lift * M4T3R_PICKUP_FX.riseMeters,
      this.head.z
    );
  }

  private drawTemplate(): void {
    for (const slot of this.slots) {
      this.drawPlusOne(slot.canvas);
      slot.texture.needsUpdate = true;
    }
  }

  private drawPlusOne(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 240px Impact, "Arial Black", system-ui, sans-serif';
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    const x = width / 2;
    const y = height / 2 + 12;
    const glow = ctx.createRadialGradient(x, y, 18, x, y, width * 0.44);
    glow.addColorStop(0, `rgba(130,255,182,${M4T3R_PICKUP_FX.glowOpacity})`);
    glow.addColorStop(1, 'rgba(130,255,182,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, width * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 36;
    ctx.strokeStyle = '#041208';
    ctx.strokeText(M4T3R_PICKUP_FX.text, x, y);
    ctx.lineWidth = 16;
    ctx.strokeStyle = '#ffffff';
    ctx.strokeText(M4T3R_PICKUP_FX.text, x, y);
    ctx.fillStyle = '#1cff4a';
    ctx.fillText(M4T3R_PICKUP_FX.text, x, y);
    ctx.fillStyle = 'rgba(118, 244, 255, 0.34)';
    ctx.fillRect(x - 8, y + 20, 16, 86);
  }
}
