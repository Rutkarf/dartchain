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
  DockChainPhase,
  DockChainStateService,
} from '../../core/services/dock-chain-state.service';

@Component({
  selector: 'app-dock-chain-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dock-chain-summary.html',
  styleUrls: ['./dock-summary-shared.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DockChainSummaryComponent implements OnInit, OnDestroy {
  protected readonly state = inject(DockChainStateService);

  @HostBinding(`class.${COLLAPSED_SUMMARY_BAR_CLASS}`)
  readonly collapsedSummaryBar = true;

  @HostBinding('class.dock-summary-bar__content')
  readonly contentClass = true;

  @HostBinding('class.is-chain')
  readonly panelClass = true;

  @HostBinding('class.is-collapsed')
  readonly collapsedClass = true;

  readonly phase = this.state.phase;
  readonly statusLabel = this.state.statusLabel;
  readonly headline = this.state.headline;
  readonly progressLabel = this.state.progressLabel;
  readonly updatedAgeLabel = this.state.updatedAgeLabel;
  readonly loading = this.state.loading;
  readonly blockCount = this.state.blockCount;

  ngOnInit(): void {
    if (this.state.blockCount() === 0 && !this.state.loading()) {
      void this.state.load();
    }
    window.addEventListener('dartchain-refresh-dock', this.onGlobalRefresh);
  }

  ngOnDestroy(): void {
    window.removeEventListener('dartchain-refresh-dock', this.onGlobalRefresh);
  }

  private onGlobalRefresh = (): void => {
    this.state.refresh(true);
  };

  statusClass(phase: DockChainPhase): string {
    const map: Record<DockChainPhase, string> = {
      error: 'error',
      loading: 'loading',
      empty: 'empty',
      synced: 'synced',
    };
    return `dock-summary-status--${map[phase]}`;
  }

  onRefresh(event: Event): void {
    event.stopPropagation();
    this.state.refresh(true);
  }

  onOpen(event: Event): void {
    event.stopPropagation();
    window.dispatchEvent(
      new CustomEvent('dock-open-panel', { detail: { panel: 'chain' } })
    );
  }
}
