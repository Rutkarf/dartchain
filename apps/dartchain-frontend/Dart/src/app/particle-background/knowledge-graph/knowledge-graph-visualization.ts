import * as THREE from 'three';
import {
  GRAPH_RENDER_LIMITS,
  KNOWLEDGE_GRAPH_COLORS,
  QUEST_ORBIT_CONFIG,
} from './knowledge-graph.config';
import type { KnowledgeGraphStore } from './knowledge-graph.store';
import type {
  CameraControlMode,
  KnowledgeNode,
  QuestGraphQuality,
  QuestVisualizationMode,
  VirtualAIAgent,
} from './knowledge-graph.types';
import { createSoftDiscTexture } from '../star-conquest/star-conquest-visuals';
import type { StarConquestWorld } from '../star-conquest/star-conquest-world';

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255) as [
    number,
    number,
    number,
  ];
}

export interface KnowledgeGraphHit {
  nodeId: string;
  index: number;
  worldPosition: THREE.Vector3;
}

/**
 * Renders knowledge graph nodes and edges using instanced buffers (Points + LineSegments).
 * Sits alongside StarConquestGraph — does not replace quest particles.
 */
export class KnowledgeGraphVisualization {
  readonly group = new THREE.Group();
  readonly nodePoints: THREE.Points;
  readonly nodeHalos: THREE.Points;
  readonly edgeLines: THREE.LineSegments;
  readonly syncPulseLines: THREE.LineSegments;

  private readonly discTexture: THREE.CanvasTexture;
  private nodePositions = new Float32Array(0);
  private nodeColors = new Float32Array(0);
  private nodeSizes = new Float32Array(0);
  private edgePositions = new Float32Array(0);
  private edgeColors = new Float32Array(0);
  private readonly idToIndex = new Map<string, number>();
  private visibleNodeIds = new Set<string>();
  private mode: QuestVisualizationMode = 'hybrid';
  private quality: QuestGraphQuality = 'medium';
  private focusId: string | null = null;
  private pulsePhase = 0;
  private lastUpdateMs = 0;

