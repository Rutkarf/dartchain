import * as THREE from 'three';
import { KNOWLEDGE_GRAPH_COLORS } from '../knowledge-graph/knowledge-graph.config';
import type { KnowledgeGraphStore } from '../knowledge-graph/knowledge-graph.store';
import type {
  KnowledgeEdge,
  KnowledgeNode,
  QuestVisualizationMode,
  VirtualAIAgent,
} from '../knowledge-graph/knowledge-graph.types';
import type { StarConquestUniverseTheme } from './star-conquest-universe.types';
import { createSoftDiscTexture } from './star-conquest-visuals';

const MAX_NETWORK_NODES = 48;
const MAX_NETWORK_EDGES = 96;

function hexToRgb01(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255) as [
    number,
    number,
    number,
  ];
}

/**
 * Couche réseau IA/P2P intégrée au graphe Star Conquest (même groupe, même langage visuel).
 * Les quêtes restent les particules principales ; peers/agents/system = satellites neuronal.
 */
export class StarConquestNetworkLayer {
  readonly group = new THREE.Group();
  readonly nodePoints: THREE.Points;
  readonly haloPoints: THREE.Points;
  readonly networkLines: THREE.LineSegments;

  private readonly discTexture: THREE.CanvasTexture;
  private positions = new Float32Array(0);
  private colors = new Float32Array(0);
  private linePositions = new Float32Array(0);
  private lineColors = new Float32Array(0);
  private readonly idToIndex = new Map<string, number>();
  private mode: QuestVisualizationMode = 'hybrid';
  private focusId: string | null = null;
  private pulsePhase = 0;
  private orbitPhase = 0;
  private nodeIds: string[] = [];
  private basePositions = new Float32Array(0);

