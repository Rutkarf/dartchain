import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  DockPendingPhase,
  DockPendingStateService,
} from '../../core/services/dock-pending-state.service';

@Component({
  selector: 'app-dock-pending-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dock-pending-summary.html',
  styleUrls: ['./dock-summary-shared.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DockPendingSummaryComponent implements OnInit, OnDestroy {
  protected readonly state = inject(DockPendingStateService);

  @HostBinding('class.dock-summary-bar__content')
  readonly contentClass = true;

  @HostBinding('class.is-pending')
  readonly panelClass = true;

  @HostBinding('class.is-collapsed')
  readonly collapsedClass = true;

  readonly phase = this.state.phase;
  readonly statusLabel = this.state.statusLabel;
  readonly headline = this.state.headline;
  readonly progressLabel = this.state.progressLabel;
  readonly updatedAgeLabel = this.state.updatedAgeLabel;
  readonly loading = this.state.loading;
  readonly count = this.state.count;

  ngOnInit(): void {
    if (this.state.count() === 0 && !this.state.loading()) {
      void this.state.load();
    }
    window.addEventListener('naivechain-refresh', this.onGlobalRefresh);
  }

  ngOnDestroy(): void {
    window.removeEventListener('naivechain-refresh', this.onGlobalRefresh);
  }

  private onGlobalRefresh = (): void => {
    this.state.refresh();
  };

  statusClass(phase: DockPendingPhase): string {
    const map: Record<DockPendingPhase, string> = {
      error: 'error',
      loading: 'busy',
      empty: 'empty',
      ready: 'ready',
      busy: 'busy',
    };
    return `dock-summary-status--${map[phase]}`;
  }

  onRefresh(event: Event): void {
    event.stopPropagation();
    this.state.refresh();
  }

  onExpand(event: Event): void {
    event.stopPropagation();
    window.dispatchEvent(
      new CustomEvent('dock-open-panel', { detail: { panel: 'pending' } })
    );
  }
}
