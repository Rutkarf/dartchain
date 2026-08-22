import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import {
  shouldYieldOsmMeshBatch,
  yieldOsmMeshBatch,
  yieldToIdleBatch,
} from './idle-batch.util';

describe('idle-batch Phase 20', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('shouldYieldOsmMeshBatch respecte batchSize', () => {
    expect(
      shouldYieldOsmMeshBatch(71, { batchSize: 72, batchDelayMs: 6, useIdle: true })
    ).toBe(true);
    expect(
      shouldYieldOsmMeshBatch(70, { batchSize: 72, batchDelayMs: 6, useIdle: true })
    ).toBe(false);
  });

  it('yieldToIdleBatch utilise requestIdleCallback si disponible', async () => {
    const idle = vi.fn((cb: IdleRequestCallback) => {
      cb({ didTimeout: false, timeRemaining: () => 8 } as IdleDeadline);
      return 1;
    });
    vi.stubGlobal('window', { requestIdleCallback: idle });

    const promise = yieldToIdleBatch({ fallbackDelayMs: 6 });
    await promise;
    expect(idle).toHaveBeenCalled();
  });

  it('yieldOsmMeshBatch fallback timer si idle désactivé', async () => {
    const promise = yieldOsmMeshBatch({
      batchSize: 8,
      batchDelayMs: 6,
      useIdle: false,
    });
    vi.advanceTimersByTime(6);
    await promise;
  });
});
