import { describe, expect, it, beforeEach } from 'vitest';

import { ArenaEconomyMockService } from './arena-economy.mock.service';

describe('ArenaEconomyMockService (Q1=C)', () => {
  let economy: ArenaEconomyMockService;

  beforeEach(() => {
    economy = new ArenaEconomyMockService();
  });

  it('seed depuis pending mirror sans exposer de wallet', () => {
    const state = economy.seedFromPendingMirror('u1', 'Alice', 42);
    expect(state.faucetBalance).toBe(42);
    expect(state.pendingDisplayMirror).toBe(42);
    expect(state.protectedBalance).toBe(0);
    expect((state as { walletBalance?: number }).walletBalance).toBeUndefined();
  });

  it('transfert ledger isolé + refuse les doublons eventId', () => {
    economy.seedFromPendingMirror('killer', 'K', 10);
    economy.seedFromPendingMirror('victim', 'V', 100);

    const first = economy.applyElimination({
      eventId: 'e1',
      killerUserId: 'killer',
      victimUserId: 'victim',
    });
    const second = economy.applyElimination({
      eventId: 'e1',
      killerUserId: 'killer',
      victimUserId: 'victim',
    });

    expect(first.accepted).toBe(true);
    expect(first.lootAmount).toBe(18);
    expect(second.accepted).toBe(false);
    expect(second.reason).toBe('DUPLICATE_EVENT');
    expect(economy.getState('killer')?.faucetBalance).toBe(28);
    expect(economy.getState('victim')?.faucetBalance).toBe(82);
  });
});
