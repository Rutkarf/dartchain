import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import {
  BlockchainApiService,
  PendingTransaction,
} from '../../core/services/blockchain-api.service';

type PendingTransactionView = PendingTransaction & {
  fromAddress?: string | null;
  toAddress?: string | null;
  amount?: number | string | null;
  signature?: string | null;
  status?: string | null;
};

@Component({
  selector: 'app-pending-transactions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pending-transactions.html',
  styleUrl: './pending-transactions.css',
})
export class PendingTransactionsComponent implements OnInit, OnDestroy {
  private readonly api = inject(BlockchainApiService);

  readonly transactions = signal<PendingTransactionView[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly miningTransactionId = signal<string | null>(null);
  readonly searchQuery = signal('');
  readonly lastRefreshedAt = signal<number | null>(null);
  readonly miningAll = signal(false);
  readonly copyFeedback = signal<string | null>(null);

  readonly transactionCount = computed(() => this.transactions().length);
  readonly hasTransactions = computed(() => this.transactionCount() > 0);
  readonly isBusy = computed(() => this.loading() || !!this.miningTransactionId());

  readonly filteredTransactions = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const items = this.transactions();

    if (!query) {
      return items;
    }

    return items.filter((tx) => {
      const haystack = [
        tx.id,
        tx.hash,
        tx.data,
        this.resolveFrom(tx),
        this.resolveTo(tx),
        this.formatAmount(tx.amount),
        this.statusLabel(tx.status),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  });

  readonly hasFilteredTransactions = computed(() => this.filteredTransactions().length > 0);

  readonly totalAmount = computed(() =>
    this.transactions().reduce((sum, tx) => {
      const amount = typeof tx.amount === 'string' ? Number(tx.amount) : tx.amount;
      return sum + (Number.isFinite(amount) ? amount! : 0);
    }, 0)
  );

  readonly lastRefreshedLabel = computed(() => {
    const ts = this.lastRefreshedAt();
    if (!ts) {
      return '';
    }

    return `Màj ${this.formatRelativeTime(ts)}`;
  });

  ngOnInit(): void {
    void this.loadPendingTransactions();

    window.addEventListener('naivechain-refresh', this.handleRefreshEvent);
  }

  ngOnDestroy(): void {
    window.removeEventListener('naivechain-refresh', this.handleRefreshEvent);
  }

  private handleRefreshEvent = (): void => {
    void this.loadPendingTransactions();
  };

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }

  openComposerDock(): void {
    window.dispatchEvent(
      new CustomEvent('dock-open-panel', { detail: { panel: 'composer' } })
    );
  }

  async copyValue(value?: string | null, label = 'Valeur'): Promise<void> {
    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      this.copyFeedback.set(`${label} copié`);
      setTimeout(() => this.copyFeedback.set(null), 1500);
    } catch {
      this.error.set(`Copie ${label.toLowerCase()} impossible.`);
    }
  }

  async mineAll(): Promise<void> {
    if (this.isBusy() || !this.hasTransactions()) {
      return;
    }

    this.miningAll.set(true);
    this.error.set(null);

    for (const tx of this.transactions()) {
      if (!tx.id) {
        continue;
      }

      try {
        await firstValueFrom(this.api.minePendingTransaction({ id: tx.id }));
      } catch (error) {
        console.error(error);
        this.error.set('Erreur lors du minage groupé.');
        break;
      }
    }

    this.miningAll.set(false);
    await this.loadPendingTransactions();
    window.dispatchEvent(new CustomEvent('naivechain-refresh'));
  }

  async refresh(): Promise<void> {
    await this.loadPendingTransactions();
  }

  async loadPendingTransactions(): Promise<void> {
    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      const response = await firstValueFrom(this.api.getPendingTransactions());
      this.transactions.set(this.normalizeTransactions(response));
      this.lastRefreshedAt.set(Date.now());
    } catch (error) {
      console.error(error);
      this.transactions.set([]);
      this.error.set('Impossible de charger les transactions en attente.');
    } finally {
      this.loading.set(false);
    }
  }

  async mineTransaction(txId: string): Promise<void> {
    if (this.loading() || this.miningTransactionId() === txId) {
      return;
    }

    this.miningTransactionId.set(txId);
    this.error.set(null);

    try {
      await firstValueFrom(this.api.minePendingTransaction({ id: txId }));
      await this.loadPendingTransactions();
    } catch (error) {
      console.error(error);
      this.error.set('Erreur lors du minage de la transaction.');
    } finally {
      this.miningTransactionId.set(null);
    }
  }

  isMining(txId: string): boolean {
    return this.miningTransactionId() === txId;
  }

  resolveFrom(tx: PendingTransactionView): string | null {
    return tx.fromAddress ?? tx.sender ?? null;
  }

  resolveTo(tx: PendingTransactionView): string | null {
    return tx.toAddress ?? tx.recipient ?? null;
  }

  trackTransaction(_index: number, tx: PendingTransactionView): string {
    return tx.id || tx.hash || `${tx.createdAt ?? 'no-date'}-${tx.data ?? 'no-data'}`;
  }

  shortHash(value?: string | null): string {
    if (!value) {
      return 'N/A';
    }

    return value.length > 18 ? `${value.slice(0, 10)}...${value.slice(-6)}` : value;
  }

  formatAmount(amount?: number | string | null): string {
    if (amount === null || amount === undefined || amount === '') {
      return '—';
    }

    const num = typeof amount === 'string' ? Number(amount) : amount;
    if (Number.isFinite(num)) {
      return num.toString();
    }

    return `${amount}`;
  }

  statusLabel(status?: string | null): string {
    if (!status) {
      return 'PENDING';
    }

    return status.toUpperCase();
  }

  formatRelativeTime(value?: number | null): string {
    if (!value) {
      return '—';
    }

    const ts = value > 1_000_000_000_000 ? value : value * 1000;
    const diffMs = Date.now() - ts;

    if (diffMs < 60_000) {
      return 'now';
    }

    if (diffMs < 3_600_000) {
      return `${Math.floor(diffMs / 60_000)}m`;
    }

    if (diffMs < 86_400_000) {
      return `${Math.floor(diffMs / 3_600_000)}h`;
    }

    return `${Math.floor(diffMs / 86_400_000)}j`;
  }

  formatFullTime(value?: number | null): string {
    if (!value) {
      return 'Horodatage indisponible';
    }

    const ts = value > 1_000_000_000_000 ? value : value * 1000;
    return new Date(ts).toLocaleString('fr-FR');
  }

  private normalizeTransactions(
    data: PendingTransaction[] | null | undefined
  ): PendingTransactionView[] {
    if (!Array.isArray(data)) {
      return [];
    }

    return [...data]
      .filter((tx): tx is PendingTransactionView => !!tx)
      .sort((a, b) => {
        const ta = typeof a.createdAt === 'number' ? a.createdAt : a.timestamp ?? 0;
        const tb = typeof b.createdAt === 'number' ? b.createdAt : b.timestamp ?? 0;
        return tb - ta;
      });
  }
}
