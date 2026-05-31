import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface FaucetStateResponse {
  walletAddress: string;
  eligible: boolean;
  cooldownSeconds: number;
  nextEligibleAt: string | null;
  lastClaimAmount: string | null;
  lastClaimAt: string | null;
}

export interface FaucetClaimRequest {
  walletAddress: string;
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

@Injectable({
  providedIn: 'root',
})
export class FaucetService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl.replace(/\/+$/, '')}/faucet`;

  getState(walletAddress: string): Observable<FaucetStateResponse> {
    return this.http.get<FaucetStateResponse>(
      `${this.baseUrl}/state/${encodeURIComponent(walletAddress)}`
    );
  }

  claim(request: FaucetClaimRequest): Observable<FaucetClaimResponse> {
    return this.http.post<FaucetClaimResponse>(`${this.baseUrl}/claim`, request);
  }
}
