import { CommonModule } from '@angular/common';
import { Component, HostBinding, Input, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import {
  BlockchainApiService,
  PendingTransaction,
} from '../../core/services/blockchain-api.service';
import { AuthService } from '../../core/services/auth.service';
import { TransactionsDockService } from '../../core/services/transactions-dock.service';
import { TransactionsDataService } from '../../core/services/transactions-data.service';
import { LocaleService } from '../../core/i18n/locale.service';

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
export class PendingTransactionsComponent {
  @Input() embedded = false;
  @Input() compact = false;

  @HostBinding('class.pending-view--compact')
  get compactHostClass(): boolean {
    return this.compact;
  }

  @HostBinding('class.pending-view--embedded')
  get embeddedHostClass(): boolean {
    return this.embedded;
  }

  private static readonly COMPACT_MAX_ROWS = 3;

  private readonly api = inject(BlockchainApiService);
  protected readonly data = inject(TransactionsDataService);
  private readonly auth = inject(AuthService);
  private readonly transactionsDock = inject(TransactionsDockService);
  protected readonly locale = inject(LocaleService);

  readonly miningTransactionId = signal<string | null>(null);
  readonly searchQuery = signal('');
  readonly miningAll = signal(false);
  readonly copyFeedback = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);

  readonly transactions = computed(() =>
    this.normalizeTransactions(this.data.pending())
  );

  readonly loading = computed(() => this.data.pendingLoading());
  readonly error = computed(() => this.actionError() ?? this.data.pendingError());

  readonly transactionCount = computed(() => this.transactions().length);
  readonly hasTransactions = computed(() => this.transactionCount() > 0);
  readonly isBusy = computed(
    () => this.loading() || !!this.miningTransactionId() || this.miningAll()
  );

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

  readonly displayTransactions = computed(() => {
    const items = this.filteredTransactions();
    if (this.compact) {
      return items.slice(0, PendingTransactionsComponent.COMPACT_MAX_ROWS);
    }
    return items;
  });

  readonly hiddenCompactCount = computed(() => {
    if (!this.compact) {
      return 0;
    }
    return Math.max(0, this.filteredTransactions().length - this.displayTransactions().length);
  });

  readonly hasFilteredTransactions = computed(() => this.filteredTransactions().length > 0);
  readonly highlightTransactionId = computed(() => this.transactionsDock.highlightTransactionId());

  readonly totalAmount = computed(() =>
    this.transactions().reduce((sum, tx) => {
      const amount = typeof tx.amount === 'string' ? Number(tx.amount) : tx.amount;
      return sum + (Number.isFinite(amount) ? amount! : 0);
    }, 0)
  );

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }

  openComposerDock(): void {
    this.transactionsDock.showComposer();
    document.getElementById('from-address')?.focus();
  }

  isHighlighted(tx: PendingTransactionView): boolean {
    const highlight = this.highlightTransactionId();
    if (!highlight) {
      return false;
    }

    return tx.id === highlight || tx.hash === highlight;
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
      this.actionError.set(`Copie ${label.toLowerCase()} impossible.`);
    }
  }

  async mineAll(): Promise<void> {
    if (this.isBusy() || !this.hasTransactions()) {
      return;
    }

    if (!this.auth.promptLogin()) {
      this.actionError.set('Connectez-vous pour miner.');
      return;
    }

    this.miningAll.set(true);
    this.actionError.set(null);

    for (const tx of this.transactions()) {
      if (!tx.id) {
        continue;
      }

      try {
        await firstValueFrom(this.api.minePendingTransaction({ id: tx.id }));
      } catch (mineError) {
        console.error(mineError);
        this.actionError.set('Erreur lors du minage groupé.');
        break;
      }
    }

    this.miningAll.set(false);
    this.data.scheduleRefresh(true);
  }

  async refresh(): Promise<void> {
    this.actionError.set(null);
    await this.data.refreshPending(true);
  }

  async mineTransaction(txId: string): Promise<void> {
    if (this.isBusy() || this.miningTransactionId() === txId) {
      return;
    }

    if (!this.auth.promptLogin()) {
      this.actionError.set('Connectez-vous pour miner.');
      return;
    }

    this.miningTransactionId.set(txId);
    this.actionError.set(null);

    try {
      await firstValueFrom(this.api.minePendingTransaction({ id: txId }));
      this.data.scheduleRefresh(true);
    } catch (mineError) {
      console.error(mineError);
      this.actionError.set('Erreur lors du minage.');
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

    return value.length > 14 ? `${value.slice(0, 6)}…${value.slice(-4)}` : value;
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
      return 'PEND';
    }

    return status.toUpperCase().slice(0, 4);
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

    return `${Math.floor(diffMs / 3_600_000)}h`;
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
