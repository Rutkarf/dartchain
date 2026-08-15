import * as THREE from 'three';
import {
  blendFamilyRgb,
  familyTheme,
} from './star-conquest-families';
import type { StarQuest, StarQuestRarity, StarQuestStatus } from './star-conquest.model';
import {
  createSoftDiscTexture,
  sizeFromReward,
} from './star-conquest-visuals';
import {
  STAR_DEPTH_LAYERS,
  parallaxScaleForViewport,
} from './star-conquest-depth';
import { STAR_CONSTELLATIONS } from './star-conquest-constellations';

function hashFloat(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

const RARITY_BOOST: Record<StarQuestRarity, number> = {
  common: 0,
  rare: 0.15,
  epic: 0.28,
  legendary: 0.42,
};

const STATUS_BRIGHT: Record<StarQuestStatus, number> = {
  available: 1.05,
  locked: 0.42,
  active: 1.12,
  completed: 0.9,
  future: 0.38,
};

const LINKED_BOOST = 1.18;
const DIM_FACTOR = 0.38;
const MAX_ENERGY_PACKETS = 10;
/** Brins par arête — un filament clair (liaison fiable entre particules). */
const LINE_STRANDS = 1;
/** Cadre ping-pong hors viewport visible (app 250×550 → table 260×560). */
export const STAR_PONG_OUTER_W = 260;
export const STAR_PONG_OUTER_H = 560;
const PONG_RESTITUTION = 0.92;
const PONG_RANDOM_KICK = 0.55;

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export interface StarConquestHit {
  questId: string;
  index: number;
  worldPosition: THREE.Vector3;
}

export interface StarQuestScreenPos {
  id: string;
  x: number;
  y: number;
  reward: number;
  family: StarQuest['family'];
  rarity: StarQuestRarity;
  /** Profondeur relative [-1…1] pour labels diffus. */
  depth: number;
}

// [starConquest 2026-08] Désactivation des lignes neuronales visuelles.
// Les particules et tous les effets associés (glow, trails, energy packets, etc.) sont conservés.
// Objectif : préparer l’intégration du Character NFT et de la ville 3D.
/**
 * Nœuds (noyau + halo) + liens + paquets d’énergie sur liens actifs.
 */
export class StarConquestGraph {
  readonly group = new THREE.Group();
  readonly questPoints: THREE.Points;
  readonly haloPoints: THREE.Points;
  readonly connectionLines: THREE.LineSegments;
  readonly constellationGuides: THREE.LineSegments;
  readonly energyPackets: THREE.Points;

  private readonly quests: StarQuest[];
  private readonly idToIndex = new Map<string, number>();
  private readonly baseColors: Float32Array;
  private readonly homePositions: Float32Array;
  /** Ancres du dernier layout structure (centré 250×550) — hors dérive / évitement. */
  private readonly layoutHomes: Float32Array;
  private readonly driftPhase: Float32Array;
  /** Rayon max autour de l’ancrage (monde). */
  private readonly driftRadius: Float32Array;
  private readonly driftAmpX: Float32Array;
  private readonly driftAmpY: Float32Array;
  private readonly driftAmpZ: Float32Array;
  private readonly driftSpeed: Float32Array;
  private readonly driftFreq: Float32Array;
  private readonly driftNoise: Float32Array;
  /** Vitesse courante (wander 3D). */
  private readonly velX: Float32Array;
  private readonly velY: Float32Array;
  private readonly velZ: Float32Array;
  /** Direction cible lente (change progressivement). */
  private readonly aimX: Float32Array;
  private readonly aimY: Float32Array;
  private readonly aimZ: Float32Array;
  private readonly aimTimer: Float32Array;
  private readonly linePositions: Float32Array;
  private readonly lineColors: Float32Array;
  private readonly edgePairs: Array<[number, number]> = [];
  private readonly constellationPairs: Array<[number, number]> = [];
  private readonly constellationPositions: Float32Array;
  private readonly discTexture: THREE.CanvasTexture;
  private readonly packetPositions: Float32Array;
  private readonly packetColors: Float32Array;
  private focusId: string | null = null;
  private pulsePhase = 0;
  private energyPhase = 0;
  private driftTime = 0;
  private pointerNdc: { x: number; y: number } | null = null;
  private readonly tmpProject = new THREE.Vector3();
  private readonly tmpPointer = new THREE.Vector3();
  private readonly tmpDir = new THREE.Vector3();
  private meanCoreSize = 2.15;
  private safeTopPx = 0;
  private safeBottomPx = 9999;
  private safeLeftPx = 8;
  private safeRightPx = 9999;
  private idleSignalEdges: number[] = [];
  private idleSignalTimer = 0;

  /** Exclusion écran joystick — aucune particule dans / derrière la hitbox. */
  private joyExclX = 0;
  private joyExclY = 0;
  private joyExclR = 0;
  private joyExclL = 0;
  private joyExclT = 0;
  private joyExclRight = 0;
  private joyExclB = 0;
  private joyExclActive = false;

  constructor(quests: readonly StarQuest[]) {
    this.quests = quests.map((q) => ({
      ...q,
      position: { ...q.position },
      connections: [...q.connections],
    }));
    const count = this.quests.length;
    const positions = new Float32Array(count * 3);
    this.baseColors = new Float32Array(count * 3);
    this.homePositions = new Float32Array(count * 3);
    this.layoutHomes = new Float32Array(count * 3);
    this.driftPhase = new Float32Array(count);
    this.driftRadius = new Float32Array(count);
    this.driftAmpX = new Float32Array(count);
    this.driftAmpY = new Float32Array(count);
    this.driftAmpZ = new Float32Array(count);
    this.driftSpeed = new Float32Array(count);
    this.driftFreq = new Float32Array(count);
    this.driftNoise = new Float32Array(count);
    this.velX = new Float32Array(count);
    this.velY = new Float32Array(count);
    this.velZ = new Float32Array(count);
    this.aimX = new Float32Array(count);
    this.aimY = new Float32Array(count);
    this.aimZ = new Float32Array(count);
    this.aimTimer = new Float32Array(count);
    this.discTexture = createSoftDiscTexture(64);

    let sizeSum = 0;
    this.quests.forEach((quest, i) => {
      this.idToIndex.set(quest.id, i);
      const i3 = i * 3;
      positions[i3] = quest.position.x;
      positions[i3 + 1] = quest.position.y;
      positions[i3 + 2] = quest.position.z;
      this.homePositions[i3] = quest.position.x;
      this.homePositions[i3 + 1] = quest.position.y;
      this.homePositions[i3 + 2] = quest.position.z;
      this.layoutHomes[i3] = quest.position.x;
      this.layoutHomes[i3 + 1] = quest.position.y;
      this.layoutHomes[i3 + 2] = quest.position.z;

      const [r, g, b] = this.colorForQuest(quest);
      // Contraste doux vs fond gris bleuté (cyan / violet / blanc)
      this.baseColors[i3] = Math.min(1, r * 0.5 + 0.25);
      this.baseColors[i3 + 1] = Math.min(1, g * 0.55 + 0.55);
      this.baseColors[i3 + 2] = Math.min(1, b * 0.4 + 0.75);

      const h = hashFloat(quest.id);
      const h2 = hashFloat(quest.id + ':b');
      const h3 = hashFloat(quest.id + ':c');
      this.driftPhase[i] = h * Math.PI * 2;
      const layer = STAR_DEPTH_LAYERS.interactive;
      // Amplitudes monde — dérive latérale plus large, verticale plus calme
      this.driftAmpX[i] = layer.driftAmp * (1.15 + h * 0.7) * (0.85 + (i % 5) * 0.1);
      this.driftAmpY[i] = layer.driftAmp * (0.55 + h2 * 0.45) * (0.7 + (i % 7) * 0.05);
      this.driftAmpZ[i] = layer.driftAmp * (0.95 + h3 * 0.65);
      this.driftRadius[i] =
        Math.max(this.driftAmpX[i], this.driftAmpY[i]) * 1.85 + this.driftAmpZ[i] * 0.3;
      this.driftSpeed[i] = 1.15 + h * 1.55 + (i % 6) * 0.18;
      this.driftFreq[i] = 0.28 + h2 * 0.42;
      this.driftNoise[i] = 0.32 + h3 * 0.35;
      this.pickNewAim(i, true);
      this.aimTimer[i] = 2.8 + h * 5.5;
      this.velX[i] = this.aimX[i] * this.driftSpeed[i] * 0.08;
      this.velY[i] = this.aimY[i] * this.driftSpeed[i] * 0.08;
      this.velZ[i] = this.aimZ[i] * this.driftSpeed[i] * 0.06;
      sizeSum += sizeFromReward(quest.rewardM4T3R, RARITY_BOOST[quest.rarity]);
    });
    this.meanCoreSize = sizeSum / Math.max(count, 1);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute(
      'color',
      new THREE.BufferAttribute(this.baseColors.slice(), 3)
    );

    // Halo Three.js — points doux, contraste vs fond gris 0x7f8c9b
    const coreMat = new THREE.PointsMaterial({
      size: Math.max(0.14, Math.min(0.22, this.meanCoreSize * 0.9)),
      map: this.discTexture,
      color: 0x52e6ed,
      transparent: true,
      opacity: 0.85,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.questPoints = new THREE.Points(geometry, coreMat);
    this.questPoints.name = 'star-conquest-quests';

    const haloGeom = new THREE.BufferGeometry();
    haloGeom.setAttribute('position', geometry.getAttribute('position'));
    haloGeom.setAttribute('color', geometry.getAttribute('color'));
    const haloMat = new THREE.PointsMaterial({
      size: Math.max(0.28, Math.min(0.45, this.meanCoreSize * 2.0)),
      map: this.discTexture,
      color: 0xb47cff,
      transparent: true,
      opacity: 0.35,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.haloPoints = new THREE.Points(haloGeom, haloMat);
    this.haloPoints.name = 'star-conquest-halos';
    this.haloPoints.raycast = () => {};

    const seen = new Set<string>();
    this.quests.forEach((quest, i) => {
      for (const targetId of quest.connections) {
        const j = this.idToIndex.get(targetId);
        if (j === undefined) continue;
        const key = i < j ? `${i}-${j}` : `${j}-${i}`;
        if (seen.has(key)) continue;
        seen.add(key);
        this.edgePairs.push([i, j]);
      }
    });

    // Silhouettes zodiacales (niveau 3) — liens décoratifs très diffus
    const byFamily = new Map<string, number[]>();
    this.quests.forEach((q, i) => {
      const list = byFamily.get(q.family) ?? [];
      list.push(i);
      byFamily.set(q.family, list);
    });
    for (const list of byFamily.values()) {
      list.sort(
        (a, b) => this.quests[b].rewardM4T3R - this.quests[a].rewardM4T3R
      );
    }
    for (const c of STAR_CONSTELLATIONS) {
      const list = byFamily.get(c.family) ?? [];
      for (const [ia, ib] of c.edges) {
        if (ia >= list.length || ib >= list.length) continue;
        this.constellationPairs.push([list[ia], list[ib]]);
      }
    }
    this.constellationPositions = new Float32Array(
      Math.max(1, this.constellationPairs.length) * 6
    );
    const guideGeom = new THREE.BufferGeometry();
    guideGeom.setAttribute(
      'position',
      new THREE.BufferAttribute(this.constellationPositions, 3)
    );
    const guideMat = new THREE.LineBasicMaterial({
      color: 0x6a7a99,
      transparent: true,
      opacity: 0.07,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.constellationGuides = new THREE.LineSegments(guideGeom, guideMat);
    this.constellationGuides.name = 'star-conquest-zodiac-guides';
    this.constellationGuides.raycast = () => {};
    this.constellationGuides.visible = this.constellationPairs.length > 0;
    this.writeConstellationGuides();

    const edgeCount = this.edgePairs.length;
    const strandVerts = edgeCount * LINE_STRANDS;
    this.linePositions = new Float32Array(strandVerts * 6);
    this.lineColors = new Float32Array(strandVerts * 6);
    this.writeLineGeometry(null, 0);

    const lineGeom = new THREE.BufferGeometry();
    lineGeom.setAttribute(
      'position',
      new THREE.BufferAttribute(this.linePositions, 3)
    );
    lineGeom.setAttribute('color', new THREE.BufferAttribute(this.lineColors, 3));
    const lineMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.48,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.connectionLines = new THREE.LineSegments(lineGeom, lineMat);
    this.connectionLines.name = 'star-conquest-links';
    this.connectionLines.renderOrder = 1;
    this.connectionLines.frustumCulled = false;

    this.packetPositions = new Float32Array(MAX_ENERGY_PACKETS * 3);
    this.packetColors = new Float32Array(MAX_ENERGY_PACKETS * 3);
    const packetGeom = new THREE.BufferGeometry();
    packetGeom.setAttribute(
      'position',
      new THREE.BufferAttribute(this.packetPositions, 3)
    );
    packetGeom.setAttribute('color', new THREE.BufferAttribute(this.packetColors, 3));
    const packetMat = new THREE.PointsMaterial({
      size: 3.2,
      map: this.discTexture,
      color: 0x00ffff,
      transparent: true,
      opacity: 0,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.energyPackets = new THREE.Points(packetGeom, packetMat);
    this.energyPackets.name = 'star-conquest-energy';
    this.energyPackets.raycast = () => {};
    this.energyPackets.visible = false;
    this.energyPackets.renderOrder = 2;

    // Ordre groupe : halos → cœurs → signaux (pas de décor far/mid)
    // [starConquest] Lignes neuronales désactivées – effets conservés
    // Géométrie + update des liens gardés pour energy packets / focus ; mesh non affiché.
    this.constellationGuides.visible = false;
    this.connectionLines.visible = false;
    // this.group.add(this.connectionLines);
    // this.group.add(this.constellationGuides);
    this.group.add(this.haloPoints);
    this.group.add(this.questPoints);
    this.group.add(this.energyPackets);
  }

  get questCount(): number {
    return this.quests.length;
  }

  getQuest(id: string): StarQuest | undefined {
    const idx = this.idToIndex.get(id);
    return idx === undefined ? undefined : this.quests[idx];
  }

  getAllQuests(): readonly StarQuest[] {
    return this.quests;
  }

  applyPositions(quests: readonly StarQuest[]): void {
    const pos = this.questPoints.geometry.getAttribute('position') as THREE.BufferAttribute;
    let sizeSum = 0;
    quests.forEach((quest, i) => {
      if (i >= this.quests.length) return;
      this.quests[i].position = { ...quest.position };
      this.quests[i].slot = { ...quest.slot };
      this.quests[i].family = quest.family;
      this.quests[i].rewardM4T3R = quest.rewardM4T3R;
      const i3 = i * 3;
      this.homePositions[i3] = quest.position.x;
      this.homePositions[i3 + 1] = quest.position.y;
      this.homePositions[i3 + 2] = quest.position.z;
      this.layoutHomes[i3] = quest.position.x;
      this.layoutHomes[i3 + 1] = quest.position.y;
      this.layoutHomes[i3 + 2] = quest.position.z;
      pos.setXYZ(i, quest.position.x, quest.position.y, quest.position.z);
      const [r, g, b] = this.colorForQuest(this.quests[i]);
      this.baseColors[i3] = Math.min(1, r * 0.5 + 0.25);
      this.baseColors[i3 + 1] = Math.min(1, g * 0.55 + 0.55);
      this.baseColors[i3 + 2] = Math.min(1, b * 0.4 + 0.75);
      sizeSum += sizeFromReward(quest.rewardM4T3R, RARITY_BOOST[quest.rarity]);
    });
    this.meanCoreSize = sizeSum / Math.max(quests.length, 1);
    pos.needsUpdate = true;
    const colors = this.questPoints.geometry.getAttribute('color') as THREE.BufferAttribute;
    (colors.array as Float32Array).set(this.baseColors);
    colors.needsUpdate = true;
    this.applyFocusVisuals();
  }

  /**
   * Relâchement joystick : particules → ancrage layout centré (viewport app).
   * N’altère pas les slots structure — uniquement positions / homes / vitesses.
   */
  restoreLayoutHomes(): void {
    const pos = this.questPoints.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < this.quests.length; i++) {
      const i3 = i * 3;
      const x = this.layoutHomes[i3];
      const y = this.layoutHomes[i3 + 1];
      const z = this.layoutHomes[i3 + 2];
      this.homePositions[i3] = x;
      this.homePositions[i3 + 1] = y;
      this.homePositions[i3 + 2] = z;
      pos.setXYZ(i, x, y, z);
      this.quests[i].position.x = x;
      this.quests[i].position.y = y;
      this.quests[i].position.z = z;
      this.velX[i] = 0;
      this.velY[i] = 0;
      this.velZ[i] = 0;
    }
    pos.needsUpdate = true;
  }

  getWorldPosition(questId: string, out = new THREE.Vector3()): THREE.Vector3 | null {
    const idx = this.idToIndex.get(questId);
    if (idx === undefined) return null;
    const pos = this.questPoints.geometry.getAttribute('position') as THREE.BufferAttribute;
    out.set(pos.getX(idx), pos.getY(idx), pos.getZ(idx));
    this.questPoints.localToWorld(out);
    return out;
  }

  /** Positions écran de toutes les Quests (occlusion / labels). */
  projectAllToScreen(camera: THREE.Camera): StarQuestScreenPos[] {
    const vw = window.innerWidth || 1;
    const vh = window.innerHeight || 1;
    const pos = this.questPoints.geometry.getAttribute('position') as THREE.BufferAttribute;
    const out: StarQuestScreenPos[] = [];
    for (let i = 0; i < this.quests.length; i++) {
      this.tmpProject.set(pos.getX(i), pos.getY(i), pos.getZ(i));
      this.questPoints.localToWorld(this.tmpProject);
      this.tmpProject.project(camera);
      if (this.tmpProject.z < -1 || this.tmpProject.z > 1) continue;
      out.push({
        id: this.quests[i].id,
        x: (this.tmpProject.x * 0.5 + 0.5) * vw,
        y: (-this.tmpProject.y * 0.5 + 0.5) * vh,
        reward: this.quests[i].rewardM4T3R,
        family: this.quests[i].family,
        rarity: this.quests[i].rarity,
        depth: this.quests[i].slot.depth ?? 0,
      });
    }
    return out;
  }

  /** Bande écran autorisée (sous Swap → au-dessus du floor). */
  setSafeScreenBand(
    topPx: number,
    bottomPx: number,
    leftPx: number,
    rightPx: number
  ): void {
    this.safeTopPx = topPx;
    this.safeBottomPx = bottomPx;
    this.safeLeftPx = leftPx;
    this.safeRightPx = rightPx;
  }

  /** Hitbox joystick en coords écran — particules expulsées de cette zone. */
  setJoystickExclusion(
    x: number,
    y: number,
    r: number,
    rect?: { left: number; top: number; right: number; bottom: number }
  ): void {
    this.joyExclActive = r > 4;
    this.joyExclX = x;
    this.joyExclY = y;
    this.joyExclR = r;
    if (rect) {
      this.joyExclL = rect.left;
      this.joyExclT = rect.top;
      this.joyExclRight = rect.right;
      this.joyExclB = rect.bottom;
    } else {
      this.joyExclL = x - r;
      this.joyExclT = y - r;
      this.joyExclRight = x + r;
      this.joyExclB = y + r;
    }
  }

  clearJoystickExclusion(): void {
    this.joyExclActive = false;
  }

  setFocus(questId: string | null): void {
    this.focusId = questId;
    this.applyFocusVisuals();
  }

  getFocusId(): string | null {
    return this.focusId;
  }

  /** Pulse fort après sélection scanner. */
  pulseFocus(): void {
    this.pulsePhase = 0;
  }

  /**
   * Rebond type ping-pong sur le cadre externe hors écran app
   * (260×560 autour du viewport 250×550) — mouvement random sur les 4 bords.
   */
  private applyOuterBorderPingPong(cam: THREE.PerspectiveCamera, dt: number): void {
    const pos = this.questPoints.geometry.getAttribute('position') as THREE.BufferAttribute;
    const vw = window.innerWidth || 250;
    const vh = window.innerHeight || 550;
    const left = (vw - STAR_PONG_OUTER_W) * 0.5;
    const right = left + STAR_PONG_OUTER_W;
    const top = (vh - STAR_PONG_OUTER_H) * 0.5;
    const bottom = top + STAR_PONG_OUTER_H;

    for (let i = 0; i < this.quests.length; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      const z = pos.getZ(i);

      this.tmpProject.set(x, y, z);
      this.questPoints.localToWorld(this.tmpProject);
      this.tmpProject.project(cam);
      if (this.tmpProject.z < -1 || this.tmpProject.z > 1) continue;

      let sx = (this.tmpProject.x * 0.5 + 0.5) * vw;
      let sy = (-this.tmpProject.y * 0.5 + 0.5) * vh;
      let hitX = 0;
      let hitY = 0;

      if (sx < left) {
        sx = left;
        hitX = 1;
      } else if (sx > right) {
        sx = right;
        hitX = -1;
      }
      if (sy < top) {
        sy = top;
        hitY = 1;
      } else if (sy > bottom) {
        sy = bottom;
        hitY = -1;
      }
      if (hitX === 0 && hitY === 0) continue;

      const seed = hashFloat(this.quests[i].id + ':pong:' + String(Math.floor(this.driftTime * 8 + i)));
      const seed2 = hashFloat(this.quests[i].id + ':pong2:' + String(i) + String(hitX + hitY));
      const spin = (seed - 0.5) * 1.55;
      const kick = PONG_RANDOM_KICK * (0.65 + seed2 * 0.7);

      if (hitX !== 0) {
        this.velX[i] = Math.abs(this.velX[i]) * PONG_RESTITUTION * hitX + hitX * kick * 0.35;
        this.velY[i] = this.velY[i] * 0.72 + Math.sin(spin) * kick;
      }
      if (hitY !== 0) {
        this.velY[i] = Math.abs(this.velY[i]) * PONG_RESTITUTION * hitY + hitY * kick * 0.35;
        this.velX[i] = this.velX[i] * 0.72 + Math.cos(spin) * kick;
      }

      // Aim random « rentrant » dans le cadre (pas collé au mur)
      const inwardX = hitX !== 0 ? hitX : Math.cos(spin * 2.1);
      const inwardY = hitY !== 0 ? hitY : Math.sin(spin * 2.1);
      const rx = inwardX * Math.cos(spin) - inwardY * Math.sin(spin * 0.7);
      const ry = inwardX * Math.sin(spin * 0.7) + inwardY * Math.cos(spin);
      const rlen = Math.hypot(rx, ry) || 1;
      this.blendAim(i, rx / rlen, ry / rlen, this.aimZ[i] * 0.4, 0.85);
      this.aimTimer[i] = 1.2 + seed * 2.8;
      this.velZ[i] *= 0.85;

      // Repositionne en monde au point de contact écran
      const ndcX = (sx / vw) * 2 - 1;
      const ndcY = -(sy / vh) * 2 + 1;
      this.tmpPointer.set(ndcX, ndcY, 0.5).unproject(cam);
      this.tmpDir.copy(this.tmpPointer).sub(cam.position).normalize();
      if (Math.abs(this.tmpDir.z) <= 1e-5) continue;
      const distZ = (z - cam.position.z) / this.tmpDir.z;
      this.tmpPointer.copy(cam.position).addScaledVector(this.tmpDir, distZ);
      this.questPoints.worldToLocal(this.tmpPointer);
      x = this.tmpPointer.x;
      y = this.tmpPointer.y;

      pos.setXYZ(i, x, y, z);
      this.quests[i].position.x = x;
      this.quests[i].position.y = y;

      // Ancre home suit un peu le rebond (dérive libre sur le cadre)
      const i3 = i * 3;
      const follow = Math.min(1, 0.28 + dt * 4);
      this.homePositions[i3] += (x - this.homePositions[i3]) * follow;
      this.homePositions[i3 + 1] += (y - this.homePositions[i3 + 1]) * follow;
    }
  }

  setPointerNdc(ndc: { x: number; y: number } | null): void {
    this.pointerNdc = ndc;
  }

  /** Nouvelle direction 3D aléatoire (unit vector biaisé). */
  private pickNewAim(i: number, init = false): void {
    const seed = hashFloat(this.quests[i].id + String(this.driftTime + i * 17));
    const seed2 = hashFloat(this.quests[i].id + ':aim:' + String(this.aimTimer[i]));
    const seed3 = hashFloat(this.quests[i].id + ':z:' + String(i));
    // Sphère : toutes directions (haut/bas/gauche/droite/diagonal/avant/arrière)
    const theta = seed * Math.PI * 2;
    const phi = Math.acos(2 * seed2 - 1);
    let ax = Math.sin(phi) * Math.cos(theta);
    let ay = Math.sin(phi) * Math.sin(theta);
    let az = Math.cos(phi) * (0.55 + seed3 * 0.7);
    // Micro-biais pour éviter des axes parfaitement alignés
    ax += (seed3 - 0.5) * 0.25;
    ay += (seed - 0.5) * 0.25;
    const len = Math.sqrt(ax * ax + ay * ay + az * az) || 1;
    this.aimX[i] = ax / len;
    this.aimY[i] = ay / len;
    this.aimZ[i] = az / len;
    if (!init) {
      this.aimTimer[i] = 3.5 + seed * 7 + (i % 5) * 0.55;
    }
  }

  /**
   * Réoriente progressivement l’aim vers (tx,ty,tz) unitaires — pas de snap.
   */
  private blendAim(i: number, tx: number, ty: number, tz: number, mix: number): void {
    const m = Math.max(0, Math.min(1, mix));
    let ax = this.aimX[i] * (1 - m) + tx * m;
    let ay = this.aimY[i] * (1 - m) + ty * m;
    let az = this.aimZ[i] * (1 - m) + tz * m;
    const len = Math.sqrt(ax * ax + ay * ay + az * az) || 1;
    this.aimX[i] = ax / len;
    this.aimY[i] = ay / len;
    this.aimZ[i] = az / len;
  }

  tick(deltaMs: number, camera?: THREE.Camera): void {
    const dt = Math.min(0.05, deltaMs * 0.001);
    this.driftTime += dt;
    this.energyPhase += dt * 1.2;
    this.idleSignalTimer += deltaMs;
    const pos = this.questPoints.geometry.getAttribute('position') as THREE.BufferAttribute;

    let pointerWorld: THREE.Vector3 | null = null;
    if (this.pointerNdc && camera && 'position' in camera) {
      const cam = camera as THREE.PerspectiveCamera;
      this.tmpProject.set(this.pointerNdc.x, this.pointerNdc.y, 0.5).unproject(cam);
      this.tmpDir.copy(this.tmpProject).sub(cam.position).normalize();
      if (Math.abs(this.tmpDir.z) > 1e-5) {
        const distance = (0 - cam.position.z) / this.tmpDir.z;
        pointerWorld = this.tmpPointer
          .copy(cam.position)
          .addScaledVector(this.tmpDir, distance);
      }
    }

    for (let i = 0; i < this.quests.length; i++) {
      const i3 = i * 3;
      const isFocus = this.focusId === this.quests[i].id;
      const underFloor = this.quests[i].underFloor === true;
      const underGraph = this.quests[i].underGraph === true;
      // Sélection : dérive quasi figée (structure ne doit pas se déplacer au clic)
      const stab = this.focusId
        ? isFocus
          ? 0.08
          : 0.12
        : isFocus
          ? 0.28
          : underFloor || underGraph
            ? 0.15
            : 1;
      const depth = this.quests[i].slot.depth ?? 0;
      const depthNear = (depth + 1) * 0.5;

      // Changement progressif de direction (wander lent)
      this.aimTimer[i] -= dt;
      if (this.aimTimer[i] <= 0) this.pickNewAim(i);

      // Accélération douce vers aim + micro-bruit
      const noise = this.driftNoise[i];
      const t = this.driftTime * this.driftFreq[i] + this.driftPhase[i];
      const nx = Math.sin(t * 1.7 + i) * noise;
      const ny = Math.cos(t * 1.3 + i * 0.7) * noise;
      const nz = Math.sin(t * 0.9 + this.driftPhase[i]) * noise * 0.8;
      const accel = this.driftSpeed[i] * stab * 0.72;
      this.velX[i] += (this.aimX[i] * 0.65 + nx * 0.28) * accel * dt;
      this.velY[i] += (this.aimY[i] * 0.65 + ny * 0.28) * accel * dt;
      this.velZ[i] += (this.aimZ[i] * 0.5 + nz * 0.32) * accel * dt * 0.8;

      // Amortissement fluide (glide interstellaire)
      const damp = Math.pow(0.955, dt * 60);
      this.velX[i] *= damp;
      this.velY[i] *= damp;
      this.velZ[i] *= damp;

      const vmax = (1.85 + this.driftAmpX[i] * 0.08) * stab;
      const vlen = Math.sqrt(
        this.velX[i] * this.velX[i] +
          this.velY[i] * this.velY[i] +
          this.velZ[i] * this.velZ[i]
      );
      if (vlen > vmax) {
        const s = vmax / vlen;
        this.velX[i] *= s;
        this.velY[i] *= s;
        this.velZ[i] *= s;
      }

      let x = pos.getX(i) + this.velX[i] * dt * this.driftAmpX[i] * 0.62;
      let y = pos.getY(i) + this.velY[i] * dt * this.driftAmpY[i] * 0.5;
      let z = pos.getZ(i) + this.velZ[i] * dt * this.driftAmpZ[i] * 0.48;

      // Ressort soft vers ancrage — affaibli près du cadre ping-pong (sinon jamais de bord)
      const hx = this.homePositions[i3];
      const hy = this.homePositions[i3 + 1];
      const hz = this.homePositions[i3 + 2];
      const ox = x - hx;
      const oy = y - hy;
      const oz = z - hz;
      const dist = Math.sqrt(ox * ox + oy * oy + oz * oz);
      const maxR = this.driftRadius[i] * stab * 1.35;
      if (dist > maxR * 0.42) {
        const over = dist - maxR * 0.42;
        const pull = (over / Math.max(dist, 1e-4)) * 0.55 * dt;
        x -= ox * pull;
        y -= oy * pull;
        z -= oz * pull;
        this.velX[i] -= ox * pull * 0.18;
        this.velY[i] -= oy * pull * 0.18;
        this.velZ[i] -= oz * pull * 0.12;
        if (dist > maxR * 0.92) {
          this.blendAim(i, -ox / dist, -oy / dist, -oz / dist, 0.08 * dt * 60);
          this.aimTimer[i] = Math.min(this.aimTimer[i], 2.2);
        }
      }

      // Parallaxe / pull pointeur : jamais si une Quest est sélectionnée (focusId)
      if (this.pointerNdc && !isFocus && !this.focusId) {
        const pxScale =
          STAR_DEPTH_LAYERS.interactive.parallax *
          parallaxScaleForViewport() *
          (0.35 + depthNear * 0.8);
        x += this.pointerNdc.x * pxScale * 14;
        y += this.pointerNdc.y * pxScale * 10;
      }

      if (pointerWorld && !isFocus && !this.focusId) {
        const pdx = pointerWorld.x - x;
        const pdy = pointerWorld.y - y;
        const d2 = pdx * pdx + pdy * pdy;
        if (d2 < 500 && d2 > 0.01) {
          const pull = 0.0028 * (1 - Math.sqrt(d2) / 22) * (0.35 + depthNear * 0.65);
          x += pdx * pull;
          y += pdy * pull;
          this.velX[i] *= 0.994;
          this.velY[i] *= 0.994;
        }
      }

      pos.setXYZ(i, x, y, z);
      this.quests[i].position.x = x;
      this.quests[i].position.y = y;
      this.quests[i].position.z = z;
    }

    // Évitement naturel du joystick : aucune particule devant/derrière la hitbox
    // (les liens peuvent traverser — pas d’atténuation ici).
    if (camera && this.joyExclActive && 'position' in camera) {
      const cam = camera as THREE.PerspectiveCamera;
      const vw = window.innerWidth || 1;
      const vh = window.innerHeight || 1;
      const soft = 18;
      const jl = this.joyExclL;
      const jt = this.joyExclT;
      const jr = this.joyExclRight;
      const jb = this.joyExclB;
      const cx = this.joyExclX;
      const cy = this.joyExclY;
      for (let i = 0; i < this.quests.length; i++) {
        let x = pos.getX(i);
        let y = pos.getY(i);
        const z = pos.getZ(i);
        this.tmpProject.set(x, y, z);
        this.questPoints.localToWorld(this.tmpProject);
        this.tmpProject.project(cam);
        const sx = (this.tmpProject.x * 0.5 + 0.5) * vw;
        const sy = (-this.tmpProject.y * 0.5 + 0.5) * vh;

        const inHard = sx >= jl && sx <= jr && sy >= jt && sy <= jb;
        const inSoft =
          sx >= jl - soft &&
          sx <= jr + soft &&
          sy >= jt - soft &&
          sy <= jb + soft;

        if (!inSoft) continue;

        // Direction d’évitement depuis le centre du stick (écran)
        let adx = sx - cx;
        let ady = sy - cy;
        let alen = Math.hypot(adx, ady);
        if (alen < 1e-3) {
          adx = 1;
          ady = 0;
          alen = 1;
        }
        adx /= alen;
        ady /= alen;

        if (inHard) {
          // Sortie ferme + ancrage home hors zone (évite le retour en ressort)
          const dR = jr - sx;
          const dL = sx - jl;
          const dT = sy - jt;
          const dB = jb - sy;
          const min = Math.min(dR, dL, dT, dB);
          let outSx = sx;
          let outSy = sy;
          if (min === dR) outSx = jr + 2;
          else if (min === dL) outSx = jl - 2;
          else if (min === dT) outSy = jt - 2;
          else outSy = jb + 2;
          const ndcX = (outSx / vw) * 2 - 1;
          const ndcY = -(outSy / vh) * 2 + 1;
          this.tmpPointer.set(ndcX, ndcY, 0.5).unproject(cam);
          this.tmpDir.copy(this.tmpPointer).sub(cam.position).normalize();
          if (Math.abs(this.tmpDir.z) > 1e-5) {
            const distZ = (z - cam.position.z) / this.tmpDir.z;
            this.tmpPointer.copy(cam.position).addScaledVector(this.tmpDir, distZ);
            this.questPoints.worldToLocal(this.tmpPointer);
            const k = Math.min(1, 0.65 + dt * 10);
            x += (this.tmpPointer.x - x) * k;
            y += (this.tmpPointer.y - y) * k;
            const i3 = i * 3;
            this.homePositions[i3] += (x - this.homePositions[i3]) * 0.35;
            this.homePositions[i3 + 1] += (y - this.homePositions[i3 + 1]) * 0.35;
          }
          this.velX[i] *= 0.55;
          this.velY[i] *= 0.55;
          this.blendAim(i, adx, ady, this.aimZ[i], 0.45);
        } else {
          // Zone douce : dévie la dérive avant d’entrer
          const edgeDist = Math.min(
            sx - (jl - soft),
            jr + soft - sx,
            sy - (jt - soft),
            jb + soft - sy
          );
          const t = 1 - clamp01(edgeDist / soft);
          this.velX[i] += adx * t * 2.2 * dt;
          this.velY[i] += ady * t * 2.2 * dt;
          this.blendAim(i, adx, ady, this.aimZ[i], 0.12 * t);
        }

        pos.setXYZ(i, x, y, z);
        this.quests[i].position.x = x;
        this.quests[i].position.y = y;
      }
    }

    // Séparation douce entre Quests (évite le pile-up sans bouger la structure globale)
    const minSep = 3.2;
    for (let i = 0; i < this.quests.length; i++) {
      if (this.quests[i].underFloor || this.quests[i].underGraph) continue;
      let xi = pos.getX(i);
      let yi = pos.getY(i);
      for (let j = i + 1; j < this.quests.length; j++) {
        if (this.quests[j].underFloor || this.quests[j].underGraph) continue;
        const xj = pos.getX(j);
        const yj = pos.getY(j);
        const dx = xj - xi;
        const dy = yj - yi;
        const d2 = dx * dx + dy * dy;
        if (d2 >= minSep * minSep || d2 < 1e-8) continue;
        const d = Math.sqrt(d2);
        const push = ((minSep - d) / d) * 0.28;
        const px = dx * push;
        const py = dy * push;
        xi -= px * 0.5;
        yi -= py * 0.5;
        pos.setXYZ(j, xj + px * 0.5, yj + py * 0.5, pos.getZ(j));
        this.quests[j].position.x = xj + px * 0.5;
        this.quests[j].position.y = yj + py * 0.5;
        this.velX[i] -= px * 0.15;
        this.velY[i] -= py * 0.15;
        this.velX[j] += px * 0.15;
        this.velY[j] += py * 0.15;
      }
      pos.setXYZ(i, xi, yi, pos.getZ(i));
      this.quests[i].position.x = xi;
      this.quests[i].position.y = yi;
    }

    // Ping-pong sur le cadre externe non visible (260×560 autour de 250×550)
    if (camera && 'position' in camera) {
      this.applyOuterBorderPingPong(camera as THREE.PerspectiveCamera, dt);
    }

    pos.needsUpdate = true;
    this.writeConstellationGuides();

    const coreMat = this.questPoints.material as THREE.PointsMaterial;
    const haloMat = this.haloPoints.material as THREE.PointsMaterial;
    if (this.focusId) {
      this.pulsePhase += deltaMs * 0.0028;
      const focus = this.getQuest(this.focusId);
      const base = focus
        ? sizeFromReward(focus.rewardM4T3R, RARITY_BOOST[focus.rarity]) * 0.55
        : this.meanCoreSize * 0.55;
      const pulse = 1 + Math.sin(this.pulsePhase) * 0.1;
      coreMat.size = base * pulse;
      coreMat.opacity = 0.38 + Math.sin(this.pulsePhase) * 0.06;
      haloMat.size = base * 2.6 * pulse;
      haloMat.opacity = 0.14 + Math.sin(this.pulsePhase) * 0.03;
      this.writeLineGeometry(this.linkedSet(this.focusId), this.energyPhase);
      this.updateEnergyPackets(this.focusId, this.energyPhase);
    } else {
      coreMat.size = this.meanCoreSize * 0.5;
      coreMat.opacity = 0.24 + Math.sin(this.driftTime * 0.35) * 0.03;
      haloMat.size = this.meanCoreSize * 2.2;
      haloMat.opacity = 0.08 + Math.sin(this.driftTime * 0.28) * 0.015;
      this.writeLineGeometry(null, this.energyPhase);
      this.updateIdleEnergyPackets(this.energyPhase, deltaMs);
    }

    const linePos = this.connectionLines.geometry.getAttribute(
      'position'
    ) as THREE.BufferAttribute;
    const lineColors = this.connectionLines.geometry.getAttribute(
      'color'
    ) as THREE.BufferAttribute;
    linePos.needsUpdate = true;
    lineColors.needsUpdate = true;
  }

  pick(
    _raycaster: THREE.Raycaster,
    camera: THREE.Camera,
    ndc: THREE.Vector2,
    clientX?: number,
    clientY?: number,
    radiusPx = 16
  ): StarConquestHit | null {
    const vw = window.innerWidth || 1;
    const vh = window.innerHeight || 1;
    const sx = clientX !== undefined ? clientX : (ndc.x * 0.5 + 0.5) * vw;
    const sy = clientY !== undefined ? clientY : (-ndc.y * 0.5 + 0.5) * vh;

    const pos = this.questPoints.geometry.getAttribute(
      'position'
    ) as THREE.BufferAttribute;
    const projected = this.tmpProject;
    let bestIdx = -1;
    let bestDist = radiusPx;

    for (let i = 0; i < this.quests.length; i++) {
      if (!this.quests[i]?.interactive) continue;
      projected.set(pos.getX(i), pos.getY(i), pos.getZ(i));
      this.questPoints.localToWorld(projected);
      projected.project(camera);
      if (projected.z < -1 || projected.z > 1) continue;
      const px = (projected.x * 0.5 + 0.5) * vw;
      const py = (-projected.y * 0.5 + 0.5) * vh;
      // Ignore particules encore dans / derrière la hitbox joystick
      if (this.joyExclActive) {
        if (
          px >= this.joyExclL - 4 &&
          px <= this.joyExclRight + 4 &&
          py >= this.joyExclT - 4 &&
          py <= this.joyExclB + 4
        ) {
          continue;
        }
      }
      const dist = Math.hypot(px - sx, py - sy);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }

    if (bestIdx < 0) return null;
    const quest = this.quests[bestIdx];
    const worldPosition = new THREE.Vector3(
      pos.getX(bestIdx),
      pos.getY(bestIdx),
      pos.getZ(bestIdx)
    );
    this.questPoints.localToWorld(worldPosition);
    return {
      questId: quest.id,
      index: bestIdx,
      worldPosition,
    };
  }

  dispose(): void {
    this.questPoints.geometry.dispose();
    (this.questPoints.material as THREE.Material).dispose();
    (this.haloPoints.material as THREE.Material).dispose();
    this.connectionLines.geometry.dispose();
    (this.connectionLines.material as THREE.Material).dispose();
    this.constellationGuides.geometry.dispose();
    (this.constellationGuides.material as THREE.Material).dispose();
    this.energyPackets.geometry.dispose();
    (this.energyPackets.material as THREE.Material).dispose();
    this.discTexture.dispose();
  }

  /** Guides zodiacaux : suivent les nœuds (70 % live + 30 % ancre) — silhouette respirante. */
  private writeConstellationGuides(): void {
    if (this.constellationPairs.length === 0) return;
    const posAttr = this.questPoints.geometry.getAttribute('position') as THREE.BufferAttribute;
    this.constellationPairs.forEach(([i, j], edgeIdx) => {
      const o = edgeIdx * 6;
      const i3 = i * 3;
      const j3 = j * 3;
      const ax = posAttr.getX(i) * 0.7 + this.homePositions[i3] * 0.3;
      const ay = posAttr.getY(i) * 0.7 + this.homePositions[i3 + 1] * 0.3;
      const az = posAttr.getZ(i) * 0.7 + this.homePositions[i3 + 2] * 0.3 - 6;
      const bx = posAttr.getX(j) * 0.7 + this.homePositions[j3] * 0.3;
      const by = posAttr.getY(j) * 0.7 + this.homePositions[j3 + 1] * 0.3;
      const bz = posAttr.getZ(j) * 0.7 + this.homePositions[j3 + 2] * 0.3 - 6;
      this.constellationPositions[o] = ax;
      this.constellationPositions[o + 1] = ay;
      this.constellationPositions[o + 2] = az;
      this.constellationPositions[o + 3] = bx;
      this.constellationPositions[o + 4] = by;
      this.constellationPositions[o + 5] = bz;
    });
    const geom = this.constellationGuides?.geometry;
    if (!geom) return;
    const p = geom.getAttribute('position') as THREE.BufferAttribute | undefined;
    if (p) {
      (p.array as Float32Array).set(this.constellationPositions);
      p.needsUpdate = true;
    }
  }

  private colorForQuest(quest: StarQuest): [number, number, number] {
    const theme = familyTheme(quest.family);
    const bright = STATUS_BRIGHT[quest.status];
    const depth = quest.slot.depth ?? 0;
    const depthFade = 0.78 + depth * 0.12;
    const rewardBoost = 0.92 + Math.min(0.18, Math.log10(quest.rewardM4T3R + 1) * 0.08);
    const m = bright * depthFade * rewardBoost;
    return [
      Math.min(1, theme.rgb[0] * m),
      Math.min(1, theme.rgb[1] * m),
      Math.min(1, theme.rgb[2] * m),
    ];
  }

  private linkedSet(focusId: string): Set<number> {
    const linked = new Set<number>();
    const focusIdx = this.idToIndex.get(focusId);
    if (focusIdx === undefined) return linked;
    linked.add(focusIdx);
    for (const cid of this.quests[focusIdx].connections) {
      const j = this.idToIndex.get(cid);
      if (j !== undefined) linked.add(j);
    }
    return linked;
  }

  private applyFocusVisuals(): void {
    const colors = this.questPoints.geometry.getAttribute('color') as THREE.BufferAttribute;
    const linked = this.focusId ? this.linkedSet(this.focusId) : null;
    const focusIdx = this.focusId ? (this.idToIndex.get(this.focusId) ?? -1) : -1;
    const focusFamily = focusIdx >= 0 ? this.quests[focusIdx].family : null;

    for (let i = 0; i < this.quests.length; i++) {
      const i3 = i * 3;
      let r = this.baseColors[i3];
      let g = this.baseColors[i3 + 1];
      let b = this.baseColors[i3 + 2];

      if (linked && focusIdx >= 0 && focusFamily) {
        if (i === focusIdx) {
          const theme = familyTheme(focusFamily);
          r = Math.min(1, theme.rgb[0] * 1.4);
          g = Math.min(1, theme.rgb[1] * 1.4);
          b = Math.min(1, theme.rgb[2] * 1.4);
        } else if (linked.has(i)) {
          r = Math.min(1, r * LINKED_BOOST);
          g = Math.min(1, g * LINKED_BOOST);
          b = Math.min(1, b * LINKED_BOOST);
        } else {
          r *= DIM_FACTOR;
          g *= DIM_FACTOR;
          b *= DIM_FACTOR;
        }
      }
      colors.setXYZ(i, r, g, b);
    }
    colors.needsUpdate = true;

    this.writeLineGeometry(linked, this.energyPhase);
    const lineMat = this.connectionLines.material as THREE.LineBasicMaterial;
    lineMat.opacity = focusIdx >= 0 ? 0.58 : 0.48;

    if (focusIdx < 0) {
      const coreMat = this.questPoints.material as THREE.PointsMaterial;
      const haloMat = this.haloPoints.material as THREE.PointsMaterial;
      coreMat.size = this.meanCoreSize * 0.55;
      coreMat.opacity = 0.28;
      haloMat.size = this.meanCoreSize * 2.4;
      haloMat.opacity = 0.1;
      this.hideEnergyPackets();
    }
  }

  private hideEnergyPackets(): void {
    this.energyPackets.visible = false;
    (this.energyPackets.material as THREE.PointsMaterial).opacity = 0;
  }

  /** Quelques signaux rares au repos (ciel vivant). */
  private updateIdleEnergyPackets(energy: number, deltaMs: number): void {
    if (this.edgePairs.length === 0) {
      this.hideEnergyPackets();
      return;
    }
    if (this.idleSignalTimer > 3800 || this.idleSignalEdges.length === 0) {
      this.idleSignalTimer = 0;
      const pick = Math.min(5, this.edgePairs.length);
      const next: number[] = [];
      const n = this.edgePairs.length;
      let seed =
        Math.floor(this.driftTime * 13.7 + energy * 97) ^
        (Math.floor(performance.now() * 0.01) & 0xffff);
      while (next.length < pick) {
        seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
        const edge = seed % n;
        if (!next.includes(edge)) next.push(edge);
      }
      this.idleSignalEdges = next;
    }

    const posAttr = this.questPoints.geometry.getAttribute('position') as THREE.BufferAttribute;
    let packet = 0;
    for (const edgeIdx of this.idleSignalEdges) {
      if (packet >= MAX_ENERGY_PACKETS) break;
      const pair = this.edgePairs[edgeIdx];
      if (!pair) continue;
      const [i, j] = pair;
      const t = (energy * 0.28 + packet * 0.41) % 1;
      const o = packet * 3;
      this.packetPositions[o] =
        posAttr.getX(i) + (posAttr.getX(j) - posAttr.getX(i)) * t;
      this.packetPositions[o + 1] =
        posAttr.getY(i) + (posAttr.getY(j) - posAttr.getY(i)) * t;
      this.packetPositions[o + 2] =
        posAttr.getZ(i) + (posAttr.getZ(j) - posAttr.getZ(i)) * t;
      const [cr, cg, cb] = blendFamilyRgb(
        this.quests[i].family,
        this.quests[j].family,
        0.5
      );
      const glow = 0.35 + 0.25 * Math.sin(energy * 2 + packet);
      this.packetColors[o] = cr * glow;
      this.packetColors[o + 1] = cg * glow;
      this.packetColors[o + 2] = cb * glow;
      packet++;
    }
    for (let p = packet; p < MAX_ENERGY_PACKETS; p++) {
      const o = p * 3;
      this.packetPositions[o + 2] = -9999;
      this.packetColors[o] = 0;
      this.packetColors[o + 1] = 0;
      this.packetColors[o + 2] = 0;
    }
    const pAttr = this.energyPackets.geometry.getAttribute('position') as THREE.BufferAttribute;
    const cAttr = this.energyPackets.geometry.getAttribute('color') as THREE.BufferAttribute;
    (pAttr.array as Float32Array).set(this.packetPositions);
    (cAttr.array as Float32Array).set(this.packetColors);
    pAttr.needsUpdate = true;
    cAttr.needsUpdate = true;
    this.energyPackets.visible = packet > 0;
    (this.energyPackets.material as THREE.PointsMaterial).opacity = 0.72;
    void deltaMs;
  }

  private updateEnergyPackets(focusId: string, energy: number): void {
    const focusIdx = this.idToIndex.get(focusId);
    if (focusIdx === undefined) {
      this.hideEnergyPackets();
      return;
    }
    const posAttr = this.questPoints.geometry.getAttribute('position') as THREE.BufferAttribute;
    const theme = familyTheme(this.quests[focusIdx].family);
    let packet = 0;

    for (const [i, j] of this.edgePairs) {
      if (packet >= MAX_ENERGY_PACKETS) break;
      if (i !== focusIdx && j !== focusIdx) continue;
      const from = i === focusIdx ? i : j;
      const to = i === focusIdx ? j : i;
      const t = (energy * 0.55 + packet * 0.37) % 1;
      const ax = posAttr.getX(from);
      const ay = posAttr.getY(from);
      const az = posAttr.getZ(from);
      const bx = posAttr.getX(to);
      const by = posAttr.getY(to);
      const bz = posAttr.getZ(to);
      const o = packet * 3;
      this.packetPositions[o] = ax + (bx - ax) * t;
      this.packetPositions[o + 1] = ay + (by - ay) * t;
      this.packetPositions[o + 2] = az + (bz - az) * t;
      const glow = 0.55 + 0.45 * Math.sin(energy * 4 + packet);
      this.packetColors[o] = theme.rgb[0] * glow;
      this.packetColors[o + 1] = theme.rgb[1] * glow;
      this.packetColors[o + 2] = theme.rgb[2] * glow;
      packet++;
    }

    for (let p = packet; p < MAX_ENERGY_PACKETS; p++) {
      const o = p * 3;
      this.packetPositions[o] = 0;
      this.packetPositions[o + 1] = 0;
      this.packetPositions[o + 2] = -9999;
      this.packetColors[o] = 0;
      this.packetColors[o + 1] = 0;
      this.packetColors[o + 2] = 0;
    }

    const pAttr = this.energyPackets.geometry.getAttribute('position') as THREE.BufferAttribute;
    const cAttr = this.energyPackets.geometry.getAttribute('color') as THREE.BufferAttribute;
    (pAttr.array as Float32Array).set(this.packetPositions);
    (cAttr.array as Float32Array).set(this.packetColors);
    pAttr.needsUpdate = true;
    cAttr.needsUpdate = true;
    this.energyPackets.visible = packet > 0;
    (this.energyPackets.material as THREE.PointsMaterial).opacity = packet > 0 ? 1 : 0;
  }

  private writeLineGeometry(linked: Set<number> | null, energy: number): void {
    const posAttr = this.questPoints.geometry.getAttribute('position') as THREE.BufferAttribute;

    this.edgePairs.forEach(([i, j], edgeIdx) => {
      const ax = posAttr.getX(i);
      const ay = posAttr.getY(i);
      const az = posAttr.getZ(i);
      const bx = posAttr.getX(j);
      const by = posAttr.getY(j);
      const bz = posAttr.getZ(j);

      const dx = bx - ax;
      const dy = by - ay;

      const fa = this.quests[i].family;
      const fb = this.quests[j].family;
      const same = fa === fb;
      const [cr0, cg0, cb0] = same
        ? familyTheme(fa).rgb
        : blendFamilyRgb(fa, fb, 0.5);

      const focused = linked !== null && linked.has(i) && linked.has(j);
      const dim = linked !== null && !focused;
      const zAvg = (az + bz) * 0.5;
      const depthFade = 0.8 + Math.max(-0.2, Math.min(0.22, zAvg * 0.008));
      // Hiérarchie : focus > même famille > passif ; dim léger hors sélection
      let intensity = focused ? 0.95 : same ? 0.58 : 0.4;
      if (dim) intensity = 0.3;
      const flow =
        0.85 +
        0.15 * (0.5 + 0.5 * Math.sin(energy * (focused ? 3.0 : 0.9) + edgeIdx));
      intensity *= focused ? flow : 0.92 + 0.08 * flow;
      intensity *= depthFade;

      const o = edgeIdx * 6;
      this.linePositions[o] = ax;
      this.linePositions[o + 1] = ay;
      this.linePositions[o + 2] = az;
      this.linePositions[o + 3] = bx;
      this.linePositions[o + 4] = by;
      this.linePositions[o + 5] = bz;

      for (let k = 0; k < 2; k++) {
        const c = o + k * 3;
        const tip = focused
          ? k === 0
            ? 1
            : 0.55 + 0.35 * Math.sin(energy * 2.4 + i)
          : 0.92 + 0.08 * (k === 0 ? 1 : Math.sin(energy + j));
        const m = intensity * tip;
        this.lineColors[c] = Math.min(1.15, cr0 * m);
        this.lineColors[c + 1] = Math.min(1.15, cg0 * m);
        this.lineColors[c + 2] = Math.min(1.15, cb0 * m);
      }
      void dx;
      void dy;
    });

    const geom = this.connectionLines?.geometry;
    if (!geom) return;
    const p = geom.getAttribute('position') as THREE.BufferAttribute | undefined;
    const c = geom.getAttribute('color') as THREE.BufferAttribute | undefined;
    if (p) {
      (p.array as Float32Array).set(this.linePositions);
      p.needsUpdate = true;
    }
    if (c) {
      (c.array as Float32Array).set(this.lineColors);
      c.needsUpdate = true;
    }
  }

  /** Nombre d’arêtes de liaison (debug / tests). */
  get linkEdgeCount(): number {
    return this.edgePairs.length;
  }
}
