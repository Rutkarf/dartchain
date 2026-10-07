import { NgZone } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { M4t3rRewardRuntimeService } from '@world-map/m4t3r-reward-runtime.service';
import type { M4t3rTrailPickupAccepted } from '@world-map/m4t3r-trail-api.service';
import { FloorRewardBridge } from './floor-reward.bridge';
import { FloorSessionAdapter } from './floor-session.adapter';

describe('FloorRewardBridge', () => {
  let bridge: FloorRewardBridge;
  let onTrailAccepted: ReturnType<typeof vi.fn>;
  let notifyBalanceRefresh: ReturnType<typeof vi.fn>;

  const accepted: M4t3rTrailPickupAccepted = {
    type: 'M4T3R_TRAIL_PICKUP_ACCEPTED',
    playerId: 'player-1',
    collectedCells: ['m4t3r-cluster:1:1'],
    amount: 1,
    respawnAt: Date.now() + 30_000,
    balanceAfter: '42',
    playerSpeed: '1.420',
    maxAllowedSpeed: '5.000',
    settlementMode: 'OFFCHAIN',
    rewards: [],
  };

  beforeEach(() => {
    onTrailAccepted = vi.fn();
    notifyBalanceRefresh = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        FloorRewardBridge,
        { provide: NgZone, useValue: { run: (fn: () => void) => fn() } },
        {
          provide: M4t3rRewardRuntimeService,
          useValue: { onTrailAccepted },
        },
        {
          provide: FloorSessionAdapter,
          useValue: { notifyBalanceRefresh },
        },
      ],
    });
    bridge = TestBed.inject(FloorRewardBridge);
  });

  it('crédite le faucet via onTrailAccepted même sans rewards signés', () => {
    bridge.handleAcceptedTrail(accepted, '1.000');
    expect(onTrailAccepted).toHaveBeenCalledWith(accepted, '1.000');
    expect(notifyBalanceRefresh).not.toHaveBeenCalled();
  });

  it('rafraîchit le wallet seulement s’il y a des rewards', () => {
    const withRewards: M4t3rTrailPickupAccepted = {
      ...accepted,
      rewards: [
        {
          rewardId: 'reward-1',
          collectionId: 'c1',
          tokenId: 't1',
          amount: '0.00000000000000000000000001',
          playerSpeed: '1.4',
          maxAllowedSpeed: '5',
          status: 'CREDITED_OFFCHAIN',
          proofHash: '0xab',
          serverSignature: '0xsig',
          collectedAt: Date.now(),
        },
      ],
    };
    bridge.handleAcceptedTrail(withRewards, '1.400');
    expect(onTrailAccepted).toHaveBeenCalledWith(withRewards, '1.400');
    expect(notifyBalanceRefresh).toHaveBeenCalledTimes(1);
  });
});
