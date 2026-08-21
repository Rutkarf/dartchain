import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  OnDestroy,
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
import { openR4v3Whitepaper } from '../../core/utils/r4v3-whitepaper.util';
import { R4V3_HUB_PILLARS } from '../../core/constants/r4v3-hub-pillars.constants';

@Component({
  selector: 'app-showcase-r4v3-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './showcase-r4v3-summary.html',
  styleUrls: ['./showcase-r4v3-summary.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShowcaseR4v3SummaryComponent implements OnInit, OnDestroy {
  private static readonly PILLAR_ROTATION_MS = 5000;
  private static readonly PILLAR_TRANSITION_MS = 320;

  protected readonly state = inject(ShowcaseR4v3StateService);
  private readonly walletState = inject(DockWalletStateService);
  private readonly hubUi = inject(ShowcaseHubUiService);
  private pillarTimer: number | null = null;
  private pillarTransitionTimer: number | null = null;

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
  readonly pegDisplayLabel = this.state.pegDisplayLabel;
  readonly activePillarIndex = signal(0);
  readonly previousPillarLabel = signal('');
  readonly previousPillarDetail = signal('');
  readonly isPillarTransitioning = signal(false);
  readonly pillars = R4V3_HUB_PILLARS;
  readonly activePillar = computed(
    () => this.pillars[this.activePillarIndex() % this.pillars.length] ?? this.pillars[0]
  );

  readonly whitepaperAriaLabel = computed(() => {
    const error = this.whitepaperError();
    if (this.whitepaperLoading()) {
      return 'Téléchargement du white paper…';
    }
    return error ? `White paper — ${error}` : 'Télécharger le white paper R4V3';
  });

  ngOnInit(): void {
    if (this.state.items().length === 0 && !this.state.loading()) {
      this.state.load();
    }
    void this.walletState.load();
    this.startPillarRotation();
  }

  ngOnDestroy(): void {
    if (this.pillarTimer !== null) {
      window.clearInterval(this.pillarTimer);
      this.pillarTimer = null;
    }
    if (this.pillarTransitionTimer !== null) {
      window.clearTimeout(this.pillarTransitionTimer);
      this.pillarTransitionTimer = null;
    }
  }

  barAriaLabel(): string {
    const pillar = `${this.pillarLabel()}${this.pillarDetail() ? ` · ${this.pillarDetail()}` : ''}`;
    return `1 R4V3 = 1 CHF. ${pillar}. Cliquer pour développer.`;
  }

  pillarLabel(): string {
    return this.activePillar()?.label ?? 'R4V3';
  }

  pillarDetail(): string {
    return this.activePillar()?.detail ?? '';
  }

  onBarClick(event: Event): void {
    const target = event.target as HTMLElement | null;
    if (target?.closest('.r4v3-summary-bar__wp-btn, .r4v3-summary-bar__whitepaper')) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.hubUi.requestExpand();
  }

  onBarKeydown(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
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
    void this.walletState.load();
  }

  private startPillarRotation(): void {
    if (this.pillarTimer !== null || this.pillars.length <= 1) {
      return;
    }
    this.pillarTimer = window.setInterval(() => {
      this.runPillarTransition((this.activePillarIndex() + 1) % this.pillars.length);
    }, ShowcaseR4v3SummaryComponent.PILLAR_ROTATION_MS);
  }

  private runPillarTransition(nextIndex: number): void {
    this.previousPillarLabel.set(this.pillarLabel());
    this.previousPillarDetail.set(this.pillarDetail());
    this.activePillarIndex.set(nextIndex);
    this.isPillarTransitioning.set(true);

    if (this.pillarTransitionTimer !== null) {
      window.clearTimeout(this.pillarTransitionTimer);
    }
    this.pillarTransitionTimer = window.setTimeout(() => {
      this.isPillarTransitioning.set(false);
      this.previousPillarLabel.set('');
      this.previousPillarDetail.set('');
      this.pillarTransitionTimer = null;
    }, ShowcaseR4v3SummaryComponent.PILLAR_TRANSITION_MS);
  }
}
