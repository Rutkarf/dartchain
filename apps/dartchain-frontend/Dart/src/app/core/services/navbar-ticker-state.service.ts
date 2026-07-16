import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval, startWith, switchMap } from 'rxjs';
import { catchError, of } from 'rxjs';

import { BrandCryptoSelectionService } from './brand-crypto-selection.service';
import { BlockchainApiService, PendingTransaction } from './blockchain-api.service';
import { DockChainStateService } from './dock-chain-state.service';
import { formatDockRelativeTime } from '../utils/dock-time.util';

export interface NavbarTickerSegment {
  id: string;
  label: string;
  value: string;
  detail?: string;
}

@Injectable({ providedIn: 'root' })
export class NavbarTickerStateService {
  private readonly api = inject(BlockchainApiService);
  private readonly brandCrypto = inject(BrandCryptoSelectionService);
  private readonly chainState = inject(DockChainStateService);

  readonly networkLabel = signal('DARTCHAIN');
  readonly activeToken = signal('R4V3');
  readonly lastTransactionShort = signal('Chargement…');
  readonly peersConnected = signal(0);
  readonly peersTotal = signal(0);
  readonly blockTip = signal<string | null>(null);
  readonly lastUpdatedAt = signal<number | null>(null);
  readonly loading = signal(true);

  readonly segments = computed((): NavbarTickerSegment[] => {
    const peersLabel =
      this.peersTotal() > 0
        ? `${this.peersConnected()}/${this.peersTotal()}`
        : String(this.peersConnected());

    const segments: NavbarTickerSegment[] = [
      {
        id: 'network',
        label: 'Net',
        value: this.networkLabel(),
      },
      {
        id: 'token',
        label: 'Token',
        value: this.activeToken(),
      },
      {
        id: 'tx',
        label: 'Tx',
        value: this.lastTransactionShort(),
      },
      {
        id: 'peers',
        label: 'Peers',
        value: peersLabel,
      },
    ];

    const tip = this.blockTip();
    if (tip) {
      segments.push({
        id: 'tip',
        label: 'Bloc',
        value: tip,
      });
    }

    return segments;
  });

  readonly updatedAgeLabel = computed(() =>
    formatDockRelativeTime(this.lastUpdatedAt())
  );

  constructor() {
    effect(() => {
      this.activeToken.set(String(this.brandCrypto.selected()));
    });

    this.fetchBanner();
    this.listenLiveUpdates();

    interval(30_000)
      .pipe(
        startWith(0),
        switchMap(() => this.api.getPeerStats()),
        catchError(() => of(null)),
        takeUntilDestroyed()
      )
      .subscribe((stats) => {
        if (stats) {
          this.peersConnected.set(stats.active ?? 0);
          this.peersTotal.set(stats.total ?? stats.active ?? 0);
          this.lastUpdatedAt.set(Date.now());
        }
      });

    void this.chainState.load();
    interval(45_000)
      .pipe(startWith(0), takeUntilDestroyed())
      .subscribe(() => this.chainState.refresh());

    interval(5_000)
      .pipe(startWith(0), takeUntilDestroyed())
      .subscribe(() => {
        const tip = this.chainState.latestBlock();
        this.blockTip.set(tip ? `#${tip.index}` : null);
      });
  }

  refresh(): void {
    this.fetchBanner();
    this.chainState.refresh();
  }

  private fetchBanner(): void {
    this.loading.set(true);
    this.api
      .getBanner()
      .pipe(catchError(() => of(null)))
      .subscribe((data) => {
        if (data) {
          this.networkLabel.set(data.message1?.trim() || 'DARTCHAIN');
          this.applyLatestTransactionLabel(
            data.lastTransactionShort ?? data.lastTransaction ?? null
          );
          if (typeof data.userCount === 'number' && data.userCount >= 0) {
            this.peersConnected.set(data.userCount);
          }
        } else {
          this.networkLabel.set('DARTCHAIN');
          this.lastTransactionShort.set('Aucune transaction récente');
        }
        this.loading.set(false);
        this.lastUpdatedAt.set(Date.now());
      });
  }

  private listenLiveUpdates(): void {
    this.api.connectLiveUpdates().pipe(takeUntilDestroyed()).subscribe({
      next: (message) => {
        if (message.type === 'pending-transactions') {
          this.applyLatestTransaction(message.data);
        }
        if (message.type === 'snapshot') {
          this.applyLatestTransaction(message.data.pendingTransactions);
        }
        this.lastUpdatedAt.set(Date.now());
      },
    });
  }

  private applyLatestTransaction(transactions: PendingTransaction[]): void {
    if (!transactions?.length) {
      this.lastTransactionShort.set('Aucune transaction récente');
      return;
    }

    const latest = [...transactions].sort(
      (a, b) => (b.createdAt ?? b.timestamp ?? 0) - (a.createdAt ?? a.timestamp ?? 0)
    )[0];

    const hash =
      latest.hash ??
      latest.id ??
      latest.payload ??
      latest.data ??
      'Transaction';

    this.applyLatestTransactionLabel(hash);
  }

  private applyLatestTransactionLabel(value: string | null): void {
    if (!value?.trim()) {
      this.lastTransactionShort.set('Aucune transaction récente');
      return;
    }

    const normalized = value.trim();
    this.lastTransactionShort.set(
      normalized.length > 24 ? `${normalized.slice(0, 24)}…` : normalized
    );
  }
}
