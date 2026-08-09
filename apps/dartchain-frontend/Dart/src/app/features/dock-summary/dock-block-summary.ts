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
  DockBlockPhase,
  DockBlockStateService,
} from '../../core/services/dock-block-state.service';

@Component({
  selector: 'app-dock-block-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dock-block-summary.html',
  styleUrls: ['./dock-summary-shared.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DockBlockSummaryComponent implements OnInit, OnDestroy {
  protected readonly state = inject(DockBlockStateService);

  @HostBinding(`class.${COLLAPSED_SUMMARY_BAR_CLASS}`)
  readonly collapsedSummaryBar = true;

  @HostBinding('class.dock-summary-bar__content')
  readonly contentClass = true;

  @HostBinding('class.is-block')
  readonly panelClass = true;

  @HostBinding('class.is-collapsed')
  readonly collapsedClass = true;

  readonly phase = this.state.phase;
  readonly statusLabel = this.state.statusLabel;
  readonly headline = this.state.headline;
  readonly progressLabel = this.state.progressLabel;
  readonly updatedAgeLabel = this.state.updatedAgeLabel;
  readonly loading = this.state.loading;
  readonly blockHeight = this.state.blockHeight;

  ngOnInit(): void {
    if (!this.state.latestBlock() && !this.state.loading()) {
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

  statusClass(phase: DockBlockPhase): string {
    return `dock-summary-status--${phase === 'loading' ? 'loading' : phase === 'error' ? 'error' : 'ready'}`;
  }

  onRefresh(event: Event): void {
    event.stopPropagation();
    this.state.refresh(true);
  }

  onCompose(event: Event): void {
    event.stopPropagation();
    window.dispatchEvent(
      new CustomEvent('dock-open-panel', { detail: { panel: 'composer' } })
    );
  }
}
