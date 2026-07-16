import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  OnDestroy,
  OnInit,
  computed,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { COLLAPSED_SUMMARY_BAR_CLASS } from '../../core/models/collapsed-summary.model';
import { DockBlockStateService } from '../../core/services/dock-block-state.service';
import { DockPendingStateService } from '../../core/services/dock-pending-state.service';
import { formatDockRelativeTime } from '../../core/utils/dock-time.util';

@Component({
  selector: 'app-dock-transactions-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dock-transactions-summary.html',
  styleUrls: ['./dock-summary-shared.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DockTransactionsSummaryComponent implements OnInit, OnDestroy {
  private readonly pendingState = inject(DockPendingStateService);
  private readonly blockState = inject(DockBlockStateService);

  @HostBinding('class')
  readonly hostClasses = `${COLLAPSED_SUMMARY_BAR_CLASS} dock-summary-bar__content is-transactions`;

  @HostBinding('class.is-collapsed')
  readonly collapsedClass = true;

  readonly pendingCount = this.pendingState.count;
  readonly pendingHeadline = this.pendingState.headline;
  readonly blockHeadline = this.blockState.headline;
  readonly loading = computed(
    () => this.pendingState.loading() || this.blockState.loading()
  );

  readonly statusLabel = computed(() => {
    if (this.pendingState.error() || this.blockState.error()) {
      return 'Erreur';
    }
    if (this.loading()) {
      return 'Sync…';
    }
    if (this.pendingCount() > 0) {
      return 'En attente';
    }
    return 'Prêt';
  });

  readonly headline = computed(() => {
    const pending = this.pendingCount();
    if (pending > 0) {
      return `${pending} tx pending · ${this.pendingHeadline()}`;
    }

    const blockTip = this.blockHeadline();
    return blockTip || 'Composer ou consulter le mempool';
  });

  readonly progressLabel = computed(() => {
    const pendingProgress = this.pendingState.progressLabel();
    const blockProgress = this.blockState.progressLabel();
    return [pendingProgress, blockProgress].filter(Boolean).join(' · ');
  });

  readonly updatedAgeLabel = computed(() => {
    const pendingAt = this.pendingState.lastUpdatedAt();
    const blockAt = this.blockState.lastUpdatedAt();
    const latest = Math.max(pendingAt ?? 0, blockAt ?? 0);
    return latest > 0 ? formatDockRelativeTime(latest) : '';
  });

  ngOnInit(): void {
    void this.pendingState.load();
    void this.blockState.load();
    window.addEventListener('naivechain-refresh', this.onGlobalRefresh);
  }

  ngOnDestroy(): void {
    window.removeEventListener('naivechain-refresh', this.onGlobalRefresh);
  }

  private onGlobalRefresh = (): void => {
    this.pendingState.refresh(true);
    this.blockState.refresh(true);
  };

  statusClass(): string {
    if (this.pendingState.error() || this.blockState.error()) {
      return 'dock-summary-status--error';
    }
    if (this.loading()) {
      return 'dock-summary-status--busy';
    }
    if (this.pendingCount() > 0) {
      return 'dock-summary-status--waiting';
    }
    return 'dock-summary-status--ready';
  }

  onRefresh(event: Event): void {
    event.stopPropagation();
    this.pendingState.refresh(true);
    this.blockState.refresh(true);
  }

  onOpen(event: Event): void {
    event.stopPropagation();
    window.dispatchEvent(
      new CustomEvent('dock-open-panel', {
        detail: { panel: this.pendingCount() > 0 ? 'pending' : 'composer' },
      })
    );
  }
}
