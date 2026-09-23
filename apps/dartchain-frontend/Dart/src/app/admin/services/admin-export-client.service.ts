import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AdminSeedSessionService } from './admin-seed-session.service';

export type AdminExportFormat = 'json' | 'txt' | 'csv';

@Injectable({ providedIn: 'root' })
export class AdminExportClientService {
  private readonly http = inject(HttpClient);
  private readonly seedSession = inject(AdminSeedSessionService);

  readonly domains = [
    'users',
    'authAudit',
    'faucetClaims',
    'blocks',
    'pending',
    'ops',
    'socControls',
  ] as const;

  async download(format: AdminExportFormat, domains: string[]): Promise<void> {
    const params: Record<string, string> = { format };
    if (domains.length > 0 && domains.length < this.domains.length) {
      params['domains'] = domains.join(',');
    }
    const blob = await firstValueFrom(
      this.http.get(`${environment.apiUrl}/v1/admin/export`, {
        headers: this.seedSession.unlockHeaders(),
        params,
        responseType: 'blob',
      })
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `dartchain-admin-export.${format}`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async downloadAllFormats(domains: string[]): Promise<void> {
    for (const format of ['json', 'txt', 'csv'] as const) {
      await this.download(format, domains);
    }
  }
}
