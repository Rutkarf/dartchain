import { Injectable } from '@angular/core';
import * as THREE from 'three';

import {
  M4T3R_COIN_PICKUP_FX,
  M4T3R_DENSITY_CONFIG,
  M4T3R_RENDER_CONFIG,
  R4V3_GROUND_FIELD,
} from './map-configuration';

const PICKUP_COLORS = [0x40e0ff, 0xff3ecf, 0x7a5cff, 0xffe600, 0x51ffb8] as const;

interface CoinPickupSlot {
  coin: THREE.Mesh;
  sparkle: THREE.Mesh;
  burst: THREE.Mesh;
  material: THREE.MeshStandardMaterial;
  sparkleMaterial: THREE.MeshBasicMaterial;
  burstMaterial: THREE.MeshBasicMaterial;
  age: number;
  active: boolean;
  renderKey: string;
  startX: number;
  startY: number;
  startZ: number;
  spin: number;
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function hashRenderKeyColor(renderKey: string): number {
  let hash = 0;
  for (let i = 0; i < renderKey.length; i++) {
    hash = (hash * 31 + renderKey.charCodeAt(i)) | 0;
  }
  return PICKUP_COLORS[Math.abs(hash) % PICKUP_COLORS.length];
}

function createPickupCoinGeometry(): THREE.BufferGeometry {
  const radius = R4V3_GROUND_FIELD.tokenRadius * M4T3R_RENDER_CONFIG.heightMultiplier;
  const thickness = R4V3_GROUND_FIELD.tokenThickness * M4T3R_RENDER_CONFIG.heightMultiplier;
  const geometry = new THREE.CylinderGeometry(radius, radius, thickness, 8);
  geometry.rotateZ(Math.PI / 2);
  return geometry;
}

/**
 * Animation 3D type Mario — une pièce par token visuel au centre de la cellule.
 */
@Injectable({ providedIn: 'root' })
export class M4t3rCoinPickupFxService {
  private readonly slots: CoinPickupSlot[] = [];
  private scene: THREE.Scene | null = null;
  private sharedGeometry: THREE.BufferGeometry | null = null;
  private spawnCounter = 0;

  attach(scene: THREE.Scene): void {
    this.dispose();
    this.scene = scene;
    this.sharedGeometry = createPickupCoinGeometry();
    for (let i = 0; i < M4T3R_COIN_PICKUP_FX.poolSize; i++) {
      const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0x40e0ff,
        emissiveIntensity: 0.55,
        metalness: 0.42,
        roughness: 0.22,
        transparent: true,
        opacity: 1,
        depthWrite: false,
      });
      const coin = new THREE.Mesh(this.sharedGeometry, material);
      coin.name = `m4t3r-coin-pickup-${i}`;
      coin.visible = false;
      coin.frustumCulled = false;
      coin.renderOrder = 20;

