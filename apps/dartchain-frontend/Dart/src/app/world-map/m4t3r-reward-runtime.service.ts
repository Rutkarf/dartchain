import { Injectable, inject, signal } from '@angular/core';

import { M4t3rRewardApiService } from './m4t3r-reward-api.service';
import type { M4t3rTrailPickupAccepted } from './m4t3r-trail-api.service';
import { FaucetRuntimeService } from '@faucet/services/faucet-runtime.service';
import type { M4T3RReward, M4T3RRewardHistoryItem } from './m4t3r-reward.types';

export type M4t3rRewardEventType =
  | 'M4T3R_REWARD_VALIDATED'
  | 'M4T3R_REWARD_CREDITED'
  | 'M4T3R_REWARD_QUEUED'
  | 'M4T3R_REWARD_CONFIRMED'
  | 'M4T3R_REWARD_REJECTED'
  | 'M4T3R_BALANCE_UPDATED';

export interface M4t3rRewardDebugInfo {
  rewardId: string;
  tokenId: string;
  collectionId: string;
  clientSpeedEstimate?: string;
  serverMeasuredSpeed: string;
  maxAllowedSpeed: string;
  proofHash: string;
  signatureValid: boolean | null;
  rewardStatus: string;
  balanceAfter: string | null;
  transactionId?: string;
  chainId?: string;
}

@Injectable({ providedIn: 'root' })
export class M4t3rRewardRuntimeService {
  private readonly api = inject(M4t3rRewardApiService);
  private readonly faucet = inject(FaucetRuntimeService);

  readonly lastReward = signal<M4T3RReward | null>(null);
  readonly lastPlayerSpeed = signal('0');
  readonly lastBalanceAfter = signal<string | null>(null);
  readonly history = signal<M4T3RRewardHistoryItem[]>([]);
  readonly historyTotal = signal(0);
  readonly historyLoading = signal(false);
  readonly lastEvent = signal<M4t3rRewardEventType | null>(null);
  readonly debugInfo = signal<M4t3rRewardDebugInfo | null>(null);
  readonly verifyResult = signal<{ rewardId: string; valid: boolean } | null>(null);

  onTrailAccepted(
    accepted: M4t3rTrailPickupAccepted,
    clientSpeedEstimate?: string
  ): void {
    if (accepted.collectedCells.length === 0) {
      return;
    }

    if (accepted.rewards?.length) {
      for (const reward of accepted.rewards) {
        this.faucet.creditM4t3rAmount(reward.amount);
      }
    } else {
      this.faucet.creditM4t3rCollectCount(accepted.amount);
    }

    if (accepted.rewards?.length) {
      this.pushFromPickup(
        accepted.rewards,
        accepted.balanceAfter,
        clientSpeedEstimate
      );
    }
  }

  pushFromPickup(
    rewards: M4T3RReward[],
    balanceAfter: string,
    clientSpeedEstimate?: string
  ): void {
    if (rewards.length === 0) return;
    const latest = rewards[rewards.length - 1];
    this.lastReward.set(latest);
    this.lastPlayerSpeed.set(latest.playerSpeed);
    this.lastBalanceAfter.set(balanceAfter);
    this.lastEvent.set(this.mapStatusToEvent(latest.status));

    this.debugInfo.set({
      rewardId: latest.rewardId,
      tokenId: latest.tokenId,
      collectionId: latest.collectionId,
      clientSpeedEstimate,
      serverMeasuredSpeed: latest.playerSpeed,
      maxAllowedSpeed: latest.maxAllowedSpeed,
      proofHash: latest.proofHash,
      signatureValid: null,
      rewardStatus: latest.status,
      balanceAfter,
      transactionId: latest.transactionId,
    });

    this.prependHistoryFromReward(latest);
  }

  loadHistory(limit = 10, offset = 0): void {
    this.historyLoading.set(true);
    this.api.fetchHistory(limit, offset).subscribe({
      next: (response) => {
        this.history.set(response.rewards);
        this.historyTotal.set(response.total);
        this.historyLoading.set(false);
      },
      error: () => this.historyLoading.set(false),
    });
  }

  verifyLastReward(): void {
    const reward = this.lastReward();
    if (!reward) return;
    this.api.verifyReward(reward.rewardId).subscribe((result) => {
      if (!result) return;
      this.verifyResult.set({ rewardId: result.rewardId, valid: result.valid });
      this.debugInfo.update((info) =>
        info ? { ...info, signatureValid: result.valid } : info
      );
    });
  }

  maskProof(hash: string): string {
    if (!hash || hash.length < 12) return hash ?? '—';
    return `${hash.slice(0, 8)}…${hash.slice(-4)}`;
  }

  maskTokenZone(tokenId: string): string {
    const parts = tokenId.split(':');
    if (parts.length >= 5 && parts[2] === 'chunk') {
      return parts.slice(0, 5).join(':');
    }
    if (parts.length >= 3) {
      return parts.slice(0, 3).join(':');
    }
    return tokenId;
  }

  formatCollectedAt(ts: number | string): string {
    const ms = typeof ts === 'number' ? ts : Date.parse(ts);
    if (Number.isNaN(ms)) return '—';
    return new Date(ms).toLocaleString();
  }

  private mapStatusToEvent(status: string): M4t3rRewardEventType {
    switch (status) {
      case 'CREDITED_OFFCHAIN':
      case 'CREDITED_FAUCET_PENDING':
        return 'M4T3R_REWARD_CREDITED';
      case 'QUEUED_ONCHAIN':
        return 'M4T3R_REWARD_QUEUED';
      case 'CONFIRMED_ONCHAIN':
      case 'SUBMITTED_ONCHAIN':
        return 'M4T3R_REWARD_CONFIRMED';
      case 'REJECTED':
      case 'REVOKED':
        return 'M4T3R_REWARD_REJECTED';
      default:
        return 'M4T3R_REWARD_VALIDATED';
    }
  }

  private prependHistoryFromReward(reward: M4T3RReward): void {
    const item: M4T3RRewardHistoryItem = {
      rewardId: reward.rewardId,
      tokenId: reward.tokenId,
      amount: reward.amount,
      playerSpeed: reward.playerSpeed,
      status: reward.status,
      proofHash: reward.proofHash,
      transactionId: reward.transactionId,
      collectedAt: String(reward.collectedAt),
    };
    this.history.update((items) =>
      [item, ...items.filter((i) => i.rewardId !== item.rewardId)].slice(0, 20)
    );
    this.historyTotal.update((n) => Math.max(n, this.history().length));
  }
}