  constructor() {
    this.group.name = 'KnowledgeGraphLayer';
    this.discTexture = createSoftDiscTexture(64);

    const nodeGeom = new THREE.BufferGeometry();
    nodeGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(0), 3));
    nodeGeom.setAttribute('color', new THREE.BufferAttribute(new Float32Array(0), 3));
    const nodeMat = new THREE.PointsMaterial({
      size: 0.2,
      map: this.discTexture,
      transparent: true,
      opacity: 0.88,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.nodePoints = new THREE.Points(nodeGeom, nodeMat);
    this.nodePoints.name = 'kg-nodes';

    const haloGeom = nodeGeom.clone();
    const haloMat = new THREE.PointsMaterial({
      size: 0.38,
      map: this.discTexture,
      transparent: true,
      opacity: 0.35,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.nodeHalos = new THREE.Points(haloGeom, haloMat);
    this.nodeHalos.name = 'kg-halos';

    const edgeGeom = new THREE.BufferGeometry();
    edgeGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(0), 3));
    edgeGeom.setAttribute('color', new THREE.BufferAttribute(new Float32Array(0), 3));
    const edgeMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.edgeLines = new THREE.LineSegments(edgeGeom, edgeMat);
    this.edgeLines.name = 'kg-edges';

    const pulseGeom = edgeGeom.clone();
    const pulseMat = new THREE.LineBasicMaterial({
      color: 0x66ffcc,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.syncPulseLines = new THREE.LineSegments(pulseGeom, pulseMat);
    this.syncPulseLines.name = 'kg-sync-pulse';

    this.group.add(this.nodeHalos);
    this.group.add(this.edgeLines);
    this.group.add(this.syncPulseLines);
    this.group.add(this.nodePoints);
  }

  setVisualizationMode(mode: QuestVisualizationMode): void {
    this.mode = mode;
    const show =
      mode === 'knowledge-graph' || mode === 'hybrid';
    this.group.visible = show;
    this.edgeLines.visible = show;
    this.nodePoints.visible = show;
    this.nodeHalos.visible = show;
  }

  setQuality(quality: QuestGraphQuality): void {
    this.quality = quality;
  }

  getVisualizationMode(): QuestVisualizationMode {
    return this.mode;
  }

  setFocus(nodeId: string | null): void {
    this.focusId = nodeId;
  }

  syncFromStore(store: KnowledgeGraphStore): void {
    const t0 = performance.now();
    const limits = GRAPH_RENDER_LIMITS[this.quality];
    let nodes = store.getPublicNodes();
    if (this.mode === 'hybrid') {
      // In hybrid, show peers + agents + system; quest nodes already rendered by StarConquest
      nodes = nodes.filter((n) => n.type !== 'quest');
    }
    nodes = nodes.slice(0, limits.maxNodes);
    const nodeIdSet = new Set(nodes.map((n) => n.id));

    const edges = store
      .getPublicEdges()
      .filter((e) => nodeIdSet.has(e.sourceId) && nodeIdSet.has(e.targetId))
      .slice(0, limits.maxEdges);

    this.rebuildNodes(nodes, store.getAllAgents());
    this.rebuildEdges(edges, nodes);
    this.lastUpdateMs = performance.now() - t0;
  }

  private rebuildNodes(nodes: KnowledgeNode[], agents: VirtualAIAgent[]): void {
    const count = nodes.length;
    this.nodePositions = new Float32Array(count * 3);
    this.nodeColors = new Float32Array(count * 3);
    this.nodeSizes = new Float32Array(count);
    this.idToIndex.clear();
    this.visibleNodeIds.clear();

    const agentByNode = new Map(agents.map((a) => [a.nodeId, a]));

    nodes.forEach((node, i) => {
      this.idToIndex.set(node.id, i);
      this.visibleNodeIds.add(node.id);
      const i3 = i * 3;
      this.nodePositions[i3] = node.position.x;
      this.nodePositions[i3 + 1] = node.position.y;
      this.nodePositions[i3 + 2] = node.position.z;

      let [r, g, b] = hexToRgb(node.color);
      const agent = agentByNode.get(node.id);
      if (this.focusId && this.focusId !== node.id) {
        r *= 0.45;
        g *= 0.45;
        b *= 0.45;
      } else if (this.focusId === node.id) {
        [r, g, b] = hexToRgb(KNOWLEDGE_GRAPH_COLORS.selectedNode);
      }
      if (agent?.state === 'offline') {
        r *= 0.35;
        g *= 0.35;
        b *= 0.35;
      } else if (agent?.state === 'thinking' || agent?.state === 'communicating') {
        r = Math.min(1, r * 1.25);
        g = Math.min(1, g * 1.15);
      }
      this.nodeColors[i3] = r;
      this.nodeColors[i3 + 1] = g;
      this.nodeColors[i3 + 2] = b;
      this.nodeSizes[i] = 0.14 + node.energy * 0.06;
    });

    this.applyBuffer(this.nodePoints, this.nodePositions, this.nodeColors);
    this.applyBuffer(this.nodeHalos, this.nodePositions, this.nodeColors);
    const haloMat = this.nodeHalos.material as THREE.PointsMaterial;
    haloMat.size = this.quality === 'ultra-low' ? 0.28 : 0.42;
    const nodeMat = this.nodePoints.material as THREE.PointsMaterial;
    nodeMat.size = this.quality === 'ultra-low' ? 0.16 : 0.22;
  }

  private rebuildEdges(
    edges: { sourceId: string; targetId: string; weight: number; type: string }[],
    nodes: KnowledgeNode[]
  ): void {
    const posById = new Map(nodes.map((n) => [n.id, n.position]));
    const segments = edges.filter(
      (e) => posById.has(e.sourceId) && posById.has(e.targetId)
    );
    this.edgePositions = new Float32Array(segments.length * 6);
    this.edgeColors = new Float32Array(segments.length * 6);

    segments.forEach((edge, i) => {
      const a = posById.get(edge.sourceId)!;
      const b = posById.get(edge.targetId)!;
      const i6 = i * 6;
      this.edgePositions[i6] = a.x;
      this.edgePositions[i6 + 1] = a.y;
      this.edgePositions[i6 + 2] = a.z;
      this.edgePositions[i6 + 3] = b.x;
      this.edgePositions[i6 + 4] = b.y;
      this.edgePositions[i6 + 5] = b.z;
      const alpha = edge.type === 'synced-with' ? 0.85 : 0.55;
      const w = 0.35 + edge.weight * 0.12;
      for (let k = 0; k < 6; k += 3) {
        this.edgeColors[i6 + k] = w * alpha;
        this.edgeColors[i6 + k + 1] = 0.75 * alpha;
        this.edgeColors[i6 + k + 2] = 1 * alpha;
      }
    });

    this.applyBuffer(this.edgeLines, this.edgePositions, this.edgeColors);
    this.syncPulseLines.geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.edgePositions.slice(), 3)
    );
  }

  private applyBuffer(
    points: THREE.Points | THREE.LineSegments,
    positions: Float32Array,
    colors: Float32Array
  ): void {
    const geom = points.geometry;
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geom.attributes['position'].needsUpdate = true;
    geom.attributes['color'].needsUpdate = true;
  }

  tick(deltaMs: number): void {
    if (!this.group.visible) return;
    this.pulsePhase += deltaMs * 0.002;
    const pulseMat = this.syncPulseLines.material as THREE.LineBasicMaterial;
    if (this.quality === 'high' || this.quality === 'medium') {
      pulseMat.opacity = 0.15 + Math.sin(this.pulsePhase) * 0.12;
    } else {
      pulseMat.opacity = 0;
    }
  }

  getLastUpdateDurationMs(): number {
    return this.lastUpdateMs;
  }

  getVisibleCounts(): { nodes: number; edges: number } {
    return {
      nodes: this.visibleNodeIds.size,
      edges: this.edgePositions.length / 6,
    };
  }

  pick(
    raycaster: THREE.Raycaster,
    camera: THREE.PerspectiveCamera,
    ndc: THREE.Vector2,
    radiusPx: number
  ): KnowledgeGraphHit | null {
    if (!this.group.visible || this.visibleNodeIds.size === 0) return null;
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObject(this.nodePoints, false);
    if (hits.length > 0 && hits[0].index != null) {
      const index = hits[0].index;
      const nodeId = [...this.idToIndex.entries()].find(([, i]) => i === index)?.[0];
      if (nodeId) {
        return {
          nodeId,
          index,
          worldPosition: hits[0].point.clone(),
        };
      }
    }
    // Fallback screen-radius pick for mobile
    const tmp = new THREE.Vector3();
    let best: KnowledgeGraphHit | null = null;
    let bestD = radiusPx;
    for (const [nodeId, index] of this.idToIndex) {
      const i3 = index * 3;
      tmp.set(this.nodePositions[i3], this.nodePositions[i3 + 1], this.nodePositions[i3 + 2]);
      tmp.project(camera);
      const sx = ((tmp.x + 1) / 2) * window.innerWidth;
      const sy = ((-tmp.y + 1) / 2) * window.innerHeight;
      const d = Math.hypot(sx - ((ndc.x + 1) / 2) * window.innerWidth, sy - ((-ndc.y + 1) / 2) * window.innerHeight);
      if (d < bestD) {
        bestD = d;
        best = { nodeId, index, worldPosition: tmp.clone() };
      }
    }
    return best;
  }

  dispose(): void {
    this.nodePoints.geometry.dispose();
    (this.nodePoints.material as THREE.Material).dispose();
    this.nodeHalos.geometry.dispose();
    (this.nodeHalos.material as THREE.Material).dispose();
    this.edgeLines.geometry.dispose();
    (this.edgeLines.material as THREE.Material).dispose();
    this.syncPulseLines.geometry.dispose();
    (this.syncPulseLines.material as THREE.Material).dispose();
    this.discTexture.dispose();
  }
}