  constructor() {
    this.group.name = 'star-conquest-network';
    this.discTexture = createSoftDiscTexture(64);

    const nodeGeom = new THREE.BufferGeometry();
    nodeGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(0), 3));
    nodeGeom.setAttribute('color', new THREE.BufferAttribute(new Float32Array(0), 3));
    const nodeMat = new THREE.PointsMaterial({
      size: 2.4,
      map: this.discTexture,
      transparent: true,
      opacity: 0.82,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.nodePoints = new THREE.Points(nodeGeom, nodeMat);
    this.nodePoints.name = 'sc-network-nodes';
    this.nodePoints.frustumCulled = false;

    const haloGeom = nodeGeom.clone();
    const haloMat = new THREE.PointsMaterial({
      size: 4.8,
      map: this.discTexture,
      transparent: true,
      opacity: 0.28,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.haloPoints = new THREE.Points(haloGeom, haloMat);
    this.haloPoints.name = 'sc-network-halos';
    this.haloPoints.frustumCulled = false;
    this.haloPoints.raycast = () => {};

    const lineGeom = new THREE.BufferGeometry();
    lineGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(0), 3));
    lineGeom.setAttribute('color', new THREE.BufferAttribute(new Float32Array(0), 3));
    const lineMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.52,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.networkLines = new THREE.LineSegments(lineGeom, lineMat);
    this.networkLines.name = 'sc-network-links';
    this.networkLines.frustumCulled = false;

    this.group.add(this.networkLines);
    this.group.add(this.haloPoints);
    this.group.add(this.nodePoints);
    this.applyMode(this.mode);
  }

  setVisualizationMode(mode: QuestVisualizationMode): void {
    this.mode = mode;
    this.applyMode(mode);
  }

  setFocus(nodeId: string | null): void {
    this.focusId = nodeId;
  }

  syncFromStore(store: KnowledgeGraphStore): void {
    if (this.mode === 'legacy-particles') {
      this.clearBuffers();
      return;
    }

    let nodes = store.getPublicNodes().filter((n) => n.type !== 'quest');
    if (this.mode === 'hybrid') {
      nodes = nodes.filter((n) => ['peer', 'ai-agent', 'system', 'cluster'].includes(n.type));
    }
    nodes = nodes.slice(0, MAX_NETWORK_NODES);

    const nodeIds = new Set(nodes.map((n) => n.id));
    const edges = store
      .getPublicEdges()
      .filter(
        (e) =>
          e.type === 'synced-with' ||
          e.type === 'observed-by' ||
          e.type === 'connected-to'
      )
      .filter((e) => nodeIds.has(e.sourceId) && nodeIds.has(e.targetId))
      .slice(0, MAX_NETWORK_EDGES);

    const agents = store.getAllAgents();
    this.rebuildNodes(nodes, agents);
    this.rebuildEdges(edges, nodes);
  }

  tick(deltaMs: number, universe?: StarConquestUniverseTheme): void {
    if (!this.group.visible || this.positions.length === 0) return;
    this.pulsePhase += deltaMs * 0.0025;
    this.orbitPhase += deltaMs * 0.00008;
    const coreMat = this.nodePoints.material as THREE.PointsMaterial;
    const haloMat = this.haloPoints.material as THREE.PointsMaterial;
    const pulse = 1 + Math.sin(this.pulsePhase) * 0.08;
    coreMat.size = 2.2 * pulse;
    haloMat.size = 4.4 * pulse;
    const lineMat = this.networkLines.material as THREE.LineBasicMaterial;
    lineMat.opacity = 0.4 + Math.sin(this.pulsePhase * 1.2) * 0.12;

    if (
      universe?.peerLayout === 'orbital-rings' ||
      universe?.peerLayout === 'swarm-orbit'
    ) {
      this.animateOrbitalPeers(universe.peerLayout);
    }
  }

  private animateOrbitalPeers(layout: StarConquestUniverseTheme['peerLayout']): void {
    const posAttr = this.nodePoints.geometry.getAttribute('position') as THREE.BufferAttribute;
    const speed = layout === 'swarm-orbit' ? 0.16 : 0.6;
    for (let i = 0; i < this.nodeIds.length; i++) {
      const i3 = i * 3;
      const bx = this.basePositions[i3];
      const by = this.basePositions[i3 + 1];
      const bz = this.basePositions[i3 + 2];
      const angle = this.orbitPhase * speed + i * 0.4;
      const wobble = Math.sin(angle) * 1.2;
      const x = bx + Math.cos(angle) * wobble;
      const y = by + Math.sin(angle) * wobble;
      posAttr.setXYZ(i, x, y, bz);
      this.positions[i3] = x;
      this.positions[i3 + 1] = y;
    }
    posAttr.needsUpdate = true;
    const haloAttr = this.haloPoints.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < posAttr.count; i++) {
      haloAttr.setXYZ(i, posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
    }
    haloAttr.needsUpdate = true;
  }

  getNodeWorldPosition(nodeId: string, out = new THREE.Vector3()): THREE.Vector3 | null {
    const idx = this.idToIndex.get(nodeId);
    if (idx === undefined) return null;
    const i3 = idx * 3;
    out.set(this.positions[i3], this.positions[i3 + 1], this.positions[i3 + 2]);
    this.nodePoints.localToWorld(out);
    return out;
  }

  dispose(): void {
    this.nodePoints.geometry.dispose();
    (this.nodePoints.material as THREE.Material).dispose();
    this.haloPoints.geometry.dispose();
    (this.haloPoints.material as THREE.Material).dispose();
    this.networkLines.geometry.dispose();
    (this.networkLines.material as THREE.Material).dispose();
    this.discTexture.dispose();
  }

  private applyMode(mode: QuestVisualizationMode): void {
    const show = mode === 'hybrid' || mode === 'knowledge-graph';
    this.group.visible = show;
  }

  private clearBuffers(): void {
    this.idToIndex.clear();
    this.positions = new Float32Array(0);
    this.colors = new Float32Array(0);
    this.applyGeom(this.nodePoints, this.positions, this.colors);
    this.applyGeom(this.haloPoints, this.positions, this.colors);
    this.linePositions = new Float32Array(0);
    this.lineColors = new Float32Array(0);
    this.applyGeom(this.networkLines, this.linePositions, this.lineColors);
  }

  private rebuildNodes(nodes: KnowledgeNode[], agents: VirtualAIAgent[]): void {
    const agentByNode = new Map(agents.map((a) => [a.nodeId, a]));
    this.positions = new Float32Array(nodes.length * 3);
    this.colors = new Float32Array(nodes.length * 3);
    this.basePositions = new Float32Array(nodes.length * 3);
    this.nodeIds = nodes.map((n) => n.id);
    this.idToIndex.clear();

    nodes.forEach((node, i) => {
      this.idToIndex.set(node.id, i);
      const i3 = i * 3;
      this.positions[i3] = node.position.x;
      this.positions[i3 + 1] = node.position.y;
      this.positions[i3 + 2] = node.position.z;
      this.basePositions[i3] = node.position.x;
      this.basePositions[i3 + 1] = node.position.y;
      this.basePositions[i3 + 2] = node.position.z;

      let [r, g, b] = hexToRgb01(node.color);
      const agent = agentByNode.get(node.id);
      if (node.type === 'peer') {
        [r, g, b] = hexToRgb01(KNOWLEDGE_GRAPH_COLORS.peerSynced);
      } else if (node.type === 'ai-agent') {
        [r, g, b] = hexToRgb01(KNOWLEDGE_GRAPH_COLORS.aiAgentActive);
      } else if (node.type === 'system') {
        [r, g, b] = hexToRgb01(KNOWLEDGE_GRAPH_COLORS.localNode);
      }
      if (agent?.state === 'offline') {
        r *= 0.35;
        g *= 0.35;
        b *= 0.35;
      }
      if (this.focusId && this.focusId !== node.id) {
        r *= 0.45;
        g *= 0.45;
        b *= 0.45;
      } else if (this.focusId === node.id) {
        [r, g, b] = hexToRgb01(KNOWLEDGE_GRAPH_COLORS.selectedNode);
      }
      this.colors[i3] = r;
      this.colors[i3 + 1] = g;
      this.colors[i3 + 2] = b;
    });

    this.applyGeom(this.nodePoints, this.positions, this.colors);
    this.applyGeom(this.haloPoints, this.positions, this.colors);
  }

  private rebuildEdges(edges: KnowledgeEdge[], nodes: KnowledgeNode[]): void {
    const posById = new Map(nodes.map((n) => [n.id, n.position]));
    this.linePositions = new Float32Array(edges.length * 6);
    this.lineColors = new Float32Array(edges.length * 6);

    edges.forEach((edge, i) => {
      const a = posById.get(edge.sourceId);
      const b = posById.get(edge.targetId);
      if (!a || !b) return;
      const i6 = i * 6;
      this.linePositions[i6] = a.x;
      this.linePositions[i6 + 1] = a.y;
      this.linePositions[i6 + 2] = a.z;
      this.linePositions[i6 + 3] = b.x;
      this.linePositions[i6 + 4] = b.y;
      this.linePositions[i6 + 5] = b.z;
      const alpha = edge.type === 'synced-with' ? 0.9 : 0.55;
      for (let k = 0; k < 6; k += 3) {
        this.lineColors[i6 + k] = 0.35 * alpha;
        this.lineColors[i6 + k + 1] = 0.85 * alpha;
        this.lineColors[i6 + k + 2] = 1 * alpha;
      }
    });

    this.applyGeom(this.networkLines, this.linePositions, this.lineColors);
  }

  private applyGeom(
    obj: THREE.Points | THREE.LineSegments,
    positions: Float32Array,
    colors: Float32Array
  ): void {
    const geom = obj.geometry;
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  }
}
