import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  OnDestroy,
  OnInit,
  computed,
  inject,
} from '@angular/core';

import { COLLAPSED_SUMMARY_BAR_CLASS } from '@dock/models/collapsed-summary.model';
import { DockBlockStateService } from '@dock/services/dock-block-state.service';
import { DockPendingStateService } from '@dock/services/dock-pending-state.service';
import { formatDockRelativeTime } from '@core/utils/dock-time.util';

@Component({
  selector: 'app-dock-transactions-summary',
  standalone: true,
  templateUrl: './dock-transactions-summary.html',
  styleUrls: ['./dock-transactions-summary.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DockTransactionsSummaryComponent implements OnInit, OnDestroy {
  private readonly pendingState = inject(DockPendingStateService);
  private readonly blockState = inject(DockBlockStateService);

  @HostBinding(`class.${COLLAPSED_SUMMARY_BAR_CLASS}`)
  readonly collapsedSummaryBar = true;

  @HostBinding('class.dock-summary-bar__content')
  readonly contentClass = true;

  @HostBinding('class.is-transactions')
  readonly panelClass = true;

  @HostBinding('class.is-collapsed')
  readonly collapsedClass = true;

  readonly pendingCount = this.pendingState.count;
  readonly pendingHash = this.pendingState.nextHash;
  readonly canMine = this.pendingState.canMine;
  readonly mining = this.pendingState.mining;
  readonly tipTxLabel = this.blockState.tipTxLabel;

  readonly hashDisplay = computed(() => {
    const hash = this.pendingHash();
    if (hash) {
      return hash;
    }
    if (this.pendingState.loading()) {
      return 'Chargement…';
    }
    if (this.pendingState.error()) {
      return 'Mempool indisponible';
    }
    return 'Mempool vide';
  });

  readonly updatedAgeLabel = computed(() => {
    const pendingAt = this.pendingState.lastUpdatedAt();
    const blockAt = this.blockState.lastUpdatedAt();
    const latest = Math.max(pendingAt ?? 0, blockAt ?? 0);
    return latest > 0 ? formatDockRelativeTime(latest) : '';
  });

  readonly barAriaLabel = computed(() => {
    const hash = this.pendingHash();
    const tip = this.tipTxLabel();
    const age = this.updatedAgeLabel();
    const parts = [
      hash ? `Tx à miner ${hash}` : 'Mempool vide',
      tip ? `${tip} dernier bloc` : '',
      age,
    ].filter(Boolean);
    return parts.join(' · ');
  });

  ngOnInit(): void {
    void this.pendingState.load();
    void this.blockState.load();
    window.addEventListener('dartchain-refresh-dock', this.onGlobalRefresh);
  }

  ngOnDestroy(): void {
    window.removeEventListener('dartchain-refresh-dock', this.onGlobalRefresh);
  }

  private onGlobalRefresh = (): void => {
    this.pendingState.refresh(true);
    this.blockState.refresh(true);
  };

  onOpenTx(event: Event): void {
    event.stopPropagation();
    window.dispatchEvent(
      new CustomEvent('dock-open-panel', {
        detail: { panel: this.pendingCount() > 0 ? 'pending' : 'composer' },
      })
    );
  }

  onMine(event: Event): void {
    event.stopPropagation();
    if (!this.canMine()) {
      return;
    }
    void this.pendingState.mineAll().then(() => {
      this.blockState.refresh(true);
      window.dispatchEvent(new CustomEvent('dartchain-refresh-dock'));
    });
  }
}
