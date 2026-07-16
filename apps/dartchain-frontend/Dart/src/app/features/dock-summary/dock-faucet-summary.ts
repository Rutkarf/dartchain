import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { COLLAPSED_SUMMARY_BAR_CLASS } from '../../core/models/collapsed-summary.model';
import {
  DockFaucetPhase,
  DockFaucetStateService,
} from '../../core/services/dock-faucet-state.service';

@Component({
  selector: 'app-dock-faucet-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dock-faucet-summary.html',
  styleUrls: ['./dock-summary-shared.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DockFaucetSummaryComponent implements OnInit, OnDestroy {
  protected readonly state = inject(DockFaucetStateService);

  @HostBinding('class')
  readonly hostClasses = `${COLLAPSED_SUMMARY_BAR_CLASS} dock-summary-bar__content is-faucet`;

  @HostBinding('class.is-collapsed')
  readonly collapsedClass = true;

  readonly phase = this.state.phase;
  readonly statusLabel = this.state.statusLabel;
  readonly headline = this.state.headline;
  readonly progressLabel = this.state.progressLabel;
  readonly updatedAgeLabel = this.state.updatedAgeLabel;
  readonly loading = this.state.loading;

  ngOnInit(): void {
    void this.state.load();
    window.addEventListener('naivechain-refresh', this.onGlobalRefresh);
  }

  ngOnDestroy(): void {
    window.removeEventListener('naivechain-refresh', this.onGlobalRefresh);
  }

  private onGlobalRefresh = (): void => {
    this.state.refresh();
  };

  statusClass(phase: DockFaucetPhase): string {
    const map: Record<DockFaucetPhase, string> = {
      error: 'error',
      loading: 'busy',
      disconnected: 'disconnected',
      cooldown: 'waiting',
      ready: 'ready',
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
      new CustomEvent('dock-open-panel', { detail: { panel: 'faucet' } })
    );
  }
}
