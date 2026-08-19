import {
  GRAPH_SYNC_LIMITS,
  SENSITIVE_FIELD_PATTERNS,
} from './knowledge-graph.config';
import type {
  GraphSyncMode,
  KnowledgeEdge,
  KnowledgeNode,
  KnowledgeVisibility,
  VirtualAIAgent,
} from './knowledge-graph.types';

export interface KnowledgeGraphStoreOptions {
  syncMode?: GraphSyncMode;
}

function hashPeerId(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `p${(h >>> 0).toString(16).slice(0, 8)}`;
}

export function anonymizeLabel(raw: string | undefined, fallback: string): string {
  if (!raw?.trim()) return fallback;
  for (const pattern of SENSITIVE_FIELD_PATTERNS) {
    if (pattern.test(raw)) return fallback;
  }
  if (raw.length > 48) return `${raw.slice(0, 20)}…`;
  return raw;
}

export function sanitizeMetadata(
  metadata: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (!metadata) return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (SENSITIVE_FIELD_PATTERNS.some((p) => p.test(key))) continue;
    if (typeof value === 'string' && SENSITIVE_FIELD_PATTERNS.some((p) => p.test(value))) {
      continue;
    }
    out[key] = value;
  }
  return Object.keys(out).length ? out : undefined;
}

function isValidVisibility(v: unknown): v is KnowledgeVisibility {
  return v === 'public' || v === 'local' || v === 'private';
}

export function validateNode(node: unknown): KnowledgeNode | null {
  if (!node || typeof node !== 'object') return null;
  const n = node as Partial<KnowledgeNode>;
  if (!n.id || typeof n.id !== 'string' || n.id.length > 128) return null;
  if (!n.type || typeof n.type !== 'string') return null;
  if (!n.position || typeof n.position !== 'object') return null;
  const { x, y, z } = n.position as { x?: number; y?: number; z?: number };
  if (![x, y, z].every((v) => typeof v === 'number' && Number.isFinite(v))) return null;
  if (typeof n.color !== 'string' || !n.color.startsWith('#')) return null;
  if (typeof n.energy !== 'number' || n.energy < 0 || n.energy > 10) return null;
  if (!isValidVisibility(n.visibility)) return null;
  const now = Date.now();
  return {
    id: n.id,
    type: n.type,
    label: anonymizeLabel(n.label, n.type),
    position: { x: x!, y: y!, z: z! },
    color: n.color,
    energy: n.energy,
    confidence: typeof n.confidence === 'number' ? Math.min(1, Math.max(0, n.confidence)) : undefined,
    peerId: n.peerId ? hashPeerId(String(n.peerId)) : undefined,
    clusterId: typeof n.clusterId === 'string' ? n.clusterId : undefined,
    createdAt: typeof n.createdAt === 'number' ? n.createdAt : now,
    updatedAt: typeof n.updatedAt === 'number' ? n.updatedAt : now,
    visibility: n.visibility!,
    metadata: sanitizeMetadata(n.metadata),
  };
}

export function validateEdge(edge: unknown, nodeIds: ReadonlySet<string>): KnowledgeEdge | null {
  if (!edge || typeof edge !== 'object') return null;
  const e = edge as Partial<KnowledgeEdge>;
  if (!e.id || !e.sourceId || !e.targetId || !e.type) return null;
  if (!nodeIds.has(e.sourceId) || !nodeIds.has(e.targetId)) return null;
  if (!isValidVisibility(e.visibility)) return null;
  const now = Date.now();
  return {
    id: e.id,
    sourceId: e.sourceId,
    targetId: e.targetId,
    type: e.type,
    weight: typeof e.weight === 'number' ? Math.min(10, Math.max(0, e.weight)) : 1,
    confidence: typeof e.confidence === 'number' ? Math.min(1, Math.max(0, e.confidence)) : undefined,
    peerId: e.peerId ? hashPeerId(String(e.peerId)) : undefined,
    visibility: e.visibility!,
    createdAt: typeof e.createdAt === 'number' ? e.createdAt : now,
    updatedAt: typeof e.updatedAt === 'number' ? e.updatedAt : now,
  };
}