      const sparkleMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const sparkle = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.32, 20), sparkleMaterial);
      sparkle.name = `m4t3r-coin-pickup-sparkle-${i}`;
      sparkle.rotation.x = -Math.PI / 2;
      sparkle.visible = false;
      sparkle.frustumCulled = false;
      sparkle.renderOrder = 19;

      const burstMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const burst = new THREE.Mesh(new THREE.RingGeometry(0.04, 0.18, 16), burstMaterial);
      burst.name = `m4t3r-coin-pickup-burst-${i}`;
      burst.rotation.x = -Math.PI / 2;
      burst.visible = false;
      burst.frustumCulled = false;
      burst.renderOrder = 18;

      scene.add(coin);
      scene.add(sparkle);
      scene.add(burst);
      this.slots.push({
        coin,
        sparkle,
        burst,
        material,
        sparkleMaterial,
        burstMaterial,
        age: 0,
        active: false,
        renderKey: '',
        startX: 0,
        startY: 0,
        startZ: 0,
        spin: 0,
      });
    }
  }

  spawnAt(renderKey: string, x: number, groundY: number, z: number): boolean {
    const slot = this.acquireSlot();
    if (!slot) return false;

    const y = groundY + M4T3R_DENSITY_CONFIG.groundY * 0.08;
    this.spawnCounter += 1;

    const color = hashRenderKeyColor(renderKey);
    slot.material.color.setHex(0xffffff);
    slot.material.emissive.setHex(color);
    slot.material.emissiveIntensity =
      M4T3R_COIN_PICKUP_FX.emissiveBase + M4T3R_COIN_PICKUP_FX.emissivePulse;
    slot.sparkleMaterial.color.setHex(color);
    slot.burstMaterial.color.setHex(color);

    slot.active = true;
    slot.age = 0;
    slot.renderKey = renderKey;
    slot.startX = x;
    slot.startY = y;
    slot.startZ = z;
    slot.spin = this.spawnCounter * 0.9;

    slot.coin.visible = true;
    slot.sparkle.visible = true;
    slot.burst.visible = true;
    slot.coin.position.set(x, y, z);
    slot.coin.scale.setScalar(0.15);
    slot.coin.rotation.set(0, slot.spin, 0);
    slot.material.opacity = 1;
    return true;
  }

  update(deltaSeconds: number): void {
    const duration = M4T3R_COIN_PICKUP_FX.durationMs / 1000;
    for (const slot of this.slots) {
      if (!slot.active) continue;
      slot.age += deltaSeconds;
      const t = Math.min(1, slot.age / duration);

      const popPhase = Math.min(1, t / 0.18);
      const pop = easeOutBack(popPhase);
      const risePhase = Math.min(1, Math.max(0, (t - 0.1) / 0.72));
      const rise = easeOutQuart(risePhase);
      const hang = t > 0.78 ? 1 - easeOutCubic((t - 0.78) / 0.22) : 1;

      const x = slot.startX;
      const z = slot.startZ;
      const y =
        slot.startY +
        pop * M4T3R_COIN_PICKUP_FX.popHeight +
        rise * M4T3R_COIN_PICKUP_FX.riseMeters;

      slot.coin.position.set(x, y, z);
      slot.coin.rotation.y = slot.spin + slot.age * M4T3R_COIN_PICKUP_FX.spinSpeed;
      slot.coin.rotation.x = Math.sin(slot.age * M4T3R_COIN_PICKUP_FX.flipSpeed) * 0.42;
      slot.coin.rotation.z = Math.cos(slot.age * M4T3R_COIN_PICKUP_FX.flipSpeed * 0.85) * 0.08;

      let scale: number = M4T3R_COIN_PICKUP_FX.startScale;
      if (t < 0.14) {
        const s = easeOutBack(t / 0.14);
        scale = THREE.MathUtils.lerp(0.15, M4T3R_COIN_PICKUP_FX.peakScale, s);
      } else if (t > 0.72) {
        scale = THREE.MathUtils.lerp(
          M4T3R_COIN_PICKUP_FX.peakScale,
          0.04,
          (t - 0.72) / 0.28
        );
        slot.material.opacity = Math.max(0, hang);
      } else {
        scale = M4T3R_COIN_PICKUP_FX.peakScale;
        slot.material.opacity = 1;
      }
      slot.coin.scale.setScalar(scale);
      slot.material.emissiveIntensity =
        M4T3R_COIN_PICKUP_FX.emissiveBase + (1 - t) * M4T3R_COIN_PICKUP_FX.emissivePulse;

      const sparkleT = Math.min(1, t / 0.32);
      const sparkleFade = t > 0.28 ? 1 - (t - 0.28) / 0.55 : 1;
      slot.sparkle.position.set(x, y + 0.03, z);
      slot.sparkle.scale.setScalar(
        THREE.MathUtils.lerp(0.35, M4T3R_COIN_PICKUP_FX.sparkleScale, sparkleT) * sparkleFade
      );
      slot.sparkleMaterial.opacity = 0.65 * sparkleFade * (1 - t * 0.85);

      const burstT = Math.min(1, t / 0.12);
      const burstFade = 1 - burstT;
      slot.burst.position.set(x, slot.startY + 0.01, z);
      slot.burst.scale.setScalar(
        THREE.MathUtils.lerp(0.5, M4T3R_COIN_PICKUP_FX.burstScale, burstT) * burstFade
      );
      slot.burstMaterial.opacity = 0.75 * burstFade;

      if (t >= 1) {
        this.releaseSlot(slot);
      }
    }
  }

  dispose(): void {
    for (const slot of this.slots) {
      this.scene?.remove(slot.coin);
      this.scene?.remove(slot.sparkle);
      this.scene?.remove(slot.burst);
      slot.material.dispose();
      slot.sparkleMaterial.dispose();
      slot.burstMaterial.dispose();
      slot.sparkle.geometry.dispose();
      slot.burst.geometry.dispose();
    }
    this.slots.length = 0;
    this.sharedGeometry?.dispose();
    this.sharedGeometry = null;
    this.scene = null;
  }

  private acquireSlot(): CoinPickupSlot | undefined {
    let slot = this.slots.find((item) => !item.active);
    if (slot) return slot;
    const oldest = this.findOldestActiveSlot();
    if (oldest) this.releaseSlot(oldest);
    return this.slots.find((item) => !item.active);
  }

  private findOldestActiveSlot(): CoinPickupSlot | undefined {
    let oldest: CoinPickupSlot | undefined;
    for (const slot of this.slots) {
      if (!slot.active) continue;
      if (!oldest || slot.age > oldest.age) oldest = slot;
    }
    return oldest;
  }

  private releaseSlot(slot: CoinPickupSlot): void {
    slot.active = false;
    slot.renderKey = '';
    slot.coin.visible = false;
    slot.sparkle.visible = false;
    slot.burst.visible = false;
    slot.material.opacity = 1;
    slot.material.emissiveIntensity = M4T3R_COIN_PICKUP_FX.emissiveBase;
  }
}
