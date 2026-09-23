import { Injectable, computed, signal } from '@angular/core';
import { Subject } from 'rxjs';

import { WalletResponse } from '@blockchain/services/blockchain-api.service';
import { normalizeR4v3Amount } from '@core/utils/r4v3-amount.util';

const STORAGE_KEY = 'r4v3chainz-wallet';
/** Retries assez longs pour couvrir mine mempool faucet + sync. */
const BALANCE_REFRESH_RETRY_MS = [0, 400, 1200, 2500, 5000, 9000] as const;

@Injectable({ providedIn: 'root' })
export class WalletSessionService {
  private readonly walletSignal = signal<WalletResponse | null>(this.readFromStorage());
  private readonly balanceRefreshSubject = new Subject<void>();
  private readonly optimisticCreditSubject = new Subject<string>();
  private balanceRefreshTimers: ReturnType<typeof setTimeout>[] = [];

  readonly wallet = this.walletSignal.asReadonly();
  readonly address = computed(() => this.wallet()?.address ?? '');
  readonly balanceRefresh$ = this.balanceRefreshSubject.asObservable();
  /** Crédit immédiat UI (faucet / quêtes) avant confirmation on-chain. */
  readonly optimisticCredit$ = this.optimisticCreditSubject.asObservable();

  setWallet(wallet: WalletResponse): void {
    this.walletSignal.set(wallet);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(wallet));
  }

  clearWallet(): void {
    this.walletSignal.set(null);
    sessionStorage.removeItem(STORAGE_KEY);
  }

  /**
   * Bump solde affiché tout de suite, puis poll getBalance.
   * @param optimisticCredit montant claimé (faucet / quête) si connu
   */
  requestBalanceRefresh(optimisticCredit?: string | number | null): void {
    const credit = normalizeR4v3Amount(optimisticCredit);
    if (optimisticCredit != null && credit !== '0') {
      this.optimisticCreditSubject.next(credit);
    }
    this.emitBalanceRefresh();
    this.balanceRefreshTimers.forEach((timer) => clearTimeout(timer));
    this.balanceRefreshTimers = BALANCE_REFRESH_RETRY_MS.filter((d) => d > 0).map((delay) =>
      setTimeout(() => this.emitBalanceRefresh(), delay)
    );
  }

  private emitBalanceRefresh(): void {
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