/**
 * In-memory typed store — single source of truth for the knowledge graph layer.
 * Network data must pass through adapters before reaching this store.
 */
export class KnowledgeGraphStore {
  private readonly nodes = new Map<string, KnowledgeNode>();
  private readonly edges = new Map<string, KnowledgeEdge>();
  private readonly agents = new Map<string, VirtualAIAgent>();
  private syncMode: GraphSyncMode;
  private lastMutationAt = 0;
  private readonly listeners = new Set<() => void>();

  constructor(options: KnowledgeGraphStoreOptions = {}) {
    this.syncMode = options.syncMode ?? 'local';
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.lastMutationAt = Date.now();
    for (const l of this.listeners) l();
  }

  getSyncMode(): GraphSyncMode {
    return this.syncMode;
  }

  setSyncMode(mode: GraphSyncMode): void {
    this.syncMode = mode;
    this.notify();
  }

  getLastMutationAt(): number {
    return this.lastMutationAt;
  }

  upsertNode(node: KnowledgeNode): boolean {
    if (this.nodes.size >= GRAPH_SYNC_LIMITS.maxNodes && !this.nodes.has(node.id)) {
      return false;
    }
    if (node.visibility === 'private') {
      // Private nodes stay local — never overwrite with remote private data
      const existing = this.nodes.get(node.id);
      if (existing?.visibility === 'private' && node.peerId) return false;
    }
    this.nodes.set(node.id, { ...node, label: anonymizeLabel(node.label, node.type) });
    this.notify();
    return true;
  }

  removeNode(id: string): void {
    if (!this.nodes.delete(id)) return;
    for (const [eid, edge] of this.edges) {
      if (edge.sourceId === id || edge.targetId === id) this.edges.delete(eid);
    }
    for (const [aid, agent] of this.agents) {
      if (agent.nodeId === id) this.agents.delete(aid);
    }
    this.notify();
  }

  upsertEdge(edge: KnowledgeEdge): boolean {
    if (!this.nodes.has(edge.sourceId) || !this.nodes.has(edge.targetId)) return false;
    if (this.edges.size >= GRAPH_SYNC_LIMITS.maxEdges && !this.edges.has(edge.id)) {
      return false;
    }
    this.edges.set(edge.id, edge);
    this.notify();
    return true;
  }

  removeEdge(id: string): void {
    if (this.edges.delete(id)) this.notify();
  }

  upsertAgent(agent: VirtualAIAgent): void {
    this.agents.set(agent.id, agent);
    this.notify();
  }

  removeAgent(id: string): void {
    if (this.agents.delete(id)) this.notify();
  }

  getNode(id: string): KnowledgeNode | undefined {
    return this.nodes.get(id);
  }

  getEdge(id: string): KnowledgeEdge | undefined {
    return this.edges.get(id);
  }

  getAgent(id: string): VirtualAIAgent | undefined {
    return this.agents.get(id);
  }

  getAllNodes(): KnowledgeNode[] {
    return [...this.nodes.values()];
  }

  getAllEdges(): KnowledgeEdge[] {
    return [...this.edges.values()];
  }

  getAllAgents(): VirtualAIAgent[] {
    return [...this.agents.values()];
  }

  getPublicNodes(): KnowledgeNode[] {
    return this.getAllNodes().filter((n) => n.visibility !== 'private');
  }

  getPublicEdges(): KnowledgeEdge[] {
    return this.getAllEdges().filter((e) => e.visibility !== 'private');
  }

  expireStale(now = Date.now()): number {
    let removed = 0;
    for (const [id, node] of this.nodes) {
      if (node.type === 'event' && now - node.updatedAt > GRAPH_SYNC_LIMITS.nodeTtlMs) {
        this.removeNode(id);
        removed++;
      }
    }
    return removed;
  }

  clear(): void {
    this.nodes.clear();
    this.edges.clear();
    this.agents.clear();
    this.notify();
  }
}

export { hashPeerId };
