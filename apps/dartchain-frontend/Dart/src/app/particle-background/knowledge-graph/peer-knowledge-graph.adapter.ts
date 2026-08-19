import type { PeerView } from '../../core/services/blockchain-api.service';
import { KNOWLEDGE_GRAPH_COLORS } from './knowledge-graph.config';
import { hashPeerId, KnowledgeGraphStore } from './knowledge-graph.store';
import type {
  GraphSyncMode,
  KnowledgeEdge,
  KnowledgeNode,
  PeerGraphState,
} from './knowledge-graph.types';
import type { StarQuest } from '../star-conquest/star-conquest.model';
import { familyTheme } from '../star-conquest/star-conquest-families';
import type { StarConquestPeerLayout } from '../star-conquest/star-conquest-universe.types';
import { layoutPeerForUniverse } from '../star-conquest/star-conquest-universe-layout';

function peerStatusFromView(peer: PeerView): PeerGraphState['status'] {
  switch (peer.status) {
    case 'CONNECTED':
      if (peer.syncPercent != null && peer.syncPercent < 85) return 'degraded';
      return 'connected';
    case 'CONNECTING':
      return 'connecting';
    default:
      return 'offline';
  }
}

function peerColor(status: PeerGraphState['status'], latencyMs?: number | null): string {
  if (status === 'offline') return KNOWLEDGE_GRAPH_COLORS.peerOffline;
  if (status === 'degraded') return KNOWLEDGE_GRAPH_COLORS.peerDegraded;
  if (status === 'connecting') return KNOWLEDGE_GRAPH_COLORS.remoteNode;
  if (latencyMs != null && latencyMs > 400) return KNOWLEDGE_GRAPH_COLORS.peerDegraded;
  return KNOWLEDGE_GRAPH_COLORS.peerSynced;
}


/**
 * Adapts existing P2P peer data and local quest catalog into knowledge graph nodes/edges.
 * Does not create a second P2P network — reads PeersDataService snapshots only.
 */
export class PeerKnowledgeGraphAdapter {
  private readonly peerStates = new Map<string, PeerGraphState>();
  private syncMode: GraphSyncMode = 'server-authoritative';
  private peerLayout: StarConquestPeerLayout = 'ring';

  constructor(private readonly store: KnowledgeGraphStore) {}

  setPeerLayout(layout: StarConquestPeerLayout): void {
    this.peerLayout = layout;
  }

  setSyncMode(mode: GraphSyncMode): void {
    this.syncMode = mode;
    this.store.setSyncMode(mode);
  }

  getSyncMode(): GraphSyncMode {
    return this.syncMode;
  }

  getPeerStates(): PeerGraphState[] {
    return [...this.peerStates.values()];
  }

  /** Map Star Conquest quests into knowledge nodes (local, public). */
  syncQuestCatalog(quests: readonly StarQuest[]): void {
    const now = Date.now();
    for (const quest of quests) {
      const theme = familyTheme(quest.family);
      const rgb = theme?.rgb255 ?? [82, 230, 237];
      const node: KnowledgeNode = {
        id: `quest:${quest.id}`,
        type: 'quest',
        label: quest.title.slice(0, 40),
        position: { ...quest.position },
        color: `#${rgb.map((c) => c.toString(16).padStart(2, '0')).join('')}`,
        energy: Math.min(3, 0.6 + quest.rewardM4T3R / 100),
        confidence: quest.status === 'completed' ? 1 : quest.status === 'active' ? 0.85 : 0.6,
        createdAt: now,
        updatedAt: now,
        visibility: 'public',
        metadata: {
          family: quest.family,
          rarity: quest.rarity,
          status: quest.status,
          mock: true,
        },
      };
      this.store.upsertNode(node);
    }

    for (const quest of quests) {
      for (const targetId of quest.connections) {
        const edgeId = `quest-link:${quest.id}:${targetId}`;
        const edge: KnowledgeEdge = {
          id: edgeId,
          sourceId: `quest:${quest.id}`,
          targetId: `quest:${targetId}`,
          type: 'quest-link',
          weight: 1,
          visibility: 'public',
          createdAt: now,
          updatedAt: now,
        };
        this.store.upsertEdge(edge);
      }
    }
  }

