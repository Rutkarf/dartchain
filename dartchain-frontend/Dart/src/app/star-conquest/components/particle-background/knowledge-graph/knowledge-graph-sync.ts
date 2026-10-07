import { GRAPH_SYNC_LIMITS } from './knowledge-graph.config';
import type { GraphSyncMessage } from './knowledge-graph.types';

export interface GraphSyncValidationResult {
  ok: boolean;
  reason?: string;
  message?: GraphSyncMessage;
}

export class GraphSyncValidator {
  private readonly seen = new Map<string, number>();
  messagesReceived = 0;
  messagesRejected = 0;
  messagesDeduplicated = 0;

  validate(raw: unknown): GraphSyncValidationResult {
    this.messagesReceived++;
    if (typeof raw !== 'object' || raw === null) {
      this.messagesRejected++;
      return { ok: false, reason: 'invalid-envelope' };
    }
    const json = JSON.stringify(raw);
    if (json.length > GRAPH_SYNC_LIMITS.maxMessageBytes) {
      this.messagesRejected++;
      return { ok: false, reason: 'oversized' };
    }
    const msg = raw as Partial<GraphSyncMessage>;
    if (msg.version !== 1) {
      this.messagesRejected++;
      return { ok: false, reason: 'bad-version' };
    }
    const validTypes = [
      'NODE_UPSERT',
      'NODE_REMOVE',
      'EDGE_UPSERT',
      'EDGE_REMOVE',
      'PEER_STATUS',
      'AGENT_STATE',
      'GRAPH_SNAPSHOT',
    ] as const;
    if (!msg.type || !validTypes.includes(msg.type as (typeof validTypes)[number])) {
      this.messagesRejected++;
      return { ok: false, reason: 'bad-type' };
    }
    if (!msg.senderPeerId || typeof msg.senderPeerId !== 'string') {
      this.messagesRejected++;
      return { ok: false, reason: 'missing-sender' };
    }
    if (typeof msg.timestamp !== 'number' || !Number.isFinite(msg.timestamp)) {
      this.messagesRejected++;
      return { ok: false, reason: 'bad-timestamp' };
    }
    const age = Date.now() - msg.timestamp;
    if (age > GRAPH_SYNC_LIMITS.nodeTtlMs || age < -60_000) {
      this.messagesRejected++;
      return { ok: false, reason: 'stale-or-future' };
    }
    const dedupKey = `${msg.senderPeerId}:${msg.type}:${msg.correlationId ?? msg.timestamp}`;
    const prev = this.seen.get(dedupKey);
    if (prev !== undefined && Date.now() - prev < GRAPH_SYNC_LIMITS.dedupWindowMs) {
      this.messagesDeduplicated++;
      return { ok: false, reason: 'duplicate' };
    }
    this.seen.set(dedupKey, Date.now());
    return { ok: true, message: msg as GraphSyncMessage };
  }

  pruneDedup(now = Date.now()): void {
    for (const [key, ts] of this.seen) {
      if (now - ts > GRAPH_SYNC_LIMITS.dedupWindowMs) this.seen.delete(key);
    }
  }
}
