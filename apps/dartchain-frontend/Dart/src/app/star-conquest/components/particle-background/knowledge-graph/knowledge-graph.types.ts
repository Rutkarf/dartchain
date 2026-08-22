import type * as THREE from 'three';

export type KnowledgeNodeType =
  | 'ai-agent'
  | 'user-agent'
  | 'building'
  | 'location'
  | 'event'
  | 'message'
  | 'quest'
  | 'm4t3r'
  | 'peer'
  | 'cluster'
  | 'system';

export type KnowledgeEdgeType =
  | 'connected-to'
  | 'observed-by'
  | 'located-at'
  | 'related-to'
  | 'generated-by'
  | 'depends-on'
  | 'synced-with'
  | 'nearby'
  | 'quest-link';

export type KnowledgeVisibility = 'public' | 'local' | 'private';

export interface KnowledgeNode {
  id: string;
  type: KnowledgeNodeType;
  label?: string;
  position: { x: number; y: number; z: number };
  color: string;
  energy: number;
  confidence?: number;
  peerId?: string;
  clusterId?: string;
  createdAt: number;
  updatedAt: number;
  visibility: KnowledgeVisibility;
  metadata?: Record<string, unknown>;
}

export interface KnowledgeEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type: KnowledgeEdgeType;
  weight: number;
  confidence?: number;
  peerId?: string;
  visibility: KnowledgeVisibility;
  createdAt: number;
  updatedAt: number;
}

export interface VirtualAIAgent {
  id: string;
  nodeId: string;
  displayName: string;
  role: string;
  state: 'idle' | 'thinking' | 'moving' | 'communicating' | 'offline' | 'synced';
  capabilities: string[];
  peerId?: string;
  position?: THREE.Vector3;
  activityLevel: number;
  lastActivityAt: number;
}

export interface PeerGraphState {
  peerId: string;
  status: 'connecting' | 'connected' | 'degraded' | 'offline';
  latencyMs?: number;
  lastSeenAt: number;
  sharedNodeIds: string[];
  capabilities?: string[];
}

export type GraphSyncMode =
  | 'local'
  | 'server-authoritative'
  | 'peer-assisted'
  | 'offline-cache';

export type QuestVisualizationMode =
  | 'legacy-particles'
  | 'knowledge-graph'
  | 'hybrid';

export type QuestGraphQuality = 'ultra-low' | 'low' | 'medium' | 'high';

export type CameraControlMode =
  | 'world-player'
  | 'quest-overview'
  | 'quest-node-focus'
  | 'quest-cluster-focus';

export interface GraphSyncMessage {
  version: 1;
  type:
    | 'NODE_UPSERT'
    | 'NODE_REMOVE'
    | 'EDGE_UPSERT'
    | 'EDGE_REMOVE'
    | 'PEER_STATUS'
    | 'AGENT_STATE'
    | 'GRAPH_SNAPSHOT';
  senderPeerId: string;
  timestamp: number;
  payload: unknown;
  correlationId?: string;
}

export interface KnowledgeGraphSnapshot {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  agents: VirtualAIAgent[];
  peerStates: PeerGraphState[];
  syncMode: GraphSyncMode;
  timestamp: number;
}

export interface KnowledgeGraphDebugState {
  visualizationMode: QuestVisualizationMode;
  graphSyncMode: GraphSyncMode;
  nodeCount: number;
  visibleNodeCount: number;
  edgeCount: number;
  visibleEdgeCount: number;
  clusterCount: number;
  selectedNodeId: string | null;
  focusedNodeId: string | null;
  peerCount: number;
  connectedPeerCount: number;
  degradedPeerCount: number;
  offlinePeerCount: number;
  messagesReceived: number;
  messagesRejected: number;
  messagesDeduplicated: number;
  lastSyncTimestamp: number;
  graphUpdateDurationMs: number;
  raycastDurationMs: number;
  orbitTransitionState: string;
  cameraMode: CameraControlMode;
  questCameraDistance: number;
  fps: number;
  qualityProfile: QuestGraphQuality;
}
