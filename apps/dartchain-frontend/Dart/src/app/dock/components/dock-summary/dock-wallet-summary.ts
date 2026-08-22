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

import { COLLAPSED_SUMMARY_BAR_CLASS } from '@core/models/collapsed-summary.model';
import { AuthService } from '@core/services/auth.service';
import { DockNavigationService } from '@core/services/dock-navigation.service';
import { DockWalletStateService } from '@core/services/dock-wallet-state.service';
import { formatR4v3Amount } from '@core/utils/r4v3-amount.util';

@Component({
  selector: 'app-dock-wallet-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dock-wallet-summary.html',
  styleUrls: ['./dock-wallet-summary.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DockWalletSummaryComponent implements OnInit, OnDestroy {
  protected readonly state = inject(DockWalletStateService);
  private readonly dockNav = inject(DockNavigationService);
  private readonly auth = inject(AuthService);

  @HostBinding(`class.${COLLAPSED_SUMMARY_BAR_CLASS}`)
  readonly collapsedSummaryBar = true;

  @HostBinding('class.dock-summary-bar__content')
  readonly contentClass = true;

  @HostBinding('class.is-wallet')
  readonly panelClass = true;

  @HostBinding('class.is-collapsed')
  readonly collapsedClass = true;

  readonly hasWallet = this.state.hasWallet;
  readonly isAuthenticated = this.auth.isAuthenticated;

  /** CTA visible sans wallet ; cliquable uniquement si connecté. */
  readonly showCreateWallet = computed(() => !this.hasWallet());
  readonly canCreateWallet = computed(
    () => this.isAuthenticated() && !this.hasWallet()
  );

  readonly fullBalanceLabel = computed(() => {
    if (!this.hasWallet()) {
      return formatR4v3Amount('0');
    }
    return formatR4v3Amount(this.state.balance() ?? '0');
  });

  /** Conversion CHF (peg pédagogique 1 R4V3 = 1 CHF, même logique que le panel wallet). */
  readonly formattedChfValue = computed(() => {
    const raw = this.hasWallet() ? (this.state.balance() ?? '0') : '0';
    const bal = Number.parseFloat(raw) || 0;
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(bal);
  });

  readonly balanceAriaLabel = computed(
    () => `Solde R4V3 ${this.fullBalanceLabel()} ≈ ${this.formattedChfValue()} CHF`
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

  onSend(event: Event): void {
    event.stopPropagation();
    this.openWalletAndDispatch('send');
  }

  onSwap(event: Event): void {
    event.stopPropagation();
    this.openWalletAndDispatch('swap');
  }

  onReceive(event: Event): void {
    event.stopPropagation();
    this.openWalletAndDispatch('receive');
  }

  onCreateWallet(event: Event): void {
    event.stopPropagation();
    if (!this.canCreateWallet()) {
      this.auth.promptLogin();
      return;
    }
    this.openWalletAndDispatch('create');
  }

  private openWalletAndDispatch(action: 'send' | 'swap' | 'receive' | 'create'): void {
    this.dockNav.requestTab('wallet');
    window.dispatchEvent(new CustomEvent('dock-open-panel', { detail: { panel: 'wallet' } }));
    window.setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent('wallet-panel-action', { detail: { action } })
      );
    }, 0);
  }
}
