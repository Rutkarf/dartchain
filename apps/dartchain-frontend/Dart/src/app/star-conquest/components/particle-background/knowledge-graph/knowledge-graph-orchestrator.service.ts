import { Injectable, inject, signal } from '@angular/core';
import {
  DEFAULT_QUEST_GRAPH_QUALITY,
  DEFAULT_QUEST_VISUALIZATION_MODE,
} from '@core/map/map-configuration';
import { PeersDataService } from '@peers/services/peers-data.service';
import type { StarConquestGraph } from '@star-conquest/star-conquest-graph';
import type { StarQuest } from '@star-conquest/star-conquest.model';
import { GraphSyncValidator } from './knowledge-graph-sync';
import { KnowledgeGraphStore } from './knowledge-graph.store';
import type { QuestGraphQuality, QuestVisualizationMode } from './knowledge-graph.types';
import { QuestCameraController } from './knowledge-graph-visualization';
import { PeerKnowledgeGraphAdapter } from './peer-knowledge-graph.adapter';
import { VirtualAIAgentRegistry } from './virtual-ai-agent.registry';
import type { StarConquestUniverseId } from '@star-conquest/star-conquest-universe.types';
import { starConquestUniverseTheme } from '@star-conquest/star-conquest-universes.config';

/**
 * Orchestrates P2P/IA data → Star Conquest particles (pas de couche Three.js séparée).
 */
@Injectable({ providedIn: 'root' })
export class KnowledgeGraphOrchestratorService {
  private readonly peersData = inject(PeersDataService);

  readonly store = new KnowledgeGraphStore({ syncMode: 'local' });
  readonly adapter = new PeerKnowledgeGraphAdapter(this.store);
  readonly agents = new VirtualAIAgentRegistry(this.store);
  readonly syncValidator = new GraphSyncValidator();
  readonly cameraController = new QuestCameraController();

  readonly visualizationMode = signal<QuestVisualizationMode>(DEFAULT_QUEST_VISUALIZATION_MODE);
  readonly quality = signal<QuestGraphQuality>(DEFAULT_QUEST_GRAPH_QUALITY);
  readonly selectedNodeId = signal<string | null>(null);
  readonly focusedNodeId = signal<string | null>(null);

  private graph: StarConquestGraph | null = null;
  private unsubStore?: () => void;
  private unsubPeers?: () => void;
  private started = false;

  bindGraph(graph: StarConquestGraph): void {
    this.graph = graph;
    graph.setVisualizationMode(this.visualizationMode());
    this.pushToGraph();
  }

  start(quests: readonly StarQuest[]): void {
    if (this.started) return;
    this.started = true;

    this.peersData.init();
    this.adapter.syncQuestCatalog(quests);
    this.agents.bootstrapFromQuests(quests);
    this.pushToGraph();

    this.unsubStore = this.store.subscribe(() => this.pushToGraph());

    this.adapter.syncPeers(this.peersData.peers());
    this.pushToGraph();

    const peerPoll = window.setInterval(() => {
      this.adapter.syncPeers(this.peersData.peers());
      this.pushToGraph();
    }, 5000);

    this.unsubPeers = () => window.clearInterval(peerPoll);
  }

  destroy(): void {
    this.unsubStore?.();
    this.unsubPeers?.();
    this.store.clear();
    this.graph = null;
    this.started = false;
  }

  setVisualizationMode(mode: QuestVisualizationMode): void {
    this.visualizationMode.set(mode);
    this.graph?.setVisualizationMode(mode);
    this.pushToGraph();
  }

  setQuality(_quality: QuestGraphQuality): void {
    this.quality.set('ultra-low');
    this.graph?.setGpuQuality('ultra-low');
  }

  setUniverse(universeId: StarConquestUniverseId): void {
    const theme = starConquestUniverseTheme(universeId);
    this.adapter.setPeerLayout(theme.peerLayout);
    this.graph?.setUniverse(theme);
    this.adapter.syncPeers(this.peersData.peers());
    this.pushToGraph();
  }

  selectNode(nodeId: string | null): void {
    this.selectedNodeId.set(nodeId);
    this.graph?.setNetworkFocus(nodeId);
    this.pushToGraph();
  }

  focusNode(nodeId: string): void {
    this.focusedNodeId.set(nodeId);
    this.selectNode(nodeId);
  }

  clearFocus(): void {
    this.focusedNodeId.set(null);
    this.selectedNodeId.set(null);
    this.graph?.setNetworkFocus(null);
    this.pushToGraph();
  }

  getNodeWorldPosition(nodeId: string, out: import('three').Vector3): import('three').Vector3 | null {
    return this.graph?.getNetworkNodeWorldPosition(nodeId, out) ?? null;
  }

  tick(deltaMs: number, peerConnected: boolean): void {
    this.agents.tick(deltaMs, peerConnected);
    this.syncValidator.pruneDedup();
    this.store.expireStale();
  }

  private pushToGraph(): void {
    this.graph?.syncKnowledgeGraph(this.store);
  }
}
