import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { FaucetRuntimeService } from '@faucet/services/faucet-runtime.service';
import { M4t3rRewardApiService } from './m4t3r-reward-api.service';
import { M4t3rRewardRuntimeService } from './m4t3r-reward-runtime.service';
import type { M4t3rTrailPickupAccepted } from './m4t3r-trail-api.service';
import type { M4T3RReward } from './m4t3r-reward.types';

describe('M4t3rRewardRuntimeService', () => {
  let service: M4t3rRewardRuntimeService;
  let faucetCreditCount: ReturnType<typeof vi.fn>;
  let faucetCreditAmount: ReturnType<typeof vi.fn>;
  let faucetSetClaimable: ReturnType<typeof vi.fn>;

  const sampleReward: M4T3RReward = {
    rewardId: 'reward-1',
    collectionId: 'user:token:0',
    tokenId: 'm4t3r:metaverse:chunk:0:0:10:20:cycle-1',
    amount: '0.00000000000000000000000001',
    playerSpeed: '1.420',
    maxAllowedSpeed: '32.000',
    status: 'CREDITED_OFFCHAIN',
    proofHash: '0xabcdef1234567890',
    serverSignature: '0xsig',
    collectedAt: Date.now(),
  };

  const trailAccepted: M4t3rTrailPickupAccepted = {
    type: 'M4T3R_TRAIL_PICKUP_ACCEPTED',
    playerId: 'player-1',
    collectedCells: ['m4t3r-cluster:1:1'],
    amount: 1,
    respawnAt: Date.now() + 30_000,
    balanceAfter: '0.00000000000000000000000001',
    playerSpeed: '1.420',
    maxAllowedSpeed: '32.000',
    settlementMode: 'OFFCHAIN',
    rewards: [],
  };

  beforeEach(() => {
    faucetCreditCount = vi.fn();
    faucetCreditAmount = vi.fn();
    faucetSetClaimable = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        M4t3rRewardRuntimeService,
        {
          provide: M4t3rRewardApiService,
          useValue: {
            fetchHistory: () => of({ walletAddress: 'R4V3x', total: 0, rewards: [] }),
            verifyReward: () =>
              of({
                rewardId: 'reward-1',
                proofHash: sampleReward.proofHash,
                serverSignature: sampleReward.serverSignature,
                valid: true,
                algorithm: 'HmacSHA256',
                keyId: 'dev',
              }),
          },
        },
        {
          provide: FaucetRuntimeService,
          useValue: {
            creditM4t3rCollectCount: faucetCreditCount,
            creditM4t3rAmount: faucetCreditAmount,
            setClaimableFromAmount: faucetSetClaimable,
          },
        },
      ],
    });
    service = TestBed.inject(M4t3rRewardRuntimeService);
  });

  it('crédite additivement le faucet même avec balanceAfter serveur (pas de sync absolu)', () => {
    service.onTrailAccepted(trailAccepted);
    expect(faucetCreditCount).toHaveBeenCalledWith(1);
    expect(faucetSetClaimable).not.toHaveBeenCalled();
    expect(service.lastReward()).toBeNull();
  });

  it('crédite localement si balanceAfter est 0 (invité / pas de compte)', () => {
    service.onTrailAccepted({
      ...trailAccepted,
      balanceAfter: '0',
      amount: 3,
      rewards: [],
    });
    expect(faucetSetClaimable).not.toHaveBeenCalled();
    expect(faucetCreditCount).toHaveBeenCalledWith(3);
  });

  it('crédite par montant reward signé (additif) et met à jour les métadonnées', () => {
    service.onTrailAccepted({ ...trailAccepted, rewards: [sampleReward] });
    expect(faucetCreditAmount).toHaveBeenCalledWith(sampleReward.amount);
    expect(faucetSetClaimable).not.toHaveBeenCalled();
    expect(faucetCreditCount).not.toHaveBeenCalled();
    expect(service.lastReward()?.rewardId).toBe('reward-1');
    expect(service.lastEvent()).toBe('M4T3R_REWARD_CREDITED');
  });

  it('masks proof and token zone for display', () => {
    expect(service.maskProof('0xabcdef1234567890')).toContain('…');
    expect(service.maskTokenZone(sampleReward.tokenId)).toBe('m4t3r:metaverse:chunk:0:0');
  });
});
