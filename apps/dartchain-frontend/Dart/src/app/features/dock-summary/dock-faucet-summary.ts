import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  OnDestroy,
  OnInit,
  computed,
  inject,
} from '@angular/core';

import { COLLAPSED_SUMMARY_BAR_CLASS } from '../../core/models/collapsed-summary.model';
import { DockFaucetStateService } from '../../core/services/dock-faucet-state.service';
import { FaucetRuntimeService } from '../../core/services/faucet-runtime.service';

@Component({
  selector: 'app-dock-faucet-summary',
  standalone: true,
  templateUrl: './dock-faucet-summary.html',
  styleUrls: ['./dock-faucet-summary.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DockFaucetSummaryComponent implements OnInit, OnDestroy {
  protected readonly state = inject(DockFaucetStateService);
  private readonly runtime = inject(FaucetRuntimeService);

  @HostBinding(`class.${COLLAPSED_SUMMARY_BAR_CLASS}`)
  readonly collapsedSummaryBar = true;

  @HostBinding('class.dock-summary-bar__content')
  readonly contentClass = true;

  @HostBinding('class.is-faucet')
  readonly panelClass = true;

  @HostBinding('class.is-collapsed')
  readonly collapsedClass = true;

  readonly headline = this.state.headline;
  readonly claimDisabled = this.runtime.claimDisabled;
  readonly isCooling = computed(
    () => !this.runtime.eligible() && this.runtime.cooldownSeconds() > 0
  );
  readonly barAriaLabel = computed(() => `Faucet ${this.headline()}`);

  ngOnInit(): void {
    window.addEventListener('dartchain-refresh-dock', this.onGlobalRefresh);
  }

  ngOnDestroy(): void {
    window.removeEventListener('dartchain-refresh-dock', this.onGlobalRefresh);
  }

  private onGlobalRefresh = (): void => {
    this.state.refresh();
  };

  onClaim(event: Event): void {
    event.stopPropagation();
    this.runtime.claim();
  }
}
