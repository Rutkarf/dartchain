import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

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

  async load(): Promise<ChainConfig> {
    const cached = this.configSignal();
    if (cached) {
      return cached;
    }

    const config = await firstValueFrom(
      this.http.get<ChainConfig>('/api/v1/chain/config')
    );
    this.configSignal.set(config);
    return config;
  }
}
