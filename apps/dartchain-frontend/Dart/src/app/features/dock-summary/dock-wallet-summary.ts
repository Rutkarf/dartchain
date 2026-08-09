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
  DockWalletPhase,
  DockWalletStateService,
} from '../../core/services/dock-wallet-state.service';

@Component({
  selector: 'app-dock-wallet-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dock-wallet-summary.html',
  styleUrls: ['./dock-summary-shared.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DockWalletSummaryComponent implements OnInit, OnDestroy {
  protected readonly state = inject(DockWalletStateService);

  @HostBinding(`class.${COLLAPSED_SUMMARY_BAR_CLASS}`)
  readonly collapsedSummaryBar = true;

  @HostBinding('class.dock-summary-bar__content')
  readonly contentClass = true;

  @HostBinding('class.is-wallet')
  readonly panelClass = true;

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
    window.addEventListener('dartchain-refresh-dock', this.onGlobalRefresh);
  }

  ngOnDestroy(): void {
    window.removeEventListener('dartchain-refresh-dock', this.onGlobalRefresh);
  }

  private onGlobalRefresh = (): void => {
    this.state.refresh();
  };

  statusClass(phase: DockWalletPhase): string {
    const map: Record<DockWalletPhase, string> = {
      error: 'error',
      loading: 'loading',
      disconnected: 'disconnected',
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
      new CustomEvent('dock-open-panel', { detail: { panel: 'wallet' } })
    );
  }
}