  /** Convert backend peer views into graph nodes + hub edges to local system node. */
  syncPeers(peers: readonly PeerView[]): void {
    const now = Date.now();
    this.ensureSystemNode();

    const activePeerIds = new Set<string>();
    let peerIndex = 0;
    for (const peer of peers) {
      const peerId = hashPeerId(peer.url);
      activePeerIds.add(peerId);
      const status = peerStatusFromView(peer);
      const latencyMs = peer.latencyMs ?? undefined;
      const layout = layoutPeerForUniverse(this.peerLayout, {
        seed: peer.url,
        index: peerIndex,
        total: peers.length,
        syncPercent: peer.syncPercent,
        latencyMs: peer.latencyMs,
        chainHeight: peer.chainHeight,
      });
      peerIndex++;

      const node: KnowledgeNode = {
        id: `peer:${peerId}`,
        type: 'peer',
        label: `Peer ${peerId.slice(0, 6)}`,
        position: { x: layout.x, y: layout.y, z: layout.z },
        color: peerColor(status, latencyMs),
        energy: status === 'connected' ? 1.2 : status === 'degraded' ? 0.7 : 0.35,
        confidence: peer.syncPercent != null ? peer.syncPercent / 100 : undefined,
        peerId,
        clusterId: 'p2p-mesh',
        createdAt: now,
        updatedAt: now,
        visibility: 'public',
        metadata: {
          status: peer.status,
          chainHeight: peer.chainHeight ?? null,
          syncPercent: peer.syncPercent ?? null,
          estimated: !peer.latencyMs,
        },
      };
      this.store.upsertNode(node);

      const edge: KnowledgeEdge = {
        id: `synced-with:system:${peerId}`,
        sourceId: 'system:local-node',
        targetId: `peer:${peerId}`,
        type: 'synced-with',
        weight: status === 'connected' ? 1 : 0.4,
        confidence: peer.syncPercent != null ? peer.syncPercent / 100 : 0.5,
        peerId,
        visibility: 'public',
        createdAt: now,
        updatedAt: now,
      };
      this.store.upsertEdge(edge);

      this.peerStates.set(peerId, {
        peerId,
        status,
        latencyMs,
        lastSeenAt: now,
        sharedNodeIds: [`peer:${peerId}`],
        capabilities: ['blockchain-sync', 'quest-progress'],
      });
    }

    // Mark removed peers offline (keep node for fade-out)
    for (const [peerId, state] of this.peerStates) {
      if (!activePeerIds.has(peerId)) {
        this.peerStates.set(peerId, { ...state, status: 'offline', lastSeenAt: now });
        const node = this.store.getNode(`peer:${peerId}`);
        if (node) {
          this.store.upsertNode({
            ...node,
            color: KNOWLEDGE_GRAPH_COLORS.peerOffline,
            energy: 0.2,
            updatedAt: now,
          });
        }
      }
    }

    if (peers.length === 0 && this.syncMode !== 'local') {
      this.setSyncMode('offline-cache');
    } else if (peers.some((p) => p.status === 'CONNECTED')) {
      this.setSyncMode('peer-assisted');
    }
  }

  private ensureSystemNode(): void {
    const now = Date.now();
    if (this.store.getNode('system:local-node')) return;
    this.store.upsertNode({
      id: 'system:local-node',
      type: 'system',
      label: 'Local Node',
      position: { x: 0, y: 0, z: -8 },
      color: KNOWLEDGE_GRAPH_COLORS.localNode,
      energy: 1.5,
      createdAt: now,
      updatedAt: now,
      visibility: 'local',
      metadata: { mock: false },
    });
  }
}
