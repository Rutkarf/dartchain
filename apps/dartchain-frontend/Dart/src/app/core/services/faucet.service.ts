import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface FaucetConfigResponse {
  defaultClaimAmount: string;
  cooldownSeconds: number;
  walletPrefix: string;
  nativeToken: string;
  smallestUnit: string;
  maxClaimAmount: string;
}

export interface FaucetStateResponse {
  walletAddress: string;
  eligible: boolean;
  cooldownSeconds: number;
  nextEligibleAt: string | null;
  lastClaimAmount: string | null;
  lastClaimAt: string | null;
  defaultClaimAmount: string;
  configCooldownSeconds: number;
}

export interface FaucetClaimRequest {
  walletAddress: string;
  amount?: string | null;
  clientId?: string | null;
}

export interface FaucetClaimResponse {
  success: boolean;
  message: string;
  walletAddress: string;
  amount: string;
  claimedAt: string;
  nextEligibleAt: string;
  cooldownSeconds: number;
  txHash: string;
}

export interface FaucetClaimRecord {
  id: string;
  walletAddress: string;
  amount: string | number;
  claimedAt: number;
  nextEligibleAt?: number;
  txHash?: string | null;
  clientId?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class FaucetService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl.replace(/\/+$/, '')}/faucet`;

  getConfig(): Observable<FaucetConfigResponse> {
    return this.http.get<FaucetConfigResponse>(`${this.baseUrl}/config`);
  }

  getState(walletAddress: string): Observable<FaucetStateResponse> {
    return this.http.get<FaucetStateResponse>(
      `${this.baseUrl}/state/${encodeURIComponent(walletAddress)}`
    );
  }

  claim(request: FaucetClaimRequest, headers?: HttpHeaders): Observable<FaucetClaimResponse> {
    return this.http.post<FaucetClaimResponse>(`${this.baseUrl}/claim`, request, {
      headers,
    });
  }

  getClaims(
    headers: HttpHeaders,
    walletAddress?: string,
    offset = 0,
    limit = 50
  ): Observable<FaucetClaimRecord[]> {
    let params = new HttpParams().set('offset', String(offset)).set('limit', String(limit));
    if (walletAddress?.trim()) {
      params = params.set('walletAddress', walletAddress.trim());
    }

    return this.http.get<FaucetClaimRecord[]>(`${this.baseUrl}/claims`, { headers, params });
  }
}
