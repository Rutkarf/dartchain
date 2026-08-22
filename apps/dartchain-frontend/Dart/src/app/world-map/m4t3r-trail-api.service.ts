import { Injectable, inject } from '@angular/core';
import { catchError, of, type Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import type { TrailCollectResult } from './token-cell.service';
import type { M4T3RReward } from './m4t3r-reward.types';

export interface M4t3rTrailPickupAccepted {
  type: 'M4T3R_TRAIL_PICKUP_ACCEPTED';
  playerId: string;
  collectedCells: string[];
  amount: number;
  respawnAt: number;
  balanceAfter: string;
  playerSpeed: string;
  maxAllowedSpeed: string;
  settlementMode: string;
  rewards: M4T3RReward[];
}

export interface M4t3rHiddenCell {
  cellId: string;
  respawnAt: number;
}

/**
 * Validation serveur de la traînée + récompenses signées (aucun crédit côté client).
 */
@Injectable({ providedIn: 'root' })
export class M4t3rTrailApiService {
  private readonly http = inject(HttpClient, { optional: true });

  submitTrail(playerId: string, trail: TrailCollectResult): Observable<M4t3rTrailPickupAccepted | null> {
    if (!this.http) return of(null);
    return this.http
      .post<M4t3rTrailPickupAccepted>(`${environment.apiUrl}/m4t3r/trail-pickup`, {
        type: trail.type,
        playerId,
        previousPosition: trail.previousPosition,
        currentPosition: trail.currentPosition,
        candidateCellIds: trail.candidateCellIds,
        timestamp: trail.timestamp,
        clientSpeedEstimate: this.estimateSpeed(trail),
        nonce: `${playerId}:${trail.timestamp}`,
      })
      .pipe(catchError(() => of(null)));
  }

  listHidden(): Observable<{ type: string; cells: M4t3rHiddenCell[] }> {
    if (!this.http) return of({ type: 'M4T3R_TRAIL_CELLS_COLLECTED', cells: [] });
    return this.http
      .get<{ type: string; cells: M4t3rHiddenCell[] }>(`${environment.apiUrl}/m4t3r/trail-cells`)
      .pipe(catchError(() => of({ type: 'M4T3R_TRAIL_CELLS_COLLECTED', cells: [] })));
  }

  private estimateSpeed(trail: TrailCollectResult): string {
    const dx = trail.currentPosition.x - trail.previousPosition.x;
    const dz = trail.currentPosition.z - trail.previousPosition.z;
    const dist = Math.hypot(dx, dz);
    const dt = Math.max(0.016, (Date.now() - trail.timestamp) / 1000);
    return (dist / dt).toFixed(3);
  }
}
