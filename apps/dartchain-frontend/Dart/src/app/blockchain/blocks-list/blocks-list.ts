import {
  Component,
  DestroyRef,
  HostListener,
  OnInit,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { DatePipe, CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';

import { Block } from '../../core/models/block.model';
import { LocaleService } from '../../core/i18n/locale.service';
import { ChainDataService } from '../../core/services/chain-data.service';
import {
  DOCK_REFRESH_EVENT,
  refreshEventMatchesTab,
} from '../../core/constants/panel-refresh.constants';
import { ChainGraphComponent } from '@explorer/chain-graph/chain-graph';
import {
  applyChainFilters,
  downloadBlocksJson,
  sortBlocksDescending,
} from '@explorer/chain-graph/chain-explorer.util';

type ChainViewMode = 'list' | 'graph';
type FeedbackKind = 'success' | 'error';

const VIEW_MODE_KEY = 'dartchain.chain.viewMode';

@Component({
  selector: 'app-blocks-list',
  standalone: true,
  imports: [CommonModule, DatePipe, ChainGraphComponent],
  templateUrl: './blocks-list.html',
  styleUrls: ['./blocks-list.css'],
})
export class BlocksListComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly data = inject(ChainDataService);
  readonly locale = inject(LocaleService);

  readonly searchQuery = signal('');
  readonly walletFilter = signal('');
  readonly fromIndex = signal('');
  readonly toIndex = signal('');
  readonly viewMode = signal<ChainViewMode>(this.readStoredViewMode());
  readonly feedback = signal<string | null>(null);
  readonly feedbackKind = signal<FeedbackKind>('success');

  readonly blocks = computed(() => this.data.blocks());
  readonly stats = computed(() => this.data.stats());
  readonly chainValid = computed(() => this.data.chainValid());
  readonly loading = computed(() => this.data.loading());
  readonly error = computed(() => this.data.error());

  readonly blockCount = computed(() => this.blocks().length);
  readonly hasBlocks = computed(() => this.blockCount() > 0);

  readonly filteredBlocks = computed(() =>
    sortBlocksDescending(
      applyChainFilters(this.blocks(), {
        searchQuery: this.searchQuery(),
        wallet: this.data.usingServerFilter() ? '' : this.walletFilter(),
        fromIndex: this.data.usingServerFilter() ? null : this.parseIndex(this.fromIndex()),
        toIndex: this.data.usingServerFilter() ? null : this.parseIndex(this.toIndex()),
      })
    )
  );

  readonly filteredBlockCount = computed(() => this.filteredBlocks().length);
  readonly hasFilteredBlocks = computed(() => this.filteredBlockCount() > 0);
  readonly latestBlock = computed(() => this.filteredBlocks()[0] ?? this.blocks()[0] ?? null);
  readonly tipBlockIndex = computed(() => this.latestBlock()?.index ?? null);

  readonly graphMaxNodes = computed(() => {
    const count = this.filteredBlockCount();
    // 9 colonnes × 5 pastilles visibles sans scroll, puis scroll au-delà
    return Math.min(Math.max(count, 12), 45);
  });

  readonly hasActiveFilters = computed(
    () =>
      !!this.searchQuery().trim() ||
      !!this.walletFilter().trim() ||
      !!this.fromIndex().trim() ||
      !!this.toIndex().trim()
  );

  readonly resultsLabel = computed(() => {
    const total = this.filteredBlockCount();
    return this.locale.t('chain.filter.results').replace('{count}', String(total));
  });

  readonly searchPlaceholder = computed(() => this.resultsLabel());

  readonly blocksHeadline = computed(() => {
    const count = this.stats()?.totalBlocks ?? this.blockCount();
    return `${count} BLOCKS`;
  });

  readonly syncSubLabel = computed(() => {
    if (this.loading()) {
      return this.locale.t('chain.syncingLabel');
    }

    if (this.error()) {
      return this.locale.t('chain.errorSync');
    }

    return this.locale.t('chain.syncedLabel');
  });

  readonly chainStatusLabel = computed(() => {
    if (this.loading()) {
      return this.locale.t('chain.syncing');
    }

    if (this.error()) {
      return this.locale.t('chain.errorSync');
    }

    if (!this.hasBlocks()) {
      return this.locale.t('chain.empty');
    }

    const chainStats = this.stats();
    if (chainStats?.totalBlocks) {
      return `${chainStats.totalBlocks} ${this.locale.t('chain.blocksLabel')} · synced`;
    }

    const tip = this.latestBlock();
    return tip ? `BLOCK #${tip.index}` : 'Synced';
  });

  readonly selectBlock = output<Block>();

  private feedbackTimerId: number | null = null;

  constructor() {
    toObservable(
      computed(() => ({
        wallet: this.walletFilter(),
        fromIndex: this.parseIndex(this.fromIndex()),
        toIndex: this.parseIndex(this.toIndex()),
      }))
    )
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((query) => {
        void this.data.refreshBlocks(false, {
          wallet: query.wallet,
          fromIndex: query.fromIndex,
          toIndex: query.toIndex,
        });
      });
  }

  ngOnInit(): void {
    this.data.init();
  }

  @HostListener(`window:${DOCK_REFRESH_EVENT}`, ['$event'])
  onGlobalRefresh(event: Event): void {
    if (refreshEventMatchesTab(event, 'chain')) {
      void this.refresh();
    }
  }

  @HostListener('window:chain-filter-query', ['$event'])
  onChainFilterQuery(event: Event): void {
    const query = (event as CustomEvent<{ query?: string }>).detail?.query?.trim();
    if (query) {
      this.searchQuery.set(query);
    }
  }

  refresh(): void {
    void this.data.refreshAll(true, this.buildServerQuery());
  }

  setViewMode(mode: ChainViewMode): void {
    this.viewMode.set(mode);
    try {
      localStorage.setItem(VIEW_MODE_KEY, mode);
    } catch {
      // ignore storage errors
    }
  }

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
  }

  onWalletInput(value: string): void {
    this.walletFilter.set(value);
  }

  onFromIndexInput(value: string): void {
    this.fromIndex.set(value);
  }

  onToIndexInput(value: string): void {
    this.toIndex.set(value);
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.walletFilter.set('');
    this.fromIndex.set('');
    this.toIndex.set('');
    void this.data.refreshBlocks(true);
  }

  exportFilteredBlocks(): void {
    downloadBlocksJson(this.filteredBlocks());
    this.showFeedback(this.locale.t('chain.exportSuccess'), 'success');
  }

  async copyTipHash(hash?: string | null): Promise<void> {
    if (!hash) {
      return;
    }

    try {
      await navigator.clipboard.writeText(hash);
      this.showFeedback(this.locale.t('chain.copySuccess'), 'success');
    } catch {
      this.showFeedback(this.locale.t('chain.copyError'), 'error');
    }
  }

  openBlock(block: Block): void {
    this.selectBlock.emit(block);
  }

  blockTxCount(block: Block): number {
    return block.transactions?.length ?? 0;
  }

  shortHash(hash: string | null | undefined, size = 6): string {
    if (!hash) {
      return 'N/A';
    }

    if (hash.length <= size * 2) {
      return hash;
    }

    return `${hash.slice(0, size)}…${hash.slice(-size)}`;
  }

  private buildServerQuery() {
    return {
      wallet: this.walletFilter(),
      fromIndex: this.parseIndex(this.fromIndex()),
      toIndex: this.parseIndex(this.toIndex()),
    };
  }

  private parseIndex(value: string): number | null {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const parsed = Number.parseInt(trimmed, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private readStoredViewMode(): ChainViewMode {
    try {
      const stored = localStorage.getItem(VIEW_MODE_KEY);
      return stored === 'graph' ? 'graph' : 'list';
    } catch {
      return 'list';
    }
  }

  private showFeedback(message: string, kind: FeedbackKind): void {
    this.feedback.set(message);
    this.feedbackKind.set(kind);

    if (this.feedbackTimerId !== null) {
      window.clearTimeout(this.feedbackTimerId);
    }

    this.feedbackTimerId = window.setTimeout(() => {
      this.feedback.set(null);
      this.feedbackTimerId = null;
    }, 1800);
  }
}
