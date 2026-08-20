import * as THREE from 'three';
import {
  STAR_CONQUEST_SCALE,
  scaledTextureSize,
  starConquestDepthDensity,
  type StarConquestGpuQuality,
} from './star-conquest-scale';
import { STAR_DEPTH_LAYERS, type StarDepthLayerId } from './star-conquest-depth';
import type { StarConquestUniverseTheme } from './star-conquest-universe.types';
import { createSoftDiscTexture } from './star-conquest-visuals';
import { createStarConquestAuroraMaterial } from './shaders/star-conquest-aurora.shader';
import {
  questEchoOffset,
  type StarQuestAnchor,
} from './star-conquest-anchors';
import {
  STAR_CONQUEST_REST_GLOW,
  starConquestGalaxyRadius,
  starConquestMobileQuality,
} from './star-conquest-ui-maturity.config';

const LAYER_IDS: StarDepthLayerId[] = ['far', 'mid', 'near'];
const ECHOES_PER_QUEST: Record<StarDepthLayerId, number> = {
  far: 1,
  mid: 1,
  near: 1,
  interactive: 0,
};

/**
 * Fond Star Conquest : aurore shader + échos de profondeur.
 * Chaque étoile far/mid/near est rattachée à une Quest du catalogue.
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
  private gpuQuality: StarConquestGpuQuality = 'medium';
  private auroraTint: readonly [number, number, number] = [1, 0.78, 0.32];
  private theme: StarConquestUniverseTheme | null = null;
  private anchors: readonly StarQuestAnchor[] = [];
  private echoSignature = '';
  private pointerNdc: { x: number; y: number } | null = null;

  constructor() {
    this.group.name = 'star-conquest-background';
    this.discTexture = createSoftDiscTexture(scaledTextureSize(48));
    this.auroraMat = createStarConquestAuroraMaterial();
    const bowlR = starConquestGalaxyRadius() * 1.18;
    const auroraGeom = new THREE.CircleGeometry(bowlR, 64);
    this.auroraMesh = new THREE.Mesh(auroraGeom, this.auroraMat);
    this.auroraMesh.name = 'sc-aurora-plane';
    this.auroraMesh.position.z = -180 * STAR_CONQUEST_SCALE.worldExtent;
    this.auroraMesh.renderOrder = -10;
    this.group.add(this.auroraMesh);

    for (const id of LAYER_IDS) {
      const layer = this.buildDepthLayer(id, 0);
      this.depthLayers.set(id, layer);
      this.group.add(layer);
    }
  }

  setGpuQuality(quality: StarConquestGpuQuality): void {
    this.gpuQuality = quality;
  }

  applyUniverse(theme: StarConquestUniverseTheme): void {
    this.theme = theme;
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
    this.auroraTint = theme.auroraRgb;
    this.auroraMat.uniforms['uIntensity'].value =
      (theme.showDepthStars ? 0.42 : 0.28) * STAR_CONQUEST_REST_GLOW.auroraRestMul;
    this.auroraMat.uniforms['uContain'].value = 0.42;
    this.auroraMesh.visible = true;
    this.echoSignature = '';
    this.rebuildQuestEchoes();
  }

  setPointerNdc(ndc: { x: number; y: number } | null): void {
    this.pointerNdc = ndc;
  }

  /** Recale les étoiles de fond sur les Quests (1 écho = 1 Quest). */
  followQuestAnchors(anchors: readonly StarQuestAnchor[]): void {
    this.anchors = anchors;
    const signature = `${anchors.length}:${this.gpuQuality}:${this.theme?.id ?? ''}`;
    if (signature !== this.echoSignature) {
      this.echoSignature = signature;
      this.rebuildQuestEchoes();
      return;
    }
    this.writeEchoPositions();
  }

  tick(deltaMs: number): void {
    this.time += deltaMs * 0.001;
    this.auroraMat.uniforms['uTime'].value = this.time;

    this.depthTickAcc += deltaMs;
    if (this.depthTickAcc < 33) return;
    this.depthTickAcc = 0;

    this.writeEchoPositions();
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
    const r = ((cfg.color >> 16) & 255) / 255 * 0.35 + this.auroraTint[0] * 0.65;
    const g = ((cfg.color >> 8) & 255) / 255 * 0.35 + this.auroraTint[1] * 0.65;
    const b = (cfg.color & 255) / 255 * 0.4 + this.auroraTint[2] * 0.6;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 240 * STAR_CONQUEST_SCALE.worldExtent;
      positions[i3 + 1] = (Math.random() - 0.5) * 520 * STAR_CONQUEST_SCALE.worldExtent;
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
      // Brume de profondeur — clairement distincte des nœuds QUEST (cores flarés)
      size: cfg.size * 0.45 * STAR_CONQUEST_SCALE.visual,
      map: this.discTexture,
      transparent: true,
      opacity: Math.min(0.45, cfg.opacity * 0.85),
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
    (existing.material as THREE.Material).dispose();
    this.depthBasePositions.delete(id);
    const fresh = this.buildDepthLayer(id, count);
    existing.geometry = fresh.geometry;
    existing.material = fresh.material;
    existing.visible = count > 0;
  }

  private rebuildQuestEchoes(): void {
    const theme = this.theme;
    const n = this.anchors.length;
    const density = starConquestDepthDensity(this.gpuQuality);
    for (const id of LAYER_IDS) {
      const perQuest =
        theme?.showDepthStars && n > 0
          ? Math.max(1, Math.round(ECHOES_PER_QUEST[id] * Math.min(density, 1.35)))
          : 0;
      this.rebuildDepthLayer(id, perQuest * n);
    }
    this.writeEchoPositions(true);
  }

  private writeEchoPositions(storeBase = false): void {
    const n = this.anchors.length;
    if (n === 0) return;
    for (const id of LAYER_IDS) {
      const points = this.depthLayers.get(id);
      if (!points?.visible) continue;
      const cfg = STAR_DEPTH_LAYERS[id];
      const pos = points.geometry.getAttribute('position') as THREE.BufferAttribute;
      const colors = points.geometry.getAttribute('color') as THREE.BufferAttribute;
      const perQuest = Math.max(1, Math.floor(pos.count / n));
      const t = this.time * cfg.driftSpeed;
      const radius = (id === 'far' ? 22 : id === 'mid' ? 14 : 8) * STAR_CONQUEST_SCALE.layout;
      const galaxy = starConquestGalaxyRadius();
      const contain =
        id === 'far' ? galaxy * 0.96 : id === 'mid' ? galaxy * 0.72 : galaxy * 0.5;
      const mq = starConquestMobileQuality(this.gpuQuality);
      const px = (this.pointerNdc?.x ?? 0) * cfg.parallax * 20 * mq.echoParallax;
      const py = (this.pointerNdc?.y ?? 0) * cfg.parallax * 16 * mq.echoParallax;
      for (let i = 0; i < pos.count; i++) {
        const quest = this.anchors[Math.floor(i / perQuest) % n];
        const echo = i % perQuest;
        const off = questEchoOffset(quest.id, `${id}:${echo}`, radius);
        const phase = i * 0.37;
        let x = quest.x + off.x + Math.sin(t + phase) * 0.35 * cfg.driftAmp + px;
        let y = quest.y + off.y + Math.cos(t * 0.8 + phase) * 0.28 * cfg.driftAmp + py;
        const z = quest.z + off.z + cfg.zCenter * 0.42;
        const span = Math.hypot(x, y);
        if (span > contain && span > 0.001) {
          const s = contain / span;
          x *= s;
          y *= s;
        }
        pos.setXYZ(i, x, y, z);
        if (storeBase && colors) {
          colors.setXYZ(
            i,
            quest.rgb[0] * 0.55 + this.auroraTint[0] * 0.45,
            quest.rgb[1] * 0.55 + this.auroraTint[1] * 0.45,
            quest.rgb[2] * 0.55 + this.auroraTint[2] * 0.45
          );
        }
      }
      pos.needsUpdate = true;
      if (storeBase && colors) colors.needsUpdate = true;
      if (storeBase) {
        const packed = pos.array as Float32Array;
        this.depthBasePositions.set(id, packed.slice());
      }
    }
  }
}
