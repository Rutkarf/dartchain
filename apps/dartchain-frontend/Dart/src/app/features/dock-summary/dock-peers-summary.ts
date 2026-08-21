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
import { DockPeersStateService } from '../../core/services/dock-peers-state.service';

@Component({
  selector: 'app-dock-peers-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dock-peers-summary.html',
  styleUrls: ['./dock-peers-summary.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DockPeersSummaryComponent implements OnInit, OnDestroy {
  protected readonly state = inject(DockPeersStateService);

  @HostBinding(`class.${COLLAPSED_SUMMARY_BAR_CLASS}`)
  readonly collapsedSummaryBar = true;

  @HostBinding('class.dock-summary-bar__content')
  readonly contentClass = true;

  @HostBinding('class.is-peers')
  readonly panelClass = true;

  @HostBinding('class.is-collapsed')
  readonly collapsedClass = true;

  readonly peerCount = this.state.peerCount;
  readonly latencyLabel = this.state.latencyLabel;
  readonly loadLabel = this.state.loadLabel;
  readonly primaryPeerName = this.state.primaryPeerName;
  readonly primaryPeerConnectedPeople = this.state.primaryPeerConnectedPeople;

  readonly emptyPeerLabel = computed(() =>
    this.state.error() ? 'Peers indisponibles' : this.state.loading() ? 'Sync…' : 'Aucun peer'
  );

  readonly peerTitle = computed(() => {
    const name = this.primaryPeerName();
    if (!name) {
      return this.emptyPeerLabel();
    }
    return `${name} · ${this.primaryPeerConnectedPeople()} connecté(s)`;
  });

  readonly barAriaLabel = computed(() =>
    [
      `Peers ${this.peerCount()}`,
      `Latence ${this.latencyLabel()}`,
      `Charge ${this.loadLabel()}`,
      this.peerTitle(),
    ].join(' · ')
  );

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
}
