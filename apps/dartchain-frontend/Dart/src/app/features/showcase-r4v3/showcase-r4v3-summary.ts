import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostBinding,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  viewChild,
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
export class ShowcaseR4v3SummaryComponent implements OnInit, AfterViewInit {
  protected readonly state = inject(ShowcaseR4v3StateService);
  protected readonly community = inject(R4v3CommunityFaqService);
  private readonly walletState = inject(DockWalletStateService);
  private readonly hubUi = inject(ShowcaseHubUiService);

  private readonly tickerViewport = viewChild<ElementRef<HTMLElement>>('tickerViewport');
  private dragStartX = 0;
  private dragStartScroll = 0;
  private dragMoved = false;
  private dragPointerId: number | null = null;

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
  readonly tickerOverflow = signal(false);
  readonly tickerDragging = signal(false);

  readonly panel = this.state.panel;
  readonly refreshing = this.state.refreshing;
  readonly refreshPulse = this.state.refreshPulse;
  readonly systemStatus = this.state.systemStatus;
  readonly pegDisplayLabel = this.state.pegDisplayLabel;
  readonly tickerQuestion = this.community.latestTicker;

  readonly tickerAriaLabel = computed(() => {
    const question = this.tickerQuestion();
    if (!question) {
      return 'Aucune question communautaire';
    }
    return `Question communautaire : ${question.title}. Cliquer pour ouvrir le détail.`;
  });

  readonly whitepaperAriaLabel = computed(() => {
    const error = this.whitepaperError();
    if (this.whitepaperLoading()) {
      return 'Ouverture du white paper…';
    }
    return error ? `White paper — ${error}` : 'Ouvrir le white paper R4V3';
  });

  constructor() {
    effect(() => {
      this.tickerQuestion();
      queueMicrotask(() => this.syncTickerScroll());
    });
  }

  ngOnInit(): void {
    if (this.state.items().length === 0 && !this.state.loading()) {
      this.state.load();
    }
    if (this.community.questions().length === 0 && !this.community.loading()) {
      this.community.load(false);
    } else {
      this.community.refreshTickerQuestion();
    }
    void this.walletState.load();
  }

  ngAfterViewInit(): void {
    this.syncTickerScroll();
  }

  barAriaLabel(): string {
    const ticker = this.tickerQuestion();
    const status = this.systemStatusLabel(this.systemStatus());
    const questionPart = ticker ? `Question : ${ticker.title}. ` : '';
    return `${this.pegDisplayLabel()}. ${questionPart}${status}. Cliquer pour développer.`;
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
      target?.closest(
        '.r4v3-summary-bar__refresh, .r4v3-summary-bar__whitepaper, .r4v3-summary-bar__ticker'
      )
    ) {
      return;
    }
    this.hubUi.requestExpand();
  }

  onBarKeydown(event: Event): void {
    event.preventDefault();
    this.hubUi.requestExpand();
  }

  onTickerClick(event: Event): void {
    event.stopPropagation();
    event.preventDefault();

    if (this.dragMoved) {
      this.dragMoved = false;
      return;
    }

    const question = this.tickerQuestion();
    if (!question) {
      return;
    }

    this.hubUi.requestOpenCommunityQuestion(question.id);
  }

  onTickerPointerDown(event: PointerEvent): void {
    const viewport = this.tickerViewport()?.nativeElement;
    if (!viewport || !this.tickerOverflow()) {
      return;
    }

    event.stopPropagation();
    this.dragMoved = false;
    this.dragPointerId = event.pointerId;
    this.dragStartX = event.clientX;
    this.dragStartScroll = viewport.scrollLeft;
    this.tickerDragging.set(true);
    viewport.setPointerCapture(event.pointerId);

    const onMove = (moveEvent: PointerEvent): void => {
      if (moveEvent.pointerId !== this.dragPointerId) {
        return;
      }

      const delta = moveEvent.clientX - this.dragStartX;
      if (Math.abs(delta) > 4) {
        this.dragMoved = true;
      }

      viewport.scrollLeft = this.dragStartScroll - delta;
    };

    const onUp = (upEvent: PointerEvent): void => {
      if (upEvent.pointerId !== this.dragPointerId) {
        return;
      }

      viewport.releasePointerCapture(upEvent.pointerId);
      this.tickerDragging.set(false);
      this.dragPointerId = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
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

  private syncTickerScroll(): void {
    const viewport = this.tickerViewport()?.nativeElement;
    if (!viewport) {
      this.tickerOverflow.set(false);
      return;
    }

    const overflow = viewport.scrollWidth > viewport.clientWidth + 1;
    this.tickerOverflow.set(overflow);

    if (!overflow) {
      viewport.scrollLeft = 0;
      return;
    }

    const centered = Math.max(0, (viewport.scrollWidth - viewport.clientWidth) / 2);
    viewport.scrollLeft = centered;
  }
}
