import * as THREE from 'three';
import {
  blendFamilyRgb,
  familyTheme,
  STAR_QUEST_FAMILY_ORDER,
  type StarQuestFamily,
} from './star-conquest-families';
import type { StarQuest, StarQuestRarity, StarQuestStatus } from './star-conquest.model';
import {
  createSoftDiscTexture,
  createStarBloomTexture,
  createStarCoreTexture,
  sizeFromReward,
} from './star-conquest-visuals';
import {
  createFilamentCoreLineMaterial,
  createFilamentRibbonMaterial,
} from './shaders/star-conquest-filament.shader';
import {
  STAR_DEPTH_LAYERS,
  parallaxScaleForViewport,
} from './star-conquest-depth';
import { STAR_CONSTELLATIONS } from './star-conquest-constellations';
import { StarConquestNetworkLayer } from './star-conquest-network.layer';
import { StarConquestBackground } from './star-conquest-background';
import { StarConquestEffects } from './star-conquest-effects';
import type { StarQuestAnchor } from './star-conquest-anchors';
import type { KnowledgeGraphStore } from '../knowledge-graph/knowledge-graph.store';
import type { QuestVisualizationMode } from '../../core/map/map-configuration';
import type { StarConquestUniverseTheme } from './star-conquest-universe.types';
import {
  DEFAULT_STAR_CONQUEST_UNIVERSE,
  starConquestUniverseTheme,
} from './star-conquest-universes.config';
import { questZFromStatus } from './star-conquest-universe-layout';
import {
  STAR_CONQUEST_FOCUS_GLOW,
  STAR_CONQUEST_REST_GLOW,
  starConquestGalaxyRadius,
  starConquestMobileQuality,
} from './star-conquest-ui-maturity.config';
import {
  starQuestVisualState,
  starQuestVisualTone,
} from './star-conquest-visual-state';
import { starConquestGalaxiesOnRing } from './star-conquest-hive.layout';
import {
  STAR_CONQUEST_SCALE,
  scaledTextureSize,
  starConquestPongSize,
  type StarConquestGpuQuality,
  STAR_PONG_OUTER_H as SCALE_PONG_H,
  STAR_PONG_OUTER_W as SCALE_PONG_W,
} from './star-conquest-scale';
import {
  starConquestClientToLayout,
  starConquestLayoutHeight,
  starConquestLayoutWidth,
  starConquestNdcToLayout,
} from './star-conquest-viewport.util';

