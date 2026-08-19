import * as THREE from 'three';
import { STAR_DEPTH_LAYERS, type StarDepthLayerId } from './star-conquest-depth';
import type { StarConquestUniverseTheme } from './star-conquest-universe.types';
import { createSoftDiscTexture } from './star-conquest-visuals';
import { createStarConquestAuroraMaterial } from './shaders/star-conquest-aurora.shader';

const LAYER_IDS: StarDepthLayerId[] = ['far', 'mid', 'near'];

/**
 * Fond Star Conquest : aurore shader + couches d’étoiles décoratives (far/mid/near).
 */
export class StarConquestBackground {
  readonly group = new THREE.Group();
  private readonly auroraMesh: THREE.Mesh;
  private readonly auroraMat: THREE.ShaderMaterial;
  private readonly depthLayers = new Map<StarDepthLayerId, THREE.Points>();
  private readonly depthBasePositions = new Map<StarDepthLayerId, Float32Array>();
  private depthTickAcc = 0;
  private readonly discTexture: THREE.CanvasTexture;
  private time = 0;

  constructor() {
    this.group.name = 'star-conquest-background';
    this.discTexture = createSoftDiscTexture(48);
    this.auroraMat = createStarConquestAuroraMaterial();
    const auroraGeom = new THREE.PlaneGeometry(520, 920);
    this.auroraMesh = new THREE.Mesh(auroraGeom, this.auroraMat);
    this.auroraMesh.name = 'sc-aurora-plane';
    this.auroraMesh.position.z = -180;
    this.auroraMesh.renderOrder = -10;
    this.group.add(this.auroraMesh);

    for (const id of LAYER_IDS) {
      const layer = this.buildDepthLayer(id, 0);
      this.depthLayers.set(id, layer);
      this.group.add(layer);
    }
  }

  applyUniverse(theme: StarConquestUniverseTheme): void {
    this.auroraMat.uniforms['uColorA'].value.set(
      theme.auroraRgb[0],
      theme.auroraRgb[1],
      theme.auroraRgb[2]
    );
    this.auroraMat.uniforms['uColorB'].value.set(
      theme.auroraSecondaryRgb[0],
      theme.auroraSecondaryRgb[1],
      theme.auroraSecondaryRgb[2]
    );
    this.auroraMat.uniforms['uIntensity'].value = theme.showDepthStars ? 0.72 : 0.48;
    this.auroraMesh.visible = true;

    const counts: Record<StarDepthLayerId, number> = {
      far: theme.showDepthStars ? theme.depthFarCount : 0,
      mid: theme.showDepthStars ? theme.depthMidCount : 0,
      near: theme.showDepthStars ? theme.depthNearCount : 0,
      interactive: 0,
    };

    for (const id of LAYER_IDS) {
      this.rebuildDepthLayer(id, counts[id]);
    }
  }

  tick(deltaMs: number): void {
    this.time += deltaMs * 0.001;
    this.auroraMat.uniforms['uTime'].value = this.time;

    this.depthTickAcc += deltaMs;
    if (this.depthTickAcc < 33) return;
    this.depthTickAcc = 0;

    for (const [id, points] of this.depthLayers) {
      if (!points.visible) continue;
      const base = this.depthBasePositions.get(id);
      if (!base) continue;
      const cfg = STAR_DEPTH_LAYERS[id];
      const pos = points.geometry.getAttribute('position') as THREE.BufferAttribute;
      const t = this.time * cfg.driftSpeed;
      for (let i = 0; i < pos.count; i++) {
        const i3 = i * 3;
        const phase = i * 0.37;
        pos.setX(i, base[i3] + Math.sin(t + phase) * 0.35 * cfg.driftAmp);
        pos.setY(i, base[i3 + 1] + Math.cos(t * 0.8 + phase) * 0.28 * cfg.driftAmp);
        pos.setZ(i, base[i3 + 2]);
      }
      pos.needsUpdate = true;
    }
  }

  dispose(): void {
    this.auroraMesh.geometry.dispose();
    this.auroraMat.dispose();
    for (const points of this.depthLayers.values()) {
      points.geometry.dispose();
      (points.material as THREE.Material).dispose();
    }
    this.discTexture.dispose();
  }

  private buildDepthLayer(id: StarDepthLayerId, count: number): THREE.Points {
    const cfg = STAR_DEPTH_LAYERS[id];
    const positions = new Float32Array(Math.max(count, 1) * 3);
    const colors = new Float32Array(Math.max(count, 1) * 3);
    const r = ((cfg.color >> 16) & 255) / 255;
    const g = ((cfg.color >> 8) & 255) / 255;
    const b = (cfg.color & 255) / 255;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 240;
      positions[i3 + 1] = (Math.random() - 0.5) * 520;
      positions[i3 + 2] =
        cfg.zCenter + (Math.random() - 0.5) * cfg.zSpread * 2;
      colors[i3] = r;
      colors[i3 + 1] = g;
      colors[i3 + 2] = b;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      size: cfg.size,
      map: this.discTexture,
      transparent: true,
      opacity: cfg.opacity,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const points = new THREE.Points(geom, mat);
    points.name = `sc-depth-${id}`;
    points.frustumCulled = false;
    points.visible = count > 0;
    points.raycast = () => {};
    points.renderOrder = -5;
    if (count > 0) {
      this.depthBasePositions.set(id, positions.slice());
    }
    return points;
  }

  private rebuildDepthLayer(id: StarDepthLayerId, count: number): void {
    const existing = this.depthLayers.get(id);
    if (!existing) return;
    existing.geometry.dispose();
    this.depthBasePositions.delete(id);
    const fresh = this.buildDepthLayer(id, count);
    existing.geometry = fresh.geometry;
    existing.material = fresh.material;
    existing.visible = count > 0;
    fresh.geometry.dispose();
    (fresh.material as THREE.Material).dispose();
  }
}
