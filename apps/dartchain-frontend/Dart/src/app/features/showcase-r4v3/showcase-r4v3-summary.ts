import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { COLLAPSED_SUMMARY_BAR_CLASS } from '../../core/models/collapsed-summary.model';
import { DockWalletStateService } from '../../core/services/dock-wallet-state.service';
import { ShowcaseHubUiService } from '../../core/services/showcase-hub-ui.service';
import { ShowcaseR4v3StateService } from '../../core/services/showcase-r4v3-state.service';
import { R4v3CommunityFaqService } from '../../core/services/r4v3-community-faq.service';
import { openR4v3Whitepaper } from '../../core/utils/r4v3-whitepaper.util';
import { R4v3SystemStatus } from '../../core/models/r4v3-hub.model';

@Component({
  selector: 'app-showcase-r4v3-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './showcase-r4v3-summary.html',
  styleUrls: ['./showcase-r4v3-summary.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShowcaseR4v3SummaryComponent implements OnInit {
  protected readonly state = inject(ShowcaseR4v3StateService);
  protected readonly community = inject(R4v3CommunityFaqService);
  private readonly walletState = inject(DockWalletStateService);
  private readonly hubUi = inject(ShowcaseHubUiService);

  @HostBinding(`class.${COLLAPSED_SUMMARY_BAR_CLASS}`)
  readonly collapsedSummaryBar = true;

  @HostBinding('class.r4v3-summary-bar__host')
  readonly hostClass = true;

  @HostBinding('class.is-r4v3')
  readonly isR4v3Class = true;

  @HostBinding('class.is-collapsed')
  readonly isCollapsedClass = true;

  readonly whitepaperLoading = signal(false);
  readonly whitepaperError = signal('');

  readonly panel = this.state.panel;
  readonly refreshing = this.state.refreshing;
  readonly refreshPulse = this.state.refreshPulse;
  readonly systemStatus = this.state.systemStatus;
  readonly pegDisplayLabel = this.state.pegDisplayLabel;
  readonly tickerQuestion = this.community.latestTicker;

  readonly whitepaperAriaLabel = computed(() => {
    const error = this.whitepaperError();
    if (this.whitepaperLoading()) {
      return 'Ouverture du white paper…';
    }
    return error ? `White paper — ${error}` : 'Ouvrir le white paper R4V3';
  });

  ngOnInit(): void {
    if (this.state.items().length === 0 && !this.state.loading()) {
      this.state.load();
    }
    if (this.community.questions().length === 0 && !this.community.loading()) {
      this.community.load(false);
    } else {
      this.community.refreshLatestTicker();
    }
    void this.walletState.load();
  }

  barAriaLabel(): string {
    const ticker = this.tickerQuestion();
    const status = this.systemStatusLabel(this.systemStatus());
    const questionPart = ticker ? `Dernière question : ${ticker.title}. ` : '';
    return `${this.pegDisplayLabel()}. ${questionPart}${status}. Cliquer pour développer.`;
  }

  tickerNeedsScroll(title: string): boolean {
    return title.trim().length > 48;
  }

  systemStatusLabel(status: R4v3SystemStatus): string {
    switch (status) {
      case 'ok':
        return 'Opérationnel';
      case 'degraded':
        return 'Dégradé';
      case 'incident':
        return 'Incident';
    }
  }

  systemStatusClass(status: R4v3SystemStatus): string {
    return `r4v3-summary-bar__led--${status}`;
  }

  headerBusy(): boolean {
    return this.state.loading() || this.state.refreshing() || this.community.refreshing();
  }

  onBarClick(event: Event): void {
    const target = event.target as HTMLElement | null;
    if (
      target?.closest('.r4v3-summary-bar__refresh, .r4v3-summary-bar__swap, .r4v3-summary-bar__whitepaper')
    ) {
      return;
    }
    this.hubUi.requestExpand();
  }

  onBarKeydown(event: Event): void {
    event.preventDefault();
    this.hubUi.requestExpand();
  }

  async onWhitepaper(event: Event): Promise<void> {
    event.stopPropagation();
    event.preventDefault();

    if (this.whitepaperLoading()) {
      return;
    }

    this.whitepaperLoading.set(true);
    this.whitepaperError.set('');

    const result = await openR4v3Whitepaper();
    this.whitepaperLoading.set(false);

    if (!result.ok) {
      this.whitepaperError.set(result.message ?? 'Indisponible');
      window.setTimeout(() => this.whitepaperError.set(''), 4_000);
    }
  }

  onRefresh(event: Event): void {
    event.stopPropagation();
    this.state.refresh();
    this.community.load(false);
    void this.walletState.load();
  }

  onSwap(event: Event): void {
    event.stopPropagation();
    this.hubUi.requestExpandR4v3Swap();
  }
}
