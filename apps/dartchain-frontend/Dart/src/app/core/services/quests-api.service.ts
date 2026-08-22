import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { QuestPersistedState } from '@quests/quests-panel/quests-panel.model';
import { QuestCatalogResponse } from '@quests/quests-panel/quests-catalog.model';

const AUTH_TOKEN_KEY = 'dartchain_auth_token';

@Injectable({ providedIn: 'root' })
export class QuestsApiService {
  private readonly http = inject(HttpClient);

  getState(): Observable<QuestPersistedState> {
    return this.http.get<QuestPersistedState>(`${environment.apiUrl}/quests/state`, {
      headers: this.buildAuthHeaders(),
    });
  }

  getCatalog(): Observable<QuestCatalogResponse> {
    return this.http.get<QuestCatalogResponse>(`${environment.apiUrl}/quests/catalog`);
  }

  exploreBlock(blockIndex: number): Observable<QuestPersistedState> {
    return this.http.post<QuestPersistedState>(
      `${environment.apiUrl}/quests/explore-block`,
      { blockIndex },
      { headers: this.buildAuthHeaders() }
    );
  }

  recordProgress(taskId: string, increment = 1): Observable<QuestPersistedState> {
    return this.http.post<QuestPersistedState>(
      `${environment.apiUrl}/quests/progress`,
      { taskId, increment },
      { headers: this.buildAuthHeaders() }
    );
  }

  claimTask(taskId: string): Observable<QuestPersistedState> {
    return this.http.post<QuestPersistedState>(
      `${environment.apiUrl}/quests/tasks/${encodeURIComponent(taskId)}/claim`,
      null,
      { headers: this.buildAuthHeaders() }
    );
  }

  claimMission(): Observable<QuestPersistedState> {
    return this.http.post<QuestPersistedState>(
      `${environment.apiUrl}/quests/mission/claim`,
      null,
      { headers: this.buildAuthHeaders() }
    );
  }

  claimWeekly(): Observable<QuestPersistedState> {
    return this.http.post<QuestPersistedState>(
      `${environment.apiUrl}/quests/weekly/claim`,
      null,
      { headers: this.buildAuthHeaders() }
    );
  }

  private buildAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      return new HttpHeaders();
    }

    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }
}
