import { STAR_CONQUEST_MOCK_QUESTS } from '@star-conquest/star-conquest.mock';
import { GraphSyncValidator } from './knowledge-graph-sync';
import { KnowledgeGraphStore, validateEdge, validateNode } from './knowledge-graph.store';
import { PeerKnowledgeGraphAdapter } from './peer-knowledge-graph.adapter';
import { VirtualAIAgentRegistry } from './virtual-ai-agent.registry';

describe('KnowledgeGraphStore', () => {
  it('upserts and retrieves public nodes', () => {
    const store = new KnowledgeGraphStore();
    const now = Date.now();
    const ok = store.upsertNode({
      id: 'system:local-node',
      type: 'system',
      label: 'Local',
      position: { x: 0, y: 0, z: 0 },
      color: '#3ecfdc',
      energy: 1,
      createdAt: now,
      updatedAt: now,
      visibility: 'public',
    });
    expect(ok).toBe(true);
    expect(store.getNode('system:local-node')?.type).toBe('system');
  });

  it('rejects invalid nodes', () => {
    expect(validateNode(null)).toBeNull();
    expect(validateNode({ id: 'x', type: 'bad' })).toBeNull();
  });

  it('filters sensitive metadata', () => {
    const node = validateNode({
      id: 'n1',
      type: 'peer',
      position: { x: 0, y: 0, z: 0 },
      color: '#ffffff',
      energy: 1,
      visibility: 'public',
      metadata: { password: 'secret', safe: 'ok' },
    });
    expect(node?.metadata?.['password']).toBeUndefined();
    expect(node?.metadata?.['safe']).toBe('ok');
  });

  it('removes edges when node is removed', () => {
    const store = new KnowledgeGraphStore();
    const now = Date.now();
    store.upsertNode({
      id: 'a',
      type: 'peer',
      position: { x: 0, y: 0, z: 0 },
      color: '#fff',
      energy: 1,
      createdAt: now,
      updatedAt: now,
      visibility: 'public',
    });
    store.upsertNode({
      id: 'b',
      type: 'peer',
      position: { x: 1, y: 0, z: 0 },
      color: '#fff',
      energy: 1,
      createdAt: now,
      updatedAt: now,
      visibility: 'public',
    });
    store.upsertEdge({
      id: 'e1',
      sourceId: 'a',
      targetId: 'b',
      type: 'connected-to',
      weight: 1,
      visibility: 'public',
      createdAt: now,
      updatedAt: now,
    });
    expect(store.getAllEdges().length).toBe(1);
    store.removeNode('a');
    expect(store.getAllEdges().length).toBe(0);
  });
});

describe('GraphSyncValidator', () => {
  it('accepts valid messages and deduplicates', () => {
    const v = new GraphSyncValidator();
    const msg = {
      version: 1 as const,
      type: 'NODE_UPSERT' as const,
      senderPeerId: 'p1',
      timestamp: Date.now(),
      payload: {},
      correlationId: 'c1',
    };
    expect(v.validate(msg).ok).toBe(true);
    expect(v.validate(msg).ok).toBe(false);
    expect(v.messagesDeduplicated).toBe(1);
  });

  it('rejects bad version and oversized payload', () => {
    const v = new GraphSyncValidator();
    expect(v.validate({ version: 2, type: 'NODE_UPSERT' }).ok).toBe(false);
    const big = { version: 1, type: 'GRAPH_SNAPSHOT', senderPeerId: 'p', timestamp: Date.now(), payload: 'x'.repeat(70000) };
    expect(v.validate(big).ok).toBe(false);
  });
});

describe('PeerKnowledgeGraphAdapter', () => {
  it('maps quests and peers into the store', () => {
    const store = new KnowledgeGraphStore();
    const adapter = new PeerKnowledgeGraphAdapter(store);
    adapter.syncQuestCatalog(STAR_CONQUEST_MOCK_QUESTS.slice(0, 3));
    expect(store.getAllNodes().some((n) => n.type === 'quest')).toBe(true);

    adapter.syncPeers([
      {
        url: 'ws://node-b:8080/ws/peers',
        status: 'CONNECTED',
        message: '',
        latencyMs: 42,
        syncPercent: 100,
      },
    ]);
    expect(store.getAllNodes().some((n) => n.type === 'peer')).toBe(true);
    expect(store.getAllEdges().some((e) => e.type === 'synced-with')).toBe(true);
    expect(adapter.getPeerStates()[0].status).toBe('connected');
  });

  it('marks removed peers offline', () => {
    const store = new KnowledgeGraphStore();
    const adapter = new PeerKnowledgeGraphAdapter(store);
    adapter.syncPeers([
      { url: 'ws://a/ws/peers', status: 'CONNECTED', message: '', latencyMs: 10 },
    ]);
    adapter.syncPeers([]);
    const states = adapter.getPeerStates();
    expect(states.some((s) => s.status === 'offline')).toBe(true);
  });
});

describe('VirtualAIAgentRegistry', () => {
  it('bootstraps mock agents per quest family', () => {
    const store = new KnowledgeGraphStore();
    const registry = new VirtualAIAgentRegistry(store);
    registry.bootstrapFromQuests(STAR_CONQUEST_MOCK_QUESTS);
    expect(store.getAllAgents().length).toBeGreaterThan(0);
    expect(store.getAllAgents().every((a) => a.capabilities.includes('local-sim'))).toBe(true);
  });
});

describe('validateEdge', () => {
  it('requires both endpoints in node set', () => {
    const ids = new Set(['a', 'b']);
    const now = Date.now();
    expect(
      validateEdge(
        { id: 'e', sourceId: 'a', targetId: 'b', type: 'related-to', weight: 1, visibility: 'public', createdAt: now, updatedAt: now },
        ids
      )
    ).not.toBeNull();
    expect(
      validateEdge(
        { id: 'e', sourceId: 'a', targetId: 'missing', type: 'related-to', weight: 1, visibility: 'public', createdAt: now, updatedAt: now },
        ids
      )
    ).toBeNull();
  });
});
