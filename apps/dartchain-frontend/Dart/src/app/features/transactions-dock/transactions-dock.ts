import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, effect, inject, untracked } from '@angular/core';

import { LocaleService } from '../../core/i18n/locale.service';
import { TransactionsDataService } from '../../core/services/transactions-data.service';
import { TransactionsDockService } from '../../core/services/transactions-dock.service';
import { BlockComposerComponent } from '../block-composer/block-composer';
import { PendingTransactionsComponent } from '../pending-transactions/pending-transactions';

@Component({
  selector: 'app-transactions-dock',
  standalone: true,
  imports: [CommonModule, BlockComposerComponent, PendingTransactionsComponent],
  templateUrl: './transactions-dock.html',
  styleUrl: './transactions-dock.css',
})
export class TransactionsDockComponent implements OnInit {
  @ViewChild('mempoolPanel') mempoolPanelRef?: ElementRef<HTMLElement>;

  protected readonly locale = inject(LocaleService);
  protected readonly dock = inject(TransactionsDockService);
  private readonly data = inject(TransactionsDataService);

  constructor() {
    effect(() => {
      const subTab = this.dock.activeSubTab();
      const highlight = this.dock.highlightTransactionId();
      untracked(() => {
        if (subTab === 'mempool' || highlight) {
          queueMicrotask(() => this.focusMempool(highlight));
        }
      });
    });
  }

  ngOnInit(): void {
    this.data.init();
  }

  protected mempoolSummary(): string {
    const count = this.dock.pendingCount();
    if (count <= 0) {
      return this.locale.t('transactions.mempoolEmpty');
    }

    return this.locale
      .t('transactions.mempoolCount')
      .replace('{count}', String(count));
  }

  protected refreshAll(): void {
    this.data.init();
    this.data.scheduleRefresh(true);
  }

  private focusMempool(highlightId?: string | null): void {
    const root = this.mempoolPanelRef?.nativeElement;
    if (!root) {
      return;
    }

    if (highlightId) {
      const highlighted = root.querySelector('.pending-view__item.is-highlighted');
      highlighted?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      return;
    }

    root.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}
