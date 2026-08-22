import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, of, type Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import type { M4T3RRewardHistoryItem } from './m4t3r-reward.types';

export interface M4t3rRewardVerifyResult {
  rewardId: string;
  proofHash: string;
  serverSignature: string;
  valid: boolean;
  algorithm: string;
  keyId: string;
}

@Injectable({ providedIn: 'root' })
export class M4t3rRewardApiService {
  private readonly http = inject(HttpClient, { optional: true });

  fetchHistory(limit = 10, offset = 0): Observable<{
    walletAddress: string;
    total: number;
    rewards: M4T3RRewardHistoryItem[];
  }> {
    if (!this.http) {
      return of({ walletAddress: '', total: 0, rewards: [] });
    }
    return this.http
      .get<{ walletAddress: string; total: number; rewards: M4T3RRewardHistoryItem[] }>(
        `${environment.apiUrl}/m4t3r/rewards/history`,
        { params: { limit: String(limit), offset: String(offset) } }
      )
      .pipe(catchError(() => of({ walletAddress: '', total: 0, rewards: [] })));
  }

  verifyReward(rewardId: string): Observable<M4t3rRewardVerifyResult | null> {
    if (!this.http) return of(null);
    return this.http
      .get<M4t3rRewardVerifyResult>(`${environment.apiUrl}/m4t3r/rewards/${rewardId}/verify`)
      .pipe(catchError(() => of(null)));
  }
}
