import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface ChainConfig {
  chainId: number;
  networkName: string;
  nativeToken: string;
  addressSchemeDefault: string;
  signingPayloadVersion: string;
  evmCompatible: boolean;
}

@Injectable({ providedIn: 'root' })
export class ChainConfigService {
  private readonly http = inject(HttpClient);

  private readonly configSignal = signal<ChainConfig | null>(null);

  readonly config = this.configSignal.asReadonly();

  async load(): Promise<ChainConfig | null> {
    const cached = this.configSignal();
    if (cached) {
      return cached;
    }

    try {
      const config = await firstValueFrom(
        this.http.get<ChainConfig>(`${environment.apiUrl.replace(/\/+$/, '')}/v1/chain/config`)
      );
      this.configSignal.set(config);
      return config;
    } catch {
      return null;
    }
  }
}
