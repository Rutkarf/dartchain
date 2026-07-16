import { Injectable, signal } from '@angular/core';

export type TransactionSubTab = 'composer' | 'mempool';

@Injectable({ providedIn: 'root' })
export class TransactionsDockService {
  readonly activeSubTab = signal<TransactionSubTab>('composer');
  readonly pendingCount = signal(0);
  readonly highlightTransactionId = signal<string | null>(null);

  showComposer(): void {
    this.activeSubTab.set('composer');
    this.highlightTransactionId.set(null);
  }

  showMempool(highlightTransactionId?: string | null): void {
    this.activeSubTab.set('mempool');
    if (highlightTransactionId) {
      this.highlightTransactionId.set(highlightTransactionId);
    }
  }

  setPendingCount(count: number): void {
    this.pendingCount.set(Math.max(0, count));
  }

  clearHighlight(): void {
    this.highlightTransactionId.set(null);
  }
}