function hashFloat(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

const RARITY_BOOST: Record<StarQuestRarity, number> = {
  common: 0.04,
  rare: 0.2,
  epic: 0.34,
  legendary: 0.5,
};

const STATUS_BRIGHT: Record<StarQuestStatus, number> = {
  available: 1.1,
  locked: 0.38,
  active: 1.2,
  completed: 0.88,
  future: 0.34,
};

const LINKED_BOOST = 1.22;
/** Voisinage Obsidian : hors 1-hop le graphe s’éteint. */
const DIM_FACTOR = 0.08;
const MAX_ENERGY_PACKETS = 24;
/** Brins par arête — un filament clair (liaison fiable entre particules). */
const LINE_STRANDS = 1;
/** Ressort léger le long des arêtes (respiration type Obsidian). */
const EDGE_SPRING_K = 0.14;
const GHOST_OFFSET = 0.55;
/** Vitesse de rotation mandala (très lent — fractal respirant). */
const SWARM_MANDALA_ORBIT = 0.055;
const SWARM_MANDALA_PULSE = 0.22;
/** Cadre ping-pong hors viewport — dérivé du palier de scale (R&D → produit → société). */
export const STAR_PONG_OUTER_W = SCALE_PONG_W;
export const STAR_PONG_OUTER_H = SCALE_PONG_H;
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
  readonly bloomPoints: THREE.Points;
  readonly ghostPoints: THREE.Points;
  readonly connectionLines: THREE.LineSegments;
  readonly filamentRibbon: THREE.Mesh;
  readonly constellationGuides: THREE.LineSegments;
  readonly energyPackets: THREE.Points;
  /** Couche IA/P2P — peers, agents, liens sync (intégrée au même graphe). */
  readonly networkLayer: StarConquestNetworkLayer;
  /** Fond aurore + étoiles décoratives. */
  readonly background: StarConquestBackground;
  /** Effets par univers (anneaux, grille, portail…). */
  readonly effects: StarConquestEffects;

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
  private readonly lineAlong: Float32Array;
  private readonly haloColors: Float32Array;
  private readonly ghostPositions: Float32Array;
  private readonly filamentPositions: Float32Array;
  private readonly filamentOthers: Float32Array;
  private readonly filamentSides: Float32Array;
  private readonly filamentAlong: Float32Array;
  private readonly filamentColors: Float32Array;
  private readonly coreTexture: THREE.CanvasTexture;
  private readonly bloomTexture: THREE.CanvasTexture;
  private readonly filamentMat: THREE.ShaderMaterial;
  private readonly lineCoreMat: THREE.ShaderMaterial;
  private readonly edgePairs: Array<[number, number]> = [];
  /** Topologie mandala Ruche : anneaux intra-famille, rayons hub, pentagone inter-familles. */
  private readonly mandalaRingPairs: Array<[number, number]> = [];
  private readonly mandalaCrossPairs: Array<[number, number]> = [];
  private readonly mandalaHubQuestIdx: number[] = [];
  private readonly swarmCentroids = new Map<string, { x: number; y: number; z: number }>();
  private readonly constellationPairs: Array<[number, number]> = [];
  private readonly constellationPositions: Float32Array;
  private readonly discTexture: THREE.CanvasTexture;
  private readonly packetPositions: Float32Array;
  private readonly packetColors: Float32Array;
  private focusId: string | null = null;
  private pulsePhase = 0;
  private energyPhase = 0;
  private driftTime = 0;
  private swarmOrbitPhase = 0;
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
  private visualizationMode: QuestVisualizationMode = 'hybrid';
  private universeTheme: StarConquestUniverseTheme = starConquestUniverseTheme(
    DEFAULT_STAR_CONQUEST_UNIVERSE
  );
  private gpuQuality: StarConquestGpuQuality = 'ultra-low';

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
    this.discTexture = createSoftDiscTexture(scaledTextureSize(64));
    this.coreTexture = createStarCoreTexture(scaledTextureSize(64));
    this.bloomTexture = createStarBloomTexture(scaledTextureSize(96));
    this.haloColors = new Float32Array(count * 3);
    this.ghostPositions = new Float32Array(count * 3);

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
      this.baseColors[i3] = Math.min(1, r * 0.35 + 0.72);
      this.baseColors[i3 + 1] = Math.min(1, g * 0.35 + 0.72);
      this.baseColors[i3 + 2] = Math.min(1, b * 0.28 + 0.78);
      this.haloColors[i3] = r;
      this.haloColors[i3 + 1] = g;
      this.haloColors[i3 + 2] = b;

      const h = hashFloat(quest.id);
      const h2 = hashFloat(quest.id + ':b');
      const h3 = hashFloat(quest.id + ':c');
      this.driftPhase[i] = h * Math.PI * 2;
      const layer = STAR_DEPTH_LAYERS.interactive;
      const drift = STAR_CONQUEST_SCALE.drift;
      // Amplitudes monde — dérive latérale plus large, verticale plus calme
      this.driftAmpX[i] = layer.driftAmp * (1.15 + h * 0.7) * (0.85 + (i % 5) * 0.1) * drift;
      this.driftAmpY[i] = layer.driftAmp * (0.55 + h2 * 0.45) * (0.7 + (i % 7) * 0.05) * drift;
      this.driftAmpZ[i] = layer.driftAmp * (0.95 + h3 * 0.65) * drift;
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

    const sizes = this.questPointSizes();
    const coreMat = new THREE.PointsMaterial({
      size: sizes.core,
      map: this.coreTexture,
      color: 0xffffff,
      transparent: true,
      opacity: 1,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.questPoints = new THREE.Points(geometry, coreMat);
    this.questPoints.name = 'star-conquest-quests';

    const haloGeom = new THREE.BufferGeometry();
    haloGeom.setAttribute('position', geometry.getAttribute('position'));
    haloGeom.setAttribute('color', new THREE.BufferAttribute(this.haloColors.slice(), 3));
    const haloMat = new THREE.PointsMaterial({
      size: sizes.halo,
      map: this.discTexture,
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.haloPoints = new THREE.Points(haloGeom, haloMat);
    this.haloPoints.name = 'star-conquest-halos';
    this.haloPoints.raycast = () => {};

    const bloomGeom = new THREE.BufferGeometry();
    bloomGeom.setAttribute('position', geometry.getAttribute('position'));
    bloomGeom.setAttribute('color', haloGeom.getAttribute('color'));
    const bloomMat = new THREE.PointsMaterial({
      size: sizes.bloom,
      map: this.bloomTexture,
      color: 0xffffff,
      transparent: true,
      opacity: 0.18,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.bloomPoints = new THREE.Points(bloomGeom, bloomMat);
    this.bloomPoints.name = 'star-conquest-bloom';
    this.bloomPoints.raycast = () => {};

    const ghostGeom = new THREE.BufferGeometry();
    ghostGeom.setAttribute('position', new THREE.BufferAttribute(this.ghostPositions, 3));
    ghostGeom.setAttribute('color', haloGeom.getAttribute('color'));
    const ghostMat = new THREE.PointsMaterial({
      size: sizes.ghost,
      map: this.discTexture,
      color: 0xa8fff8,
      transparent: true,
      opacity: 0.14,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.ghostPoints = new THREE.Points(ghostGeom, ghostMat);
    this.ghostPoints.name = 'star-conquest-ghosts';
    this.ghostPoints.raycast = () => {};

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
    this.buildMandalaTopology(byFamily);
    this.constellationPositions = new Float32Array(
      Math.max(1, this.constellationPairs.length) * 6
    );
    const guideGeom = new THREE.BufferGeometry();
    guideGeom.setAttribute(
      'position',
      new THREE.BufferAttribute(this.constellationPositions, 3)
    );
    const guideMat = new THREE.LineBasicMaterial({
      color: 0x88d4f0,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.constellationGuides = new THREE.LineSegments(guideGeom, guideMat);
    this.constellationGuides.name = 'star-conquest-zodiac-guides';
    this.constellationGuides.raycast = () => {};
    this.constellationGuides.visible = this.constellationPairs.length > 0;
    this.writeConstellationGuides();

    const mandalaEdgeCount =
      this.mandalaRingPairs.length +
      this.mandalaCrossPairs.length +
      this.mandalaHubQuestIdx.length;
    const edgeCount = Math.max(this.edgePairs.length, mandalaEdgeCount);
    const strandVerts = edgeCount * LINE_STRANDS;
    this.linePositions = new Float32Array(strandVerts * 6);
    this.lineColors = new Float32Array(strandVerts * 6);
    this.lineAlong = new Float32Array(strandVerts * 2);
    const ribbonVerts = strandVerts * 4;
    this.filamentPositions = new Float32Array(ribbonVerts * 3);
    this.filamentOthers = new Float32Array(ribbonVerts * 3);
    this.filamentSides = new Float32Array(ribbonVerts);
    this.filamentAlong = new Float32Array(ribbonVerts);
    this.filamentColors = new Float32Array(ribbonVerts * 3);
    this.writeLineGeometry(null, 0);

    const lineGeom = new THREE.BufferGeometry();
    lineGeom.setAttribute(
      'position',
      new THREE.BufferAttribute(this.linePositions, 3)
    );
    lineGeom.setAttribute('color', new THREE.BufferAttribute(this.lineColors, 3));
    lineGeom.setAttribute('along', new THREE.BufferAttribute(this.lineAlong, 1));
    this.lineCoreMat = createFilamentCoreLineMaterial();
    this.connectionLines = new THREE.LineSegments(lineGeom, this.lineCoreMat);
    this.connectionLines.name = 'star-conquest-links';
    this.connectionLines.renderOrder = 2;
    this.connectionLines.frustumCulled = false;

    const ribbonGeom = new THREE.BufferGeometry();
    ribbonGeom.setAttribute('position', new THREE.BufferAttribute(this.filamentPositions, 3));
    ribbonGeom.setAttribute('other', new THREE.BufferAttribute(this.filamentOthers, 3));
    ribbonGeom.setAttribute('side', new THREE.BufferAttribute(this.filamentSides, 1));
    ribbonGeom.setAttribute('along', new THREE.BufferAttribute(this.filamentAlong, 1));
    ribbonGeom.setAttribute('color', new THREE.BufferAttribute(this.filamentColors, 3));
    const ribbonIndex = new Uint16Array(strandVerts * 6);
    for (let e = 0; e < strandVerts; e++) {
      const b = e * 4;
      const o = e * 6;
      ribbonIndex[o] = b;
      ribbonIndex[o + 1] = b + 1;
      ribbonIndex[o + 2] = b + 2;
      ribbonIndex[o + 3] = b;
      ribbonIndex[o + 4] = b + 2;
      ribbonIndex[o + 5] = b + 3;
    }
    ribbonGeom.setIndex(new THREE.BufferAttribute(ribbonIndex, 1));
    this.filamentMat = createFilamentRibbonMaterial();
    this.filamentRibbon = new THREE.Mesh(ribbonGeom, this.filamentMat);
    this.filamentRibbon.name = 'star-conquest-filaments';
    this.filamentRibbon.frustumCulled = false;
    this.filamentRibbon.renderOrder = 1;
    this.filamentRibbon.raycast = () => {};
    this.syncFilamentRibbon();

    this.packetPositions = new Float32Array(MAX_ENERGY_PACKETS * 3);
    this.packetColors = new Float32Array(MAX_ENERGY_PACKETS * 3);
    const packetGeom = new THREE.BufferGeometry();
    packetGeom.setAttribute(
      'position',
      new THREE.BufferAttribute(this.packetPositions, 3)
    );
    packetGeom.setAttribute('color', new THREE.BufferAttribute(this.packetColors, 3));
    const packetMat = new THREE.PointsMaterial({
      size: 6.8 * STAR_CONQUEST_SCALE.visual,
      map: this.coreTexture,
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.energyPackets = new THREE.Points(packetGeom, packetMat);
    this.energyPackets.name = 'star-conquest-energy';
    this.energyPackets.raycast = () => {};
    this.energyPackets.visible = true;
    this.energyPackets.renderOrder = 3;

    this.background = new StarConquestBackground();
    this.effects = new StarConquestEffects();
    this.group.add(this.background.group);
    this.group.add(this.effects.group);
    this.group.add(this.filamentRibbon);
    this.group.add(this.connectionLines);
    this.group.add(this.constellationGuides);
    this.group.add(this.bloomPoints);
    this.group.add(this.ghostPoints);
    this.group.add(this.haloPoints);
    this.group.add(this.questPoints);
    this.group.add(this.energyPackets);
    this.networkLayer = new StarConquestNetworkLayer();
    this.group.add(this.networkLayer.group);
    this.setUniverse(this.universeTheme);
    this.applyVisualizationMode();
    this.applyFocusVisuals();
  }

  setGpuQuality(_quality: StarConquestGpuQuality): void {
    this.gpuQuality = 'ultra-low';
    this.background.setGpuQuality('ultra-low');
    this.background.applyUniverse(this.universeTheme);
  }

  getGpuQuality(): StarConquestGpuQuality {
    return 'ultra-low';
  }

  /** Bascule l’univers spatial Star Conquest (100 % autonome, sans metaverse floor). */
  setUniverse(theme: StarConquestUniverseTheme): void {
    this.universeTheme = theme;
    this.background.setGpuQuality(this.gpuQuality);
    this.background.applyUniverse(theme);
    this.effects.applyUniverse(theme);
    this.applyUniverseMaterials(theme);
    if (theme.id === 'conquest-timeline') {
      this.applyTimelineQuestDepth();
    } else {
      this.restoreQuestDepthFromLayout();
    }
    this.applyVisualizationMode();
    this.syncQuestBoundLayers();
  }

  getUniverse(): StarConquestUniverseTheme {
    return this.universeTheme;
  }

  /**
   * Toggle quest neural links visibility without removing geometry or simulation.
   * legacy-particles → hidden (historical default) ; hybrid/knowledge-graph → visible.
   */
  setVisualizationMode(mode: QuestVisualizationMode): void {
    this.visualizationMode = mode;
    this.applyVisualizationMode();
  }

  getVisualizationMode(): QuestVisualizationMode {
    return this.visualizationMode;
  }

  syncKnowledgeGraph(store: KnowledgeGraphStore): void {
    this.networkLayer.setVisualizationMode(this.visualizationMode);
    this.networkLayer.syncFromStore(store, this.collectQuestAnchors());
  }

  setNetworkFocus(nodeId: string | null): void {
    this.networkLayer.setFocus(nodeId);
  }

  getNetworkNodeWorldPosition(nodeId: string, out = new THREE.Vector3()): THREE.Vector3 | null {
    return this.networkLayer.getNodeWorldPosition(nodeId, out);
  }

  private applyVisualizationMode(): void {
    const theme = this.universeTheme;
    const showLinks =
      theme.showNeuralLinks &&
      (this.visualizationMode === 'knowledge-graph' || this.visualizationMode === 'hybrid');
    this.connectionLines.visible = showLinks;
    this.filamentRibbon.visible = showLinks;
    const guideMat = this.constellationGuides.material as THREE.LineBasicMaterial;
    guideMat.opacity = theme.constellationOpacity;
    guideMat.color.setRGB(theme.auroraRgb[0], theme.auroraRgb[1], theme.auroraRgb[2]);
    this.constellationGuides.visible =
      theme.showConstellations && theme.constellationOpacity > 0;
    this.lineCoreMat.uniforms['uOpacity'].value = Math.min(
      0.4,
      theme.linkOpacity * STAR_CONQUEST_REST_GLOW.filamentRestMul
    );
    this.filamentMat.uniforms['uOpacity'].value = Math.min(
      0.2,
      theme.linkOpacity * STAR_CONQUEST_REST_GLOW.filamentRestMul
    );
    this.filamentMat.uniforms['uWidthPx'].value = STAR_CONQUEST_SCALE.filamentWidthPx;
    this.networkLayer.setVisualizationMode(this.visualizationMode);
  }

  private collectQuestAnchors(): StarQuestAnchor[] {
    const pos = this.questPoints.geometry.getAttribute('position') as THREE.BufferAttribute;
    const anchors: StarQuestAnchor[] = [];
    for (let i = 0; i < this.quests.length; i++) {
      const rgb = familyTheme(this.quests[i].family).rgb;
      anchors.push({
        id: this.quests[i].id,
        x: pos.getX(i),
        y: pos.getY(i),
        z: pos.getZ(i),
        rgb,
        family: this.quests[i].family,
      });
    }
    return anchors;
  }

  private syncQuestBoundLayers(): void {
    const anchors = this.collectQuestAnchors();
    this.background.followQuestAnchors(anchors);
    this.effects.followQuestAnchors(anchors);
    this.networkLayer.followQuestAnchors(anchors);
  }

  private questPointSizes(pulse = 1): {
    core: number;
    halo: number;
    bloom: number;
    ghost: number;
  } {
    const visual = STAR_CONQUEST_SCALE.visual;
    const theme = this.universeTheme;
    const core = this.meanCoreSize * 0.92 * theme.coreSizeMult * visual * pulse;
    const halo = this.meanCoreSize * 2.35 * theme.haloSizeMult * visual * pulse;
    const bloom = this.meanCoreSize * 3.8 * theme.haloSizeMult * visual * pulse;
    return { core, halo, bloom, ghost: core * 0.7 };
  }

  private applyQuestPointSizes(pulse = 1): void {
    const sizes = this.questPointSizes(pulse);
    (this.questPoints.material as THREE.PointsMaterial).size = sizes.core;
    (this.haloPoints.material as THREE.PointsMaterial).size = sizes.halo;
    (this.bloomPoints.material as THREE.PointsMaterial).size = sizes.bloom;
    (this.ghostPoints.material as THREE.PointsMaterial).size = sizes.ghost;
  }

  private applyUniverseMaterials(theme: StarConquestUniverseTheme): void {
    this.universeTheme = theme;
    this.applyQuestPointSizes();
    const coreMat = this.questPoints.material as THREE.PointsMaterial;
    const haloMat = this.haloPoints.material as THREE.PointsMaterial;
    const bloomMat = this.bloomPoints.material as THREE.PointsMaterial;
    const ghostMat = this.ghostPoints.material as THREE.PointsMaterial;
    coreMat.opacity = Math.min(
      1,
      (theme.coreOpacity + 0.08) * STAR_CONQUEST_REST_GLOW.coreMul
    );
    haloMat.opacity = Math.min(
      0.42,
      (theme.haloOpacity + 0.08) * STAR_CONQUEST_REST_GLOW.haloMul
    );
    bloomMat.opacity = (0.18 + theme.haloOpacity * 0.28) * STAR_CONQUEST_REST_GLOW.bloomMul;
    ghostMat.opacity = 0.08 * STAR_CONQUEST_REST_GLOW.ghostMul;
  }

  private applyTimelineQuestDepth(): void {
    const pos = this.questPoints.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < this.quests.length; i++) {
      const i3 = i * 3;
      const baseZ = this.layoutHomes[i3 + 2];
      const z = questZFromStatus(this.quests[i].status, baseZ);
      this.homePositions[i3 + 2] = z;
      pos.setZ(i, z);
      this.quests[i].position.z = z;
    }
    pos.needsUpdate = true;
  }

  private restoreQuestDepthFromLayout(): void {
    const pos = this.questPoints.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < this.quests.length; i++) {
      const i3 = i * 3;
      const z = this.layoutHomes[i3 + 2];
      this.homePositions[i3 + 2] = z;
      pos.setZ(i, z);
      this.quests[i].position.z = z;
    }
    pos.needsUpdate = true;
  }

  get questCount(): number {
    return this.quests.length;
  }

  /** Cœurs interactifs — toujours égal au catalogue (1 particule = 1 Quest). */
  get questCoreCount(): number {
    return (this.questPoints.geometry.getAttribute('position') as THREE.BufferAttribute)
      .count;
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
      this.baseColors[i3] = Math.min(1, r * 0.35 + 0.72);
      this.baseColors[i3 + 1] = Math.min(1, g * 0.35 + 0.72);
      this.baseColors[i3 + 2] = Math.min(1, b * 0.28 + 0.78);
      this.haloColors[i3] = r;
      this.haloColors[i3 + 1] = g;
      this.haloColors[i3 + 2] = b;
      sizeSum += sizeFromReward(quest.rewardM4T3R, RARITY_BOOST[quest.rarity]);
    });
    this.meanCoreSize = sizeSum / Math.max(quests.length, 1);
    pos.needsUpdate = true;
    const colors = this.questPoints.geometry.getAttribute('color') as THREE.BufferAttribute;
    (colors.array as Float32Array).set(this.baseColors);
    colors.needsUpdate = true;
    const haloCol = this.haloPoints.geometry.getAttribute('color') as THREE.BufferAttribute;
    (haloCol.array as Float32Array).set(this.haloColors);
    haloCol.needsUpdate = true;
    this.applyFocusVisuals();
  }

  /** Met à jour les statuts joueur sans relayout (catalogue N, progression séparée). */
  applyQuestStatuses(quests: readonly StarQuest[]): void {
    const byId = new Map(quests.map((quest) => [quest.id, quest.status]));
    for (let i = 0; i < this.quests.length; i++) {
      const status = byId.get(this.quests[i].id);
      if (status) this.quests[i].status = status;
    }
    if (this.universeTheme.id === 'conquest-timeline') {
      this.applyTimelineQuestDepth();
    }
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
    const vw = starConquestLayoutWidth();
    const vh = starConquestLayoutHeight();
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
   * Rebond type ping-pong sur le cadre externe hors écran
   * (viewport × worldExtent du palier de scale).
   */
  private applyOuterBorderPingPong(cam: THREE.PerspectiveCamera, dt: number): void {
    const pos = this.questPoints.geometry.getAttribute('position') as THREE.BufferAttribute;
    const vw = starConquestLayoutWidth();
    const vh = starConquestLayoutHeight();
    const { w: outerW, h: outerH } = starConquestPongSize(vw, vh);
    const left = (vw - outerW) * 0.5;
    const right = left + outerW;
    const top = (vh - outerH) * 0.5;
    const bottom = top + outerH;

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

  /** 5 galaxies sur le cercle — profondeur + rotation lente. */
  private applyQuestSwarmOrbit(dt: number, pos: THREE.BufferAttribute): void {
    this.swarmOrbitPhase +=
      dt * SWARM_MANDALA_ORBIT * this.universeTheme.driftSpeedMult;

    const layoutCx = new Map<string, number>();
    const layoutCy = new Map<string, number>();
    const layoutCz = new Map<string, number>();
    const layoutN = new Map<string, number>();

    for (let i = 0; i < this.quests.length; i++) {
      const fam = this.quests[i].family;
      const i3 = i * 3;
      layoutCx.set(fam, (layoutCx.get(fam) ?? 0) + this.layoutHomes[i3]);
      layoutCy.set(fam, (layoutCy.get(fam) ?? 0) + this.layoutHomes[i3 + 1]);
      layoutCz.set(fam, (layoutCz.get(fam) ?? 0) + this.layoutHomes[i3 + 2]);
      layoutN.set(fam, (layoutN.get(fam) ?? 0) + 1);
    }
    for (const fam of layoutN.keys()) {
      const n = layoutN.get(fam)!;
      layoutCx.set(fam, layoutCx.get(fam)! / n);
      layoutCy.set(fam, layoutCy.get(fam)! / n);
      layoutCz.set(fam, layoutCz.get(fam)! / n);
    }

    const onRing = starConquestGalaxiesOnRing(this.swarmOrbitPhase);
    this.effects.setOrbitPhase(this.swarmOrbitPhase);
    const byFamily = new Map(onRing.map((g) => [g.family, g]));
    this.swarmCentroids.clear();
    for (const g of onRing) {
      this.swarmCentroids.set(g.family, { x: g.x, y: g.y, z: g.z });
    }

    for (let i = 0; i < this.quests.length; i++) {
      const quest = this.quests[i];
      const i3 = i * 3;
      const fam = quest.family;
      const g = byFamily.get(fam);
      const lcx = layoutCx.get(fam) ?? this.layoutHomes[i3];
      const lcy = layoutCy.get(fam) ?? this.layoutHomes[i3 + 1];
      const lcz = layoutCz.get(fam) ?? this.layoutHomes[i3 + 2];

      const ox = this.layoutHomes[i3] - lcx;
      const oy = this.layoutHomes[i3 + 1] - lcy;
      const oz = this.layoutHomes[i3 + 2] - lcz;

      const isFocus = this.focusId === quest.id;
      const stab = this.focusId
        ? isFocus
          ? 0.2
          : 0.28
        : quest.underFloor || quest.underGraph
          ? 0.35
          : 1;

      const depthT = g?.depthT ?? 0.5;
      // Clusters serrés : restent dans le frustum 250×550 autour du cercle
      const ringR = starConquestGalaxyRadius() * 0.62;
      const spreadCap = ringR * 0.22;
      const homeSpan = Math.hypot(ox, oy) || 1;
      const cluster =
        Math.min((g?.clusterScale ?? 0.7) * 0.42 * stab, spreadCap / homeSpan);
      const t = this.swarmOrbitPhase * 0.35 + this.driftPhase[i];
      const cos = Math.cos(t);
      const sin = Math.sin(t);
      const lx = (ox * cos - oy * sin) * cluster;
      const ly = (ox * sin + oy * cos) * cluster;
      const lz = oz * cluster * 0.28;

      const cx = g?.x ?? 0;
      const cy = g?.y ?? 0;
      const cz = g?.z ?? 0;
      // Micro-respiration dans le plan du cercle (pas de chaos)
      const breathe = Math.sin(t * 0.7 + i * 0.2) * (0.35 + depthT * 0.45);

      const x = cx + lx + breathe * 0.12;
      const y = cy + ly + breathe * 0.08;
      const z = cz + lz;

      pos.setXYZ(i, x, y, z);
      quest.position.x = x;
      quest.position.y = y;
      quest.position.z = z;
    }
  }

  /** Anneaux + rayons + pentagone inter-familles pour le mandala Ruche. */
  private buildMandalaTopology(byFamily: Map<string, number[]>): void {
    for (const fam of STAR_QUEST_FAMILY_ORDER) {
      const indices = byFamily.get(fam);
      if (!indices?.length) continue;

      let cx = 0;
      let cy = 0;
      for (const idx of indices) {
        const i3 = idx * 3;
        cx += this.layoutHomes[i3];
        cy += this.layoutHomes[i3 + 1];
      }
      cx /= indices.length;
      cy /= indices.length;

      const ring = [...indices].sort((a, b) => {
        const a3 = a * 3;
        const b3 = b * 3;
        return (
          Math.atan2(this.layoutHomes[a3 + 1] - cy, this.layoutHomes[a3] - cx) -
          Math.atan2(this.layoutHomes[b3 + 1] - cy, this.layoutHomes[b3] - cx)
        );
      });

      for (let k = 0; k < ring.length; k++) {
        this.mandalaRingPairs.push([ring[k], ring[(k + 1) % ring.length]]);
        this.mandalaHubQuestIdx.push(ring[k]);
      }
    }

    const reps: number[] = [];
    for (const fam of STAR_QUEST_FAMILY_ORDER) {
      const list = byFamily.get(fam);
      if (!list?.length) continue;
      const best = [...list].sort(
        (a, b) => this.quests[b].rewardM4T3R - this.quests[a].rewardM4T3R
      )[0];
      reps.push(best);
    }
    for (let k = 0; k < reps.length; k++) {
      this.mandalaCrossPairs.push([reps[k], reps[(k + 1) % reps.length]]);
    }
  }

  private tickQuestDrift(
    dt: number,
    pos: THREE.BufferAttribute,
    pointerWorld: THREE.Vector3 | null
  ): void {
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

    this.applyEdgeSprings(dt, pos);
  }

  /** Attraction douce vers la longueur de repos des arêtes — graphe qui respire. */
  private applyEdgeSprings(dt: number, pos: THREE.BufferAttribute): void {
    if (this.focusId) return;
    const pairs =
      this.universeTheme.peerLayout === 'swarm-orbit'
        ? this.mandalaRingPairs
        : this.edgePairs;
    const k = EDGE_SPRING_K * dt;
    for (const [i, j] of pairs) {
      const i3 = i * 3;
      const j3 = j * 3;
      const rest = Math.hypot(
        this.layoutHomes[i3] - this.layoutHomes[j3],
        this.layoutHomes[i3 + 1] - this.layoutHomes[j3 + 1],
        this.layoutHomes[i3 + 2] - this.layoutHomes[j3 + 2]
      );
      if (rest < 0.4) continue;
      const dx = pos.getX(j) - pos.getX(i);
      const dy = pos.getY(j) - pos.getY(i);
      const dz = pos.getZ(j) - pos.getZ(i);
      const cur = Math.hypot(dx, dy, dz) || 1e-4;
      const mag = (cur - rest) * k;
      const nx = dx / cur;
      const ny = dy / cur;
      const nz = dz / cur;
      this.velX[i] += nx * mag;
      this.velY[i] += ny * mag;
      this.velZ[i] += nz * mag;
      this.velX[j] -= nx * mag;
      this.velY[j] -= ny * mag;
      this.velZ[j] -= nz * mag;
    }
  }

  tick(deltaMs: number, camera?: THREE.Camera): void {
    const dt = Math.min(0.05, deltaMs * 0.001);
    this.driftTime += dt;
    this.energyPhase +=
      dt * (this.universeTheme.peerLayout === 'swarm-orbit' ? 0.32 : 1.2);
    this.idleSignalTimer += deltaMs;
    const pos = this.questPoints.geometry.getAttribute('position') as THREE.BufferAttribute;
    const swarmOrbit = this.universeTheme.peerLayout === 'swarm-orbit';

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

    if (swarmOrbit) {
      this.applyQuestSwarmOrbit(dt, pos);
      this.applyEdgeSprings(dt * 0.35, pos);
      this.applyFocusVisuals();
    } else {
      this.tickQuestDrift(dt, pos, pointerWorld);
    }

    // Évitement naturel du joystick : aucune particule devant/derrière la hitbox
    // (les liens peuvent traverser — pas d’atténuation ici).
    if (camera && this.joyExclActive && 'position' in camera) {
      const cam = camera as THREE.PerspectiveCamera;
      const vw = starConquestLayoutWidth();
      const vh = starConquestLayoutHeight();
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

    // Séparation douce entre Quests — désactivée en mandala (préserve l'orbite)
    if (!swarmOrbit) {
      const minSep = STAR_CONQUEST_SCALE.minSeparation;
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
    }

    // Ping-pong cadre externe — incompatible avec mandala lent
    if (camera && 'position' in camera && !swarmOrbit) {
      this.applyOuterBorderPingPong(camera as THREE.PerspectiveCamera, dt);
    }

    pos.needsUpdate = true;
    this.writeGhostPositions(pos);
    this.writeConstellationGuides();

    const vw = starConquestLayoutWidth();
    const vh = starConquestLayoutHeight();
    this.filamentMat.uniforms['uTime'].value = this.driftTime;
    this.filamentMat.uniforms['uResolution'].value.set(vw, vh);
    this.lineCoreMat.uniforms['uTime'].value = this.driftTime;

    if (this.focusId) {
      this.pulsePhase += deltaMs * 0.0028;
      const pulse = 1 + Math.sin(this.pulsePhase) * 0.12;
      this.applyQuestPointSizes(pulse);
      const coreMat = this.questPoints.material as THREE.PointsMaterial;
      const haloMat = this.haloPoints.material as THREE.PointsMaterial;
      const bloomMat = this.bloomPoints.material as THREE.PointsMaterial;
      const ghostMat = this.ghostPoints.material as THREE.PointsMaterial;
      coreMat.opacity = STAR_CONQUEST_FOCUS_GLOW.coreOpacity + Math.sin(this.pulsePhase) * 0.05;
      haloMat.opacity = STAR_CONQUEST_FOCUS_GLOW.haloOpacity + Math.sin(this.pulsePhase) * 0.04;
      bloomMat.opacity = STAR_CONQUEST_FOCUS_GLOW.bloomOpacity + Math.sin(this.pulsePhase) * 0.03;
      ghostMat.opacity = STAR_CONQUEST_FOCUS_GLOW.ghostOpacity;
      this.ghostPoints.visible = true;
      this.writeLineGeometry(this.linkedSet(this.focusId), this.energyPhase);
      this.updateEnergyPackets(this.focusId, this.energyPhase);
    } else {
      const theme = this.universeTheme;
      const rest = STAR_CONQUEST_REST_GLOW;
      const mq = starConquestMobileQuality(this.gpuQuality);
      const breathe = Math.sin(this.driftTime * 0.28) * rest.breatheAmp;
      this.applyQuestPointSizes(0.72);
      const coreMat = this.questPoints.material as THREE.PointsMaterial;
      const haloMat = this.haloPoints.material as THREE.PointsMaterial;
      const bloomMat = this.bloomPoints.material as THREE.PointsMaterial;
      const ghostMat = this.ghostPoints.material as THREE.PointsMaterial;
      coreMat.opacity = Math.min(1, theme.coreOpacity * rest.coreMul * mq.restMul + breathe);
      haloMat.opacity = Math.min(0.2, theme.haloOpacity * rest.haloMul * mq.restMul + breathe * 0.4);
      bloomMat.opacity = (0.06 + theme.haloOpacity * 0.08) * rest.bloomMul * mq.restMul;
      ghostMat.opacity = 0.03 * rest.ghostMul;
      this.ghostPoints.visible = ghostMat.opacity > 0.02;
      this.writeLineGeometry(null, this.energyPhase);
      this.updateIdleEnergyPackets(this.energyPhase, deltaMs);
    }

    this.background.tick(deltaMs);
    this.background.setPointerNdc(this.pointerNdc);
    this.effects.tick(deltaMs);
    this.syncQuestBoundLayers();
    this.networkLayer.tick(deltaMs, this.universeTheme);

    const linePos = this.connectionLines.geometry.getAttribute(
      'position'
    ) as THREE.BufferAttribute;
    const lineColors = this.connectionLines.geometry.getAttribute(
      'color'
    ) as THREE.BufferAttribute;
    const lineAlong = this.connectionLines.geometry.getAttribute(
      'along'
    ) as THREE.BufferAttribute;
    linePos.needsUpdate = true;
    lineColors.needsUpdate = true;
    if (lineAlong) lineAlong.needsUpdate = true;
    this.syncFilamentRibbon();
  }

  pick(
    _raycaster: THREE.Raycaster,
    camera: THREE.Camera,
    ndc: THREE.Vector2,
    clientX?: number,
    clientY?: number,
    radiusPx = STAR_CONQUEST_SCALE.pickRadiusPx
  ): StarConquestHit | null {
    const vw = starConquestLayoutWidth();
    const vh = starConquestLayoutHeight();
    const layoutPt =
      clientX !== undefined && clientY !== undefined
        ? starConquestClientToLayout(clientX, clientY)
        : starConquestNdcToLayout(ndc.x, ndc.y);
    const sx = layoutPt.x;
    const sy = layoutPt.y;

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
    (this.bloomPoints.material as THREE.Material).dispose();
    this.ghostPoints.geometry.dispose();
    (this.ghostPoints.material as THREE.Material).dispose();
    this.connectionLines.geometry.dispose();
    (this.connectionLines.material as THREE.Material).dispose();
    this.filamentRibbon.geometry.dispose();
    (this.filamentRibbon.material as THREE.Material).dispose();
    this.constellationGuides.geometry.dispose();
    (this.constellationGuides.material as THREE.Material).dispose();
    this.energyPackets.geometry.dispose();
    (this.energyPackets.material as THREE.Material).dispose();
    this.networkLayer.dispose();
    this.background.dispose();
    this.effects.dispose();
    this.discTexture.dispose();
    this.coreTexture.dispose();
    this.bloomTexture.dispose();
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
    const haloCol = this.haloPoints.geometry.getAttribute('color') as THREE.BufferAttribute;
    const linked = this.focusId ? this.linkedSet(this.focusId) : null;
    const focusIdx = this.focusId ? (this.idToIndex.get(this.focusId) ?? -1) : -1;
    const focusFamily = focusIdx >= 0 ? this.quests[focusIdx].family : null;

    for (let i = 0; i < this.quests.length; i++) {
      const i3 = i * 3;
      let r = this.baseColors[i3];
      let g = this.baseColors[i3 + 1];
      let b = this.baseColors[i3 + 2];
      let hr = this.haloColors[i3];
      let hg = this.haloColors[i3 + 1];
      let hb = this.haloColors[i3 + 2];

      if (linked && focusIdx >= 0 && focusFamily) {
        if (i === focusIdx) {
          const theme = familyTheme(focusFamily);
          const sel = starQuestVisualTone('selected');
          r = Math.min(1, (0.82 + theme.rgb[0] * 0.35) * sel.vertex);
          g = Math.min(1, (0.86 + theme.rgb[1] * 0.28) * sel.vertex);
          b = Math.min(1, (0.9 + theme.rgb[2] * 0.22) * sel.vertex);
          hr = Math.min(1, theme.rgb[0] * 1.45 * sel.halo);
          hg = Math.min(1, theme.rgb[1] * 1.45 * sel.halo);
          hb = Math.min(1, theme.rgb[2] * 1.45 * sel.halo);
        } else if (linked.has(i)) {
          const linkedTone = starQuestVisualTone('linked');
          r = Math.min(1, r * LINKED_BOOST * linkedTone.vertex);
          g = Math.min(1, g * LINKED_BOOST * linkedTone.vertex);
          b = Math.min(1, b * LINKED_BOOST * linkedTone.vertex);
          hr = Math.min(1, hr * LINKED_BOOST * linkedTone.halo);
          hg = Math.min(1, hg * LINKED_BOOST * linkedTone.halo);
          hb = Math.min(1, hb * LINKED_BOOST * linkedTone.halo);
        } else {
          r *= DIM_FACTOR;
          g *= DIM_FACTOR;
          b *= DIM_FACTOR;
          hr *= DIM_FACTOR;
          hg *= DIM_FACTOR;
          hb *= DIM_FACTOR;
        }
      } else {
        const tone = starQuestVisualTone(
          starQuestVisualState({
            status: this.quests[i].status,
            focused: false,
            hovered: false,
            linked: false,
          })
        );
        // Profondeur cercle : fond plus sombre / devant plus lisible
        const z = this.questPoints.geometry.getAttribute('position').getZ(i);
        const depthFade = Math.max(0.42, Math.min(1.05, 0.72 + z * 0.012));
        r *= tone.vertex * depthFade;
        g *= tone.vertex * depthFade;
        b *= tone.vertex * depthFade;
        hr *= tone.halo * depthFade;
        hg *= tone.halo * depthFade;
        hb *= tone.halo * depthFade;
      }
      colors.setXYZ(i, r, g, b);
      haloCol.setXYZ(i, hr, hg, hb);
    }
    colors.needsUpdate = true;
    haloCol.needsUpdate = true;

    this.writeLineGeometry(linked, this.energyPhase);
    const rest = STAR_CONQUEST_REST_GLOW;
    this.lineCoreMat.uniforms['uOpacity'].value =
      focusIdx >= 0 ? 0.88 : 0.12 * rest.filamentRestMul;
    this.filamentMat.uniforms['uOpacity'].value =
      focusIdx >= 0 ? 0.55 : 0.04 * rest.filamentRestMul;
    const guideMat = this.constellationGuides.material as THREE.LineBasicMaterial;
    const showGuides =
      this.universeTheme.showConstellations && this.universeTheme.constellationOpacity > 0;
    this.constellationGuides.visible = showGuides && focusIdx >= 0;
    guideMat.opacity =
      focusIdx >= 0
        ? this.universeTheme.constellationOpacity * 0.7
        : 0;
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
    if (this.idleSignalTimer > 1600 || this.idleSignalEdges.length === 0) {
      this.idleSignalTimer = 0;
      const pick = Math.min(10, this.edgePairs.length);
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
      const glow = 0.55 + 0.4 * Math.sin(energy * 2 + packet);
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
    (this.energyPackets.material as THREE.PointsMaterial).opacity = 0.92;
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
    (this.energyPackets.material as THREE.PointsMaterial).opacity =
      packet > 0 ? STAR_CONQUEST_REST_GLOW.packetMul : 0;
  }

  private writeLineGeometry(linked: Set<number> | null, energy: number): void {
    if (this.universeTheme.peerLayout === 'swarm-orbit') {
      this.writeSwarmMandalaLines(linked, energy);
      return;
    }

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
      // Hiérarchie : focus > même famille > passif ; dim Obsidian hors voisinage
      let intensity = focused ? 0.98 : same ? 0.68 : 0.5;
      if (dim) intensity = 0.08;
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
    const alongAttr = geom.getAttribute('along') as THREE.BufferAttribute | undefined;
    if (alongAttr) {
      const n = Math.min(alongAttr.count, this.lineAlong.length);
      for (let i = 0; i < n; i += 2) {
        this.lineAlong[i] = 0;
        this.lineAlong[i + 1] = 1;
      }
      (alongAttr.array as Float32Array).set(this.lineAlong);
      alongAttr.needsUpdate = true;
    }
    this.syncFilamentRibbon();
  }

  private writeSwarmMandalaLines(linked: Set<number> | null, energy: number): void {
    const posAttr = this.questPoints.geometry.getAttribute('position') as THREE.BufferAttribute;
    let edgeIdx = 0;

    const writeSegment = (
      ax: number,
      ay: number,
      az: number,
      bx: number,
      by: number,
      bz: number,
      fam: StarQuestFamily,
      intensity: number,
      isCross = false
    ): void => {
      const [cr0, cg0, cb0] = familyTheme(fam).rgb;
      const breathe =
        0.78 + 0.22 * Math.sin(energy * SWARM_MANDALA_PULSE + edgeIdx * 0.17);
      const m = intensity * breathe * (isCross ? 0.72 : 1);
      const o = edgeIdx * 6;
      this.linePositions[o] = ax;
      this.linePositions[o + 1] = ay;
      this.linePositions[o + 2] = az;
      this.linePositions[o + 3] = bx;
      this.linePositions[o + 4] = by;
      this.linePositions[o + 5] = bz;
      for (let k = 0; k < 2; k++) {
        const c = o + k * 3;
        const tip = k === 0 ? 1 : 0.88 + 0.12 * Math.sin(energy * 0.3 + edgeIdx);
        this.lineColors[c] = Math.min(1.1, cr0 * m * tip);
        this.lineColors[c + 1] = Math.min(1.1, cg0 * m * tip);
        this.lineColors[c + 2] = Math.min(1.1, cb0 * m * tip);
      }
      edgeIdx++;
    };

    const writePair = (i: number, j: number, hubIntensity: number, isCross = false): void => {
      const fa = this.quests[i].family;
      const focused = linked !== null && linked.has(i) && linked.has(j);
      const dim = linked !== null && !focused;
      let intensity = focused ? 0.92 : hubIntensity;
      if (dim) intensity *= 0.14;
      writeSegment(
        posAttr.getX(i),
        posAttr.getY(i),
        posAttr.getZ(i),
        posAttr.getX(j),
        posAttr.getY(j),
        posAttr.getZ(j),
        fa,
        intensity,
        isCross
      );
    };

    // Rayons hub → centre de famille (étoile mandala)
    for (const qi of this.mandalaHubQuestIdx) {
      const fam = this.quests[qi].family;
      const hub = this.swarmCentroids.get(fam);
      if (!hub) continue;
      const focused = linked !== null && linked.has(qi);
      const dim = linked !== null && !focused;
      let intensity = focused ? 0.85 : 0.38;
      if (dim) intensity *= 0.12;
      writeSegment(
        posAttr.getX(qi),
        posAttr.getY(qi),
        posAttr.getZ(qi),
        hub.x,
        hub.y,
        hub.z,
        fam,
        intensity
      );
    }

    // Anneaux intra-famille (polygones qui tournent lentement)
    for (const [i, j] of this.mandalaRingPairs) {
      writePair(i, j, 0.52);
    }

    // Pentagone inter-familles (couche fractale globale)
    for (const [i, j] of this.mandalaCrossPairs) {
      writePair(i, j, 0.34, true);
    }

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
    this.flushLineAlong(geom);
    this.syncFilamentRibbon();
  }

  private flushLineAlong(geom: THREE.BufferGeometry): void {
    const alongAttr = geom.getAttribute('along') as THREE.BufferAttribute | undefined;
    if (!alongAttr) return;
    const n = Math.min(alongAttr.count, this.lineAlong.length);
    for (let i = 0; i < n; i += 2) {
      this.lineAlong[i] = 0;
      this.lineAlong[i + 1] = 1;
    }
    (alongAttr.array as Float32Array).set(this.lineAlong);
    alongAttr.needsUpdate = true;
  }

  private writeGhostPositions(pos: THREE.BufferAttribute): void {
    const t = this.driftTime;
    for (let i = 0; i < this.quests.length; i++) {
      const phase = this.driftPhase[i] + t * 1.35;
      const ox = Math.cos(phase) * GHOST_OFFSET;
      const oy = Math.sin(phase * 0.87) * GHOST_OFFSET * 0.7;
      const oz = Math.sin(phase * 0.55) * GHOST_OFFSET * 0.35;
      const i3 = i * 3;
      this.ghostPositions[i3] = pos.getX(i) + ox;
      this.ghostPositions[i3 + 1] = pos.getY(i) + oy;
      this.ghostPositions[i3 + 2] = pos.getZ(i) + oz;
    }
    const ghostPos = this.ghostPoints.geometry.getAttribute('position') as THREE.BufferAttribute;
    (ghostPos.array as Float32Array).set(this.ghostPositions);
    ghostPos.needsUpdate = true;
  }

  private syncFilamentRibbon(): void {
    if (!this.filamentRibbon) return;
    const edgeCount = this.linePositions.length / 6;
    for (let e = 0; e < edgeCount; e++) {
      const o = e * 6;
      const ax = this.linePositions[o];
      const ay = this.linePositions[o + 1];
      const az = this.linePositions[o + 2];
      const bx = this.linePositions[o + 3];
      const by = this.linePositions[o + 4];
      const bz = this.linePositions[o + 5];
      const cr0 = this.lineColors[o];
      const cg0 = this.lineColors[o + 1];
      const cb0 = this.lineColors[o + 2];
      const cr1 = this.lineColors[o + 3];
      const cg1 = this.lineColors[o + 4];
      const cb1 = this.lineColors[o + 5];
      const sides = [-1, 1, 1, -1];
      const alongs = [0, 0, 1, 1];
      for (let k = 0; k < 4; k++) {
        const v = e * 4 + k;
        const i3 = v * 3;
        const start = k < 2;
        if (start) {
          this.filamentPositions[i3] = ax;
          this.filamentPositions[i3 + 1] = ay;
          this.filamentPositions[i3 + 2] = az;
          this.filamentOthers[i3] = bx;
          this.filamentOthers[i3 + 1] = by;
          this.filamentOthers[i3 + 2] = bz;
          this.filamentColors[i3] = cr0;
          this.filamentColors[i3 + 1] = cg0;
          this.filamentColors[i3 + 2] = cb0;
        } else {
          this.filamentPositions[i3] = bx;
          this.filamentPositions[i3 + 1] = by;
          this.filamentPositions[i3 + 2] = bz;
          this.filamentOthers[i3] = ax;
          this.filamentOthers[i3 + 1] = ay;
          this.filamentOthers[i3 + 2] = az;
          this.filamentColors[i3] = cr1;
          this.filamentColors[i3 + 1] = cg1;
          this.filamentColors[i3 + 2] = cb1;
        }
        this.filamentSides[v] = sides[k];
        this.filamentAlong[v] = alongs[k];
      }
    }
    const geom = this.filamentRibbon.geometry;
    const attrs = ['position', 'other', 'side', 'along', 'color'] as const;
    const buffers = [
      this.filamentPositions,
      this.filamentOthers,
      this.filamentSides,
      this.filamentAlong,
      this.filamentColors,
    ];
    for (let i = 0; i < attrs.length; i++) {
      const attr = geom.getAttribute(attrs[i]) as THREE.BufferAttribute | undefined;
      if (!attr) continue;
      (attr.array as Float32Array).set(buffers[i]);
      attr.needsUpdate = true;
    }
  }
  get linkEdgeCount(): number {
    return this.edgePairs.length;
  }
}
