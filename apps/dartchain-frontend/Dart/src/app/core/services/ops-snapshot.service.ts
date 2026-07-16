import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { OpsSnapshot } from '../models/ops-snapshot.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class OpsSnapshotService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  async fetchSnapshot(): Promise<OpsSnapshot> {
    return firstValueFrom(
      this.http.get<OpsSnapshot>(`${environment.apiUrl}/v1/ops/snapshot`, {
        headers: this.auth.authHeaders(),
      })
    );
  }
}
