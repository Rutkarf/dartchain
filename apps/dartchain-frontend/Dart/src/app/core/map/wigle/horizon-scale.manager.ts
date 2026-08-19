import * as THREE from 'three';

import type { MapQuality } from '../map-configuration';
import { WORLD_BACKGROUND_CONFIG } from '../map-configuration';
import {
  HORIZON_SCALE_CONFIG,
  ROCKET_CONFIG,
  type HorizonScaleConfig,
} from './wigle-visual.config';
import type { HorizonScaleDebugStats } from './wigle.types';

interface RungPulse {
  mesh: THREE.Mesh;
  phase: number;
}

export class HorizonScaleManager {
  private root: THREE.Group | null = null;
  private rocketGroup: THREE.Group | null = null;
  private flameSprite: THREE.Sprite | null = null;
  private beaconSprite: THREE.Sprite | null = null;
  private skyFadeSprite: THREE.Sprite | null = null;
  private rungMeshes: RungPulse[] = [];
  private railMaterials: THREE.MeshStandardMaterial[] = [];
  private config: HorizonScaleConfig = HORIZON_SCALE_CONFIG;
  private quality: MapQuality = 'medium';
  private elapsed = 0;
  private rocketBaseY = 0;
  private anchorPosition = new THREE.Vector3();

  attach(scene: THREE.Scene, quality: MapQuality, config: HorizonScaleConfig = HORIZON_SCALE_CONFIG): void {
    this.quality = quality;
    this.config = config;
    this.root = new THREE.Group();
    this.root.name = 'horizon-scale';
    this.root.renderOrder = -40;
    this.root.scale.setScalar(config.visualScale);
    scene.add(this.root);

    this.buildScale();
    if (config.rocketEnabled && (quality !== 'low' || ROCKET_CONFIG.enabled)) {
      this.buildRocket();
    }
  }

  update(elapsedSeconds: number, cameraPosition: THREE.Vector3): void {
    this.elapsed = elapsedSeconds;
    if (!this.root) return;

    this.updateAnchor(cameraPosition);
    this.animateLadder(elapsedSeconds);
    this.animateRocket(elapsedSeconds, cameraPosition);
  }

  getDebugStats(cameraPosition: THREE.Vector3): HorizonScaleDebugStats {
    const rocketPos = this.rocketGroup
      ? this.rocketGroup.getWorldPosition(new THREE.Vector3())
      : new THREE.Vector3(
          this.anchorPosition.x,
          this.config.maxHeight,
          this.anchorPosition.z
        );
    return {
      scaleVisible: this.config.visible,
      scaleBaseHeight: this.config.baseHeight,
      scaleMaxHeight: this.config.maxHeight,
      scaleWorldUnit: 1,
      rocketVisible: this.rocketGroup?.visible ?? false,
      rocketWorldPosition: { x: rocketPos.x, y: rocketPos.y, z: rocketPos.z },
      rocketDistanceFromCamera: cameraPosition.distanceTo(rocketPos),
      rocketLod: this.rocketLod(),
    };
  }

  dispose(): void {
    if (this.root?.parent) {
      this.root.parent.remove(this.root);
    }
    this.disposeObject3D(this.root);
    this.root = null;
    this.rocketGroup = null;
    this.flameSprite = null;
    this.beaconSprite = null;
    this.skyFadeSprite = null;
    this.rungMeshes = [];
    this.railMaterials = [];
  }

  private updateAnchor(cameraPosition: THREE.Vector3): void {
    if (!this.root) return;

    if (this.config.anchorMode === 'camera-north') {
      this.anchorPosition.set(
        cameraPosition.x * this.config.parallaxXFactor,
        this.config.worldPosition.y,
        cameraPosition.z - this.config.horizonDistanceMeters
      );
      this.root.position.copy(this.anchorPosition);
    } else {
      this.root.position.set(
        this.config.worldPosition.x,
        this.config.worldPosition.y,
        this.config.worldPosition.z
      );
      this.anchorPosition.copy(this.root.position);
    }
  }

  private rocketLod(): HorizonScaleDebugStats['rocketLod'] {
    if (!this.config.rocketEnabled || !ROCKET_CONFIG.enabled) return 'off';
    if (this.quality === 'low') return 'static';
    if (this.quality === 'medium' || this.quality === 'high') return 'animated';
    return 'static';
  }

