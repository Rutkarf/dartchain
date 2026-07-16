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
  DockPeersPhase,
  DockPeersStateService,
} from '../../core/services/dock-peers-state.service';

@Component({
  selector: 'app-dock-peers-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dock-peers-summary.html',
  styleUrls: ['./dock-summary-shared.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DockPeersSummaryComponent implements OnInit, OnDestroy {
  protected readonly state = inject(DockPeersStateService);

  @HostBinding('class.dock-summary-bar__content')
  readonly contentClass = true;

  @HostBinding('class.is-peers')
  readonly panelClass = true;

  @HostBinding('class.is-collapsed')
  readonly collapsedClass = true;

  readonly phase = this.state.phase;
  readonly statusLabel = this.state.statusLabel;
  readonly headline = this.state.headline;
  readonly progressLabel = this.state.progressLabel;
  readonly updatedAgeLabel = this.state.updatedAgeLabel;
  readonly loading = this.state.loading;
  readonly connectedCount = this.state.connectedCount;

  ngOnInit(): void {
    if (this.state.peerCount() === 0 && !this.state.loading()) {
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

  statusClass(phase: DockPeersPhase): string {
    const map: Record<DockPeersPhase, string> = {
      error: 'error',
      loading: 'loading',
      empty: 'empty',
      connected: 'connected',
      partial: 'partial',
    };
    return `dock-summary-status--${map[phase]}`;
  }

  onRefresh(event: Event): void {
    event.stopPropagation();
    this.state.refresh();
  }

  onOpen(event: Event): void {
    event.stopPropagation();
    window.dispatchEvent(
      new CustomEvent('dock-open-panel', { detail: { panel: 'peers' } })
    );
  }
}
