import type { QuestGraphQuality } from './knowledge-graph.types';

export const GRAPH_RENDER_LIMITS: Record<
  QuestGraphQuality,
  { maxNodes: number; maxEdges: number }
> = {
  'ultra-low': { maxNodes: 300, maxEdges: 250 },
  low: { maxNodes: 800, maxEdges: 700 },
  medium: { maxNodes: 1800, maxEdges: 1800 },
  high: { maxNodes: 3000, maxEdges: 3500 },
};

export const QUEST_ORBIT_CONFIG = {
  overviewDistance: 18,
  nodeFocusDistance: 4.5,
  clusterFocusDistance: 9,
  minDistance: 2.5,
  maxDistance: 80,
  dampingFactor: 0.08,
  rotateSpeed: 0.45,
  zoomSpeed: 0.7,
  focusDurationMs: 650,
  restoreDurationMs: 550,
  minPolarAngle: 0.25,
  maxPolarAngle: 1.5,
  /** Camera Z in Star Conquest world space (default pan view). */
  defaultCameraZ: 160,
  overviewCameraZ: 175,
  nodeFocusCameraZ: 118,
  clusterFocusCameraZ: 142,
} as const;

/** Cyberpunk palette — debug colors per entity type. */
export const KNOWLEDGE_GRAPH_COLORS = {
  localNode: '#3ecfdc',
  remoteNode: '#9b59ff',
  aiAgentActive: '#ffe066',
  peerSynced: '#3dff8a',
  peerDegraded: '#ff9f43',
  peerOffline: '#8899aa',
  messageRejected: '#ff4757',
  selectedNode: '#f8fcff',
  questNode: '#52e6ed',
  peerNode: '#7c6cf0',
  clusterNode: '#ff6bcb',
  systemNode: '#66ffcc',
} as const;

export const GRAPH_SYNC_LIMITS = {
  maxMessageBytes: 64_000,
  maxGraphDepth: 12,
  maxNodes: 4000,
  maxEdges: 5000,
  nodeTtlMs: 3_600_000,
  dedupWindowMs: 30_000,
} as const;

/** Fields never allowed in metadata or labels (privacy). */
export const SENSITIVE_FIELD_PATTERNS = [
  /password/i,
  /private.?key/i,
  /secret/i,
  /token/i,
  /authorization/i,
  /bearer/i,
  /api.?key/i,
] as const;