/** Camera state machine for the quest / knowledge-graph layer (Star Conquest canvas). */
export class QuestCameraController {
  private mode: CameraControlMode = 'world-player';
  private baseTargetZ: number = QUEST_ORBIT_CONFIG.defaultCameraZ;
  private targetCameraZ: number = QUEST_ORBIT_CONFIG.defaultCameraZ;
  private currentCameraZ: number = QUEST_ORBIT_CONFIG.defaultCameraZ;
  private userZoomOffset = 0;
  private transitionStart = 0;
  private transitionDuration = 0;
  private savedView: { x: number; y: number; z: number } | null = null;
  private orbitState = 'idle';

  adjustUserZoom(delta: number): void {
    if (this.mode !== 'world-player') return;
    this.userZoomOffset = Math.max(-58, Math.min(58, this.userZoomOffset + delta));
    this.targetCameraZ = QUEST_ORBIT_CONFIG.defaultCameraZ + this.userZoomOffset;
  }

  resetUserZoom(): void {
    this.userZoomOffset = 0;
    if (this.mode === 'world-player') {
      this.targetCameraZ = QUEST_ORBIT_CONFIG.defaultCameraZ;
    }
  }

  getMode(): CameraControlMode {
    return this.mode;
  }

  getOrbitTransitionState(): string {
    return this.orbitState;
  }

