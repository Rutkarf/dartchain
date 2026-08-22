import { KNOWLEDGE_GRAPH_COLORS } from './knowledge-graph.config';
import { KnowledgeGraphStore } from './knowledge-graph.store';
import type { VirtualAIAgent } from './knowledge-graph.types';
import type { StarQuest } from '@star-conquest/star-conquest.model';

const AGENT_ROLES = [
  'navigation-assistant',
  'quest-analyst',
  'building-scout',
  'sync-monitor',
  'mesh-coordinator',
] as const;

const AGENT_STATES: VirtualAIAgent['state'][] = [
  'idle',
  'thinking',
  'synced',
  'communicating',
];

function pickRole(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h + seed.charCodeAt(i)) | 0;
  return AGENT_ROLES[Math.abs(h) % AGENT_ROLES.length];
}

/**
 * Simulated virtual AI agents — explicitly marked as local/mock when no backend IA exists.
 */
export class VirtualAIAgentRegistry {
  private tickTimer = 0;

  constructor(private readonly store: KnowledgeGraphStore) {}

  /** Spawn one agent per quest family cluster (mock, local-only). */
  bootstrapFromQuests(quests: readonly StarQuest[]): void {
    const now = Date.now();
    const families = new Map<string, StarQuest[]>();
    for (const q of quests) {
      const list = families.get(q.family) ?? [];
      list.push(q);
      families.set(q.family, list);
    }

    for (const [family, group] of families) {
      const anchor = group[0];
      const agentId = `agent:mock:${family}`;
      const nodeId = `ai-agent:${family}`;
      const cx =
        group.reduce((s, q) => s + q.position.x, 0) / Math.max(group.length, 1);
      const cy =
        group.reduce((s, q) => s + q.position.y, 0) / Math.max(group.length, 1);

      this.store.upsertNode({
        id: nodeId,
        type: 'ai-agent',
        label: `Agent ${family}`,
        position: { x: cx + 6, y: cy + 4, z: 4 },
        color: KNOWLEDGE_GRAPH_COLORS.aiAgentActive,
        energy: 1.1,
        clusterId: `cluster:${family}`,
        createdAt: now,
        updatedAt: now,
        visibility: 'local',
        metadata: { mock: true, simulated: true, family },
      });

      for (const q of group.slice(0, 3)) {
        this.store.upsertEdge({
          id: `observed-by:${agentId}:${q.id}`,
          sourceId: nodeId,
          targetId: `quest:${q.id}`,
          type: 'observed-by',
          weight: 0.8,
          visibility: 'local',
          createdAt: now,
          updatedAt: now,
        });
      }

      const agent: VirtualAIAgent = {
        id: agentId,
        nodeId,
        displayName: `Agent-${family.slice(0, 4).toUpperCase()}`,
        role: pickRole(family),
        state: 'idle',
        capabilities: ['local-sim', 'quest-hints'],
        activityLevel: 0.35,
        lastActivityAt: now,
      };
      this.store.upsertAgent(agent);
    }
  }

  tick(deltaMs: number, peerConnected: boolean): void {
    this.tickTimer += deltaMs;
    if (this.tickTimer < 2200) return;
    this.tickTimer = 0;
    const now = Date.now();
    for (const agent of this.store.getAllAgents()) {
      const nextState = peerConnected
        ? AGENT_STATES[Math.floor(Math.random() * AGENT_STATES.length)]
        : agent.state === 'offline'
          ? 'offline'
          : 'idle';
      const activity = Math.min(
        1,
        Math.max(0.1, agent.activityLevel + (Math.random() - 0.5) * 0.15)
      );
      this.store.upsertAgent({
        ...agent,
        state: nextState,
        activityLevel: activity,
        lastActivityAt: now,
      });
      const node = this.store.getNode(agent.nodeId);
      if (node) {
        this.store.upsertNode({
          ...node,
          energy: 0.8 + activity * 0.8,
          updatedAt: now,
          metadata: { ...node.metadata, agentState: nextState, mock: true },
        });
      }
    }
  }
}