  private buildScale(): void {
    if (!this.root || !this.config.visible) return;

    const height = this.config.maxHeight - this.config.baseHeight;
    const fogColor = new THREE.Color(WORLD_BACKGROUND_CONFIG.fogColor);
    const horizonColor = new THREE.Color(WORLD_BACKGROUND_CONFIG.horizonColor);
    const accent = new THREE.Color(0x5efcff);
    const accentHot = new THREE.Color(0xff4fd8);

    this.buildLaunchPad(fogColor, accent);

    const railMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a2844,
      emissive: accent,
      emissiveIntensity: 0.55,
      metalness: 0.72,
      roughness: 0.32,
      transparent: true,
      opacity: 0.88,
      fog: true,
      depthWrite: false,
    });
    this.railMaterials.push(railMaterial);

    const railHeight = height * 0.94;
    const railGeo = new THREE.CylinderGeometry(0.14, 0.18, railHeight, 8);
    for (const x of [-1.05, 1.05]) {
      const rail = new THREE.Mesh(railGeo, railMaterial);
      rail.position.set(x, this.config.baseHeight + railHeight * 0.5, 0);
      rail.name = 'horizon-scale-rail';
      this.root.add(rail);
    }

    const rungMaterial = new THREE.MeshStandardMaterial({
      color: 0xd8f4ff,
      emissive: accent,
      emissiveIntensity: 0.85,
      metalness: 0.55,
      roughness: 0.25,
      transparent: true,
      opacity: 0.92,
      fog: true,
      depthWrite: false,
    });

    const rungGeo = new THREE.BoxGeometry(2.35, 0.11, 0.22);
    for (let i = 0; i <= this.config.tickCount; i++) {
      const t = i / this.config.tickCount;
      const y = this.config.baseHeight + height * t;
      const rung = new THREE.Mesh(rungGeo, rungMaterial.clone());
      rung.position.set(0, y, 0.08);
      rung.name = 'horizon-scale-rung';
      this.root.add(rung);
      this.rungMeshes.push({ mesh: rung, phase: t * Math.PI * 2 });
    }

    const spineMaterial = new THREE.LineBasicMaterial({
      color: accentHot.clone().lerp(accent, 0.35).getHex(),
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      fog: true,
      toneMapped: false,
    });
    const spinePoints = [
      new THREE.Vector3(0, this.config.baseHeight + 2, 0),
      new THREE.Vector3(0, this.config.maxHeight + 6, 0),
    ];
    const spine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(spinePoints),
      spineMaterial
    );
    spine.name = 'horizon-scale-spine';
    this.root.add(spine);

    this.skyFadeSprite = this.createVerticalGradientSprite(
      128,
      512,
      [
        { stop: 0, color: 'rgba(111,247,255,0.22)' },
        { stop: 0.35, color: 'rgba(95,180,255,0.12)' },
        { stop: 0.72, color: 'rgba(17,26,56,0.08)' },
        { stop: 1, color: 'rgba(17,26,56,0)' },
      ],
      3.8,
      height * 0.55
    );
    this.skyFadeSprite.position.y = this.config.baseHeight + height * 0.72;
    this.skyFadeSprite.name = 'horizon-scale-sky-fade';
    this.root.add(this.skyFadeSprite);

    const baseGlow = this.createVerticalGradientSprite(
      96,
      96,
      [
        { stop: 0, color: 'rgba(255,79,216,0.35)' },
        { stop: 0.55, color: 'rgba(95,252,255,0.18)' },
        { stop: 1, color: 'rgba(17,26,56,0)' },
      ],
      5.6,
      2.4
    );
    baseGlow.position.y = this.config.baseHeight + 0.4;
    baseGlow.name = 'horizon-scale-base-glow';
    this.root.add(baseGlow);

    const mistRing = new THREE.Mesh(
      new THREE.RingGeometry(2.2, 4.8, 32),
      new THREE.MeshBasicMaterial({
        color: horizonColor,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        fog: true,
        side: THREE.DoubleSide,
      })
    );
    mistRing.rotation.x = -Math.PI / 2;
    mistRing.position.y = this.config.baseHeight + 0.05;
    mistRing.name = 'horizon-scale-mist-ring';
    this.root.add(mistRing);
  }

  private buildLaunchPad(fogColor: THREE.Color, accent: THREE.Color): void {
    if (!this.root) return;

    const padMaterial = new THREE.MeshStandardMaterial({
      color: 0x0c1428,
      emissive: accent,
      emissiveIntensity: 0.28,
      metalness: 0.62,
      roughness: 0.48,
      transparent: true,
      opacity: 0.78,
      fog: true,
      depthWrite: false,
    });

    const pad = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 4.2, 0.42, 8), padMaterial);
    pad.position.y = this.config.baseHeight + 0.22;
    pad.name = 'horizon-scale-pad';
    this.root.add(pad);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(3.5, 0.08, 8, 32),
      new THREE.MeshBasicMaterial({
        color: 0xff4fd8,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
        fog: false,
        toneMapped: false,
      })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = this.config.baseHeight + 0.46;
    ring.name = 'horizon-scale-pad-ring';
    this.root.add(ring);
  }

  private buildRocket(): void {
    if (!this.root) return;

    this.rocketGroup = new THREE.Group();
    this.rocketGroup.name = 'horizon-rocket';
    this.rocketBaseY = this.config.maxHeight + 2.4;
    this.rocketGroup.position.y = this.rocketBaseY;
    this.rocketGroup.scale.setScalar(ROCKET_CONFIG.scale);

    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0xe8f0ff,
      metalness: 0.78,
      roughness: 0.22,
      emissive: 0x2a4068,
      emissiveIntensity: 0.45,
      fog: true,
    });
    const accentMaterial = new THREE.MeshStandardMaterial({
      color: 0xff4fd8,
      emissive: 0xff4fd8,
      emissiveIntensity: 0.85,
      metalness: 0.42,
      roughness: 0.18,
      fog: true,
    });

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.82, 3.6, 12), bodyMaterial);
    body.position.y = 1.8;
    this.rocketGroup.add(body);

    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.65, 12), accentMaterial);
    nose.position.y = 4.35;
    this.rocketGroup.add(nose);

    const finGeometry = new THREE.BoxGeometry(0.14, 1.05, 0.82);
    for (const angle of [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3]) {
      const fin = new THREE.Mesh(finGeometry, accentMaterial);
      fin.position.set(Math.sin(angle) * 0.82, 0.62, Math.cos(angle) * 0.82);
      fin.rotation.y = angle;
      this.rocketGroup.add(fin);
    }

    const window = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0x7cf9ff, fog: false, toneMapped: false })
    );
    window.position.set(0, 2.35, 0.66);
    this.rocketGroup.add(window);

    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(1.35, 1.55, 0.22, 10),
      new THREE.MeshStandardMaterial({
        color: 0x101828,
        emissive: 0x0f2740,
        emissiveIntensity: 0.55,
        metalness: 0.55,
        roughness: 0.42,
        fog: true,
      })
    );
    pad.position.y = -0.14;
    this.rocketGroup.add(pad);

    this.beaconSprite = this.createVerticalGradientSprite(
      64,
      64,
      [
        { stop: 0, color: 'rgba(255,255,255,0.95)' },
        { stop: 0.4, color: 'rgba(124,249,255,0.55)' },
        { stop: 1, color: 'rgba(255,79,216,0)' },
      ],
      2.8,
      2.8
    );
    this.beaconSprite.position.y = 5.8;
    this.beaconSprite.name = 'horizon-rocket-beacon';
    this.rocketGroup.add(this.beaconSprite);

    if (this.quality !== 'low') {
      const flameCanvas = document.createElement('canvas');
      flameCanvas.width = 64;
      flameCanvas.height = 128;
      const ctx = flameCanvas.getContext('2d');
      if (ctx) {
        const gradient = ctx.createLinearGradient(32, 0, 32, 128);
        gradient.addColorStop(0, 'rgba(255,240,120,0.98)');
        gradient.addColorStop(0.35, 'rgba(255,140,40,0.82)');
        gradient.addColorStop(0.72, 'rgba(255,60,20,0.45)');
        gradient.addColorStop(1, 'rgba(255,60,20,0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(32, 0);
        ctx.quadraticCurveTo(58, 58, 32, 128);
        ctx.quadraticCurveTo(6, 58, 32, 0);
        ctx.fill();
      }
      const flameTexture = new THREE.CanvasTexture(flameCanvas);
      flameTexture.generateMipmaps = false;
      flameTexture.minFilter = THREE.LinearFilter;
      const flameMaterial = new THREE.SpriteMaterial({
        map: flameTexture,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
        toneMapped: false,
      });
      this.flameSprite = new THREE.Sprite(flameMaterial);
      this.flameSprite.position.y = -1.05;
      this.flameSprite.scale.set(2.1, 3.4, 1);
      this.flameSprite.visible =
        this.quality === 'high' ||
        (this.quality === 'medium' && ROCKET_CONFIG.flameEnabledFromQuality !== 'high');
      this.rocketGroup.add(this.flameSprite);
    }

    this.root.add(this.rocketGroup);
  }

  private animateLadder(elapsedSeconds: number): void {
    const waveSpeed = 1.35;
    const wave = elapsedSeconds * waveSpeed;

    for (const { mesh, phase } of this.rungMeshes) {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      const pulse = 0.42 + Math.max(0, Math.sin(wave * Math.PI * 2 - phase)) * 0.58;
      mat.emissiveIntensity = 0.55 + pulse * 0.85;
      mat.opacity = 0.55 + pulse * 0.38;
    }

    for (const mat of this.railMaterials) {
      mat.emissiveIntensity = 0.38 + Math.sin(elapsedSeconds * 0.9) * 0.12;
    }

    if (this.skyFadeSprite) {
      const mat = this.skyFadeSprite.material as THREE.SpriteMaterial;
      mat.opacity = 0.62 + Math.sin(elapsedSeconds * 0.55) * 0.08;
    }
  }

  private animateRocket(elapsedSeconds: number, cameraPosition: THREE.Vector3): void {
    if (!this.rocketGroup) return;

    const lod = this.rocketLod();
    if (lod === 'off') {
      this.rocketGroup.visible = false;
      return;
    }

    this.rocketGroup.visible = true;

    const dx = cameraPosition.x - this.anchorPosition.x;
    const dz = cameraPosition.z - this.anchorPosition.z;
    this.rocketGroup.rotation.y = Math.atan2(dx, dz);

    const hover =
      lod === 'animated'
        ? Math.sin(elapsedSeconds * ROCKET_CONFIG.hoverFrequency * Math.PI * 2) *
          ROCKET_CONFIG.hoverAmplitude
        : 0;
    this.rocketGroup.position.y = this.rocketBaseY + hover;

    if (this.beaconSprite) {
      const mat = this.beaconSprite.material as THREE.SpriteMaterial;
      mat.opacity = 0.72 + Math.sin(elapsedSeconds * 2.4) * 0.18;
      this.beaconSprite.scale.setScalar(2.8 + Math.sin(elapsedSeconds * 1.6) * 0.25);
    }

    if (this.flameSprite) {
      this.flameSprite.visible = lod === 'animated';
      if (this.flameSprite.visible) {
        const pulse = 0.88 + Math.sin(elapsedSeconds * 8) * 0.14;
        this.flameSprite.scale.set(2.1 * pulse, 3.4 * pulse, 1);
        const material = this.flameSprite.material as THREE.SpriteMaterial;
        material.opacity = 0.55 + Math.sin(elapsedSeconds * 10) * 0.18;
      }
    }
  }

  private createVerticalGradientSprite(
    width: number,
    height: number,
    stops: { stop: number; color: string }[],
    scaleX: number,
    scaleY: number
  ): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createLinearGradient(0, height, 0, 0);
      for (const { stop, color } of stops) {
        gradient.addColorStop(stop, color);
      }
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
      toneMapped: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(scaleX, scaleY, 1);
    return sprite;
  }

  private disposeObject3D(object: THREE.Object3D | null): void {
    if (!object) return;
    object.traverse((node) => {
      const mesh = node as THREE.Mesh;
      mesh.geometry?.dispose?.();
      const material = mesh.material;
      if (Array.isArray(material)) {
        material.forEach((m) => m.dispose?.());
      } else {
        material?.dispose?.();
      }
    });
  }
}
