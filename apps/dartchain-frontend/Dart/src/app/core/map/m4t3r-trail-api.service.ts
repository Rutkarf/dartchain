import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, of, type Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import type { TrailCollectResult } from './token-cell.service';

export interface M4t3rTrailPickupAccepted {
  type: 'M4T3R_TRAIL_PICKUP_ACCEPTED';
  playerId: string;
  collectedCells: string[];
  amount: number;
  totalBalance: number;
  respawnAt: number;
}

export interface M4t3rHiddenCell {
  cellId: string;
  respawnAt: number;
}

/**
 * Validation serveur de la traînée. Aucun crédit wallet n’est appliqué ici.
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
      })
      .pipe(catchError(() => of(null)));
  }

  listHidden(): Observable<{ type: string; cells: M4t3rHiddenCell[] }> {
    if (!this.http) return of({ type: 'M4T3R_TRAIL_CELLS_COLLECTED', cells: [] });
    return this.http
      .get<{ type: string; cells: M4t3rHiddenCell[] }>(`${environment.apiUrl}/m4t3r/trail-cells`)
      .pipe(catchError(() => of({ type: 'M4T3R_TRAIL_CELLS_COLLECTED', cells: [] })));
  }
}