  getCameraDistance(): number {
    return this.currentCameraZ;
  }

  focusNode(
    world: StarConquestWorld,
    camera: THREE.PerspectiveCamera,
    worldPos: THREE.Vector3,
    cluster = false
  ): void {
    if (!this.savedView) {
      const offset = world.getViewOffset();
      this.savedView = { x: offset.x, y: offset.y, z: camera.position.z };
    }
    this.mode = cluster ? 'quest-cluster-focus' : 'quest-node-focus';
    world.focusWorldPoint(worldPos);
    this.targetCameraZ = cluster
      ? QUEST_ORBIT_CONFIG.clusterFocusCameraZ
      : QUEST_ORBIT_CONFIG.nodeFocusCameraZ;
    this.baseTargetZ = this.targetCameraZ;
    this.transitionStart = performance.now();
    this.transitionDuration = QUEST_ORBIT_CONFIG.focusDurationMs;
    this.orbitState = 'focusing';
  }

  setOverview(world: StarConquestWorld): void {
    this.mode = 'quest-overview';
    world.resetView(false);
    this.targetCameraZ = QUEST_ORBIT_CONFIG.overviewCameraZ;
    this.baseTargetZ = this.targetCameraZ;
    this.transitionStart = performance.now();
    this.transitionDuration = QUEST_ORBIT_CONFIG.focusDurationMs;
    this.orbitState = 'overview';
  }

  restore(world: StarConquestWorld, camera: THREE.PerspectiveCamera): void {
    this.mode = 'world-player';
    this.baseTargetZ = QUEST_ORBIT_CONFIG.defaultCameraZ;
    this.targetCameraZ = QUEST_ORBIT_CONFIG.defaultCameraZ + this.userZoomOffset;
    this.transitionStart = performance.now();
    this.transitionDuration = QUEST_ORBIT_CONFIG.restoreDurationMs;
    this.orbitState = 'restoring';
    if (this.savedView) {
      world.focusWorldPoint(new THREE.Vector3(this.savedView.x, this.savedView.y, 0));
      this.savedView = null;
    } else {
      world.resetView(false);
    }
  }

  tick(_deltaMs: number, camera: THREE.PerspectiveCamera): void {
    const t =
      this.transitionDuration > 0
        ? Math.min(1, (performance.now() - this.transitionStart) / this.transitionDuration)
        : 1;
    const smooth = 1 - Math.pow(1 - t, 3);
    this.currentCameraZ += (this.targetCameraZ - this.currentCameraZ) * smooth * 0.18;
    camera.position.z = this.currentCameraZ;
    if (Math.abs(this.currentCameraZ - this.targetCameraZ) < 0.5 && this.orbitState !== 'idle') {
      this.orbitState = 'idle';
    }
  }
}
