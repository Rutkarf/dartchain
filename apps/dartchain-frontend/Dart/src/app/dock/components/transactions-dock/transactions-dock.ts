import { CommonModule } from '@angular/common';
import {
  Component,
  HostListener,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';

import { LocaleService } from '@core/i18n/locale.service';
import { TransactionsDataService } from '@dock/services/transactions-data.service';
import { TransactionsDockService } from '@dock/services/transactions-dock.service';
import {
  DOCK_REFRESH_EVENT,
  refreshEventMatchesTab,
} from '@core/constants/panel-refresh.constants';
import { PendingTransactionsComponent } from '@blockchain/pending-transactions/pending-transactions';

@Component({
  selector: 'app-transactions-dock',
  standalone: true,
  imports: [CommonModule, PendingTransactionsComponent],
  templateUrl: './transactions-dock.html',
  styleUrl: './transactions-dock.css',
})
export class TransactionsDockComponent implements OnInit {
  private readonly pending = viewChild(PendingTransactionsComponent);

  protected readonly locale = inject(LocaleService);
  protected readonly dock = inject(TransactionsDockService);
  private readonly data = inject(TransactionsDataService);

  protected readonly filterQuery = signal('');
  /** Rows that fit the dock without scrolling (head + footer reserved). */
  protected readonly visibleRowBudget = signal(6);

  protected readonly latestBlock = computed(() => this.data.latestBlock());
  protected readonly pendingCount = computed(() => this.dock.pendingCount());

  protected readonly pendingTotalLabel = computed(() => {
    const panel = this.pending();
    if (!panel) {
      return '';
    }
    const total = panel.totalAmount();
    if (!total || total <= 0) {
      return '';
    }
    return `${panel.formatAmount(total)} R4V3`;
  });

  protected readonly miningAllBusy = computed(() => this.pending()?.miningAll() ?? false);

  constructor() {
    effect(() => {
      const highlight = this.dock.highlightTransactionId();
      untracked(() => {
        if (highlight) {
          queueMicrotask(() => this.pending()?.refresh());
        }
      });
    });
  }

  ngOnInit(): void {
    this.data.init();
  }

  protected mempoolSummary(): string {
    const count = this.pendingCount();
    if (count <= 0) {
      return this.locale.t('transactions.mempoolEmpty');
    }

    return this.locale
      .t('transactions.mempoolCount')
      .replace('{count}', String(count));
  }

  protected onFilterInput(value: string): void {
    this.filterQuery.set(value);
  }

  protected canMineAll(): boolean {
    const panel = this.pending();
    if (!panel) {
      return false;
    }
    return panel.hasTransactions() && !panel.isBusy();
  }

  protected mineAllPending(): void {
    void this.pending()?.mineAll();
  }

  protected refreshAll(): void {
    this.data.init();
    this.data.scheduleRefresh(true);
    void this.pending()?.refresh();
  }

  @HostListener(`window:${DOCK_REFRESH_EVENT}`, ['$event'])
  onDockRefresh(event: Event): void {
    if (refreshEventMatchesTab(event, 'transactions')) {
      this.refreshAll();
    }
  }

  protected openLatestBlock(): void {
    const block = this.latestBlock();
    if (!block) {
      return;
    }

    window.dispatchEvent(
      new CustomEvent('open-block-drawer', { detail: { block } })
    );
  }
}
