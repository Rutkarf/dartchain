import { Injectable, computed, signal } from '@angular/core';
import { Subject } from 'rxjs';

import { WalletResponse } from './blockchain-api.service';

const STORAGE_KEY = 'r4v3chainz-wallet';

@Injectable({ providedIn: 'root' })
export class WalletSessionService {
  private readonly walletSignal = signal<WalletResponse | null>(this.readFromStorage());
  private readonly balanceRefreshSubject = new Subject<void>();

  readonly wallet = this.walletSignal.asReadonly();
  readonly address = computed(() => this.wallet()?.address ?? '');
  readonly balanceRefresh$ = this.balanceRefreshSubject.asObservable();

  setWallet(wallet: WalletResponse): void {
    this.walletSignal.set(wallet);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(wallet));
  }

  clearWallet(): void {
    this.walletSignal.set(null);
    sessionStorage.removeItem(STORAGE_KEY);
  }

  requestBalanceRefresh(): void {
    this.balanceRefreshSubject.next();
  }

  private readFromStorage(): WalletResponse | null {
    try {
      const raw =
        sessionStorage.getItem(STORAGE_KEY) ??
        sessionStorage.getItem('dartchain-wallet');
      if (!raw) {
        return null;
      }

      return JSON.parse(raw) as WalletResponse;
    } catch {
      return null;
    }
  }
}
