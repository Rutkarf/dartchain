export interface IdleBatchYieldOptions {
  /** Délai fallback si requestIdleCallback indisponible. */
  fallbackDelayMs?: number;
  /** Timeout idle max avant exécution forcée. */
  idleTimeoutMs?: number;
}

/**
 * Phase 20 — cède le main thread entre paquets OSM (pref idle, fallback timer).
 */
export function yieldToIdleBatch(options: IdleBatchYieldOptions = {}): Promise<void> {
  const fallbackDelayMs = options.fallbackDelayMs ?? 0;
  const idleTimeoutMs = options.idleTimeoutMs ?? Math.max(32, fallbackDelayMs + 24);

  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      window.requestIdleCallback(() => resolve(), { timeout: idleTimeoutMs });
      return;
    }
    setTimeout(resolve, fallbackDelayMs);
  });
}

export interface OsmMeshBatchOptions {
  batchSize: number;
  batchDelayMs: number;
  useIdle?: boolean;
}

/** Vrai si un yield est nécessaire après l’index `i` (0-based). */
export function shouldYieldOsmMeshBatch(i: number, options: OsmMeshBatchOptions): boolean {
  if (options.batchSize <= 0) return false;
  if ((i + 1) % options.batchSize !== 0) return false;
  return options.useIdle !== false || options.batchDelayMs > 0;
}

export async function yieldOsmMeshBatch(options: OsmMeshBatchOptions): Promise<void> {
  if (options.useIdle === false) {
    if (options.batchDelayMs > 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, options.batchDelayMs));
    }
    return;
  }
  await yieldToIdleBatch({
    fallbackDelayMs: options.batchDelayMs,
    idleTimeoutMs: Math.max(32, options.batchDelayMs + 24),
  });
}
