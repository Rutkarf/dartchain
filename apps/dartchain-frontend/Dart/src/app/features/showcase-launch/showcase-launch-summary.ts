import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostBinding,
  OnDestroy,
  OnInit,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { LaunchProject, LaunchStatus } from '../../core/models/showcase.model';
import { COLLAPSED_SUMMARY_BAR_CLASS } from '../../core/models/collapsed-summary.model';
import {
  EXCHANGE_NATIVE_TOKEN,
  defaultLaunchCounterToken,
  isExchangeNativeToken,
  isLaunchpadSwapToken,
} from '../../core/constants/exchange-launchpad.constants';
import { BrandCryptoSelectionService } from '../../core/services/brand-crypto-selection.service';
import { ShowcaseLaunchStateService } from '../../core/services/showcase-launch-state.service';

@Component({
  selector: 'app-showcase-launch-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './showcase-launch-summary.html',
  styleUrls: ['./showcase-launch-summary.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShowcaseLaunchSummaryComponent implements OnInit, OnDestroy {
  private static readonly CAROUSEL_MS = 5000;

  protected readonly launchState = inject(ShowcaseLaunchStateService);
  private readonly brandCrypto = inject(BrandCryptoSelectionService);

  @Output() readonly refreshClick = new EventEmitter<void>();

  @HostBinding(`class.${COLLAPSED_SUMMARY_BAR_CLASS}`)
  readonly collapsedSummaryBar = true;

  @HostBinding('class.launch-summary-bar__content')
  readonly contentClass = true;

  @HostBinding('class.is-launch')
  readonly isLaunchClass = true;

  @HostBinding('class.is-collapsed')
  readonly isCollapsedClass = true;

  readonly loading = this.launchState.loading;

  readonly carouselIndex = signal(0);
  readonly carouselAnimating = signal(false);

  private carouselTimer: number | null = null;
  private animationTimer: number | null = null;

  readonly carouselProjects = computed(() => this.launchState.collapsedTickerProjects());

  readonly carouselProject = computed(() => {
    const projects = this.carouselProjects();
    if (projects.length === 0) {
      return null;
    }
    const index = this.carouselIndex() % projects.length;
    return projects[index] ?? projects[0];
  });

  ngOnInit(): void {
    if (this.launchState.projects().length === 0 && !this.launchState.loading()) {
      this.launchState.loadProjects();
    }
    this.startCarousel();
  }

  ngOnDestroy(): void {
    this.stopCarousel();
    if (this.animationTimer !== null) {
      window.clearTimeout(this.animationTimer);
    }
  }

  statusLabel(status: LaunchStatus): string {
    switch (status) {
      case 'LIVE':
        return 'LIVE';
      case 'ENDED':
        return 'ENDED';
      default:
        return 'SOON';
    }
  }

  isSoon(status: LaunchStatus): boolean {
    return status === 'SOON';
  }

  isEnded(status: LaunchStatus): boolean {
    return status === 'ENDED';
  }

  marketCapLabel(project: LaunchProject): string {
    return this.launchState.marketCapLabel(project);
  }

  projectDisplayName(project: LaunchProject): string {
    return project.name?.trim() || project.symbol?.trim() || 'Projet';
  }

  hasWhitepaper(project: LaunchProject): boolean {
    return Boolean(project.whitepaperUrl?.trim());
  }

  whitepaperAriaLabel(project: LaunchProject): string {
    return this.hasWhitepaper(project)
      ? `Ouvrir le whitepaper ${project.symbol}`
      : `Whitepaper indisponible pour ${project.symbol}`;
  }

  openWhitepaper(project: LaunchProject, event: MouseEvent): void {
    event.stopPropagation();
    const url = project.whitepaperUrl?.trim();
    if (!url) {
      return;
    }
    globalThis.open(url, '_blank', 'noopener,noreferrer');
  }

  canSwapProject(project: LaunchProject): boolean {
    if (project.status !== 'LIVE' && project.status !== 'SOON') {
      return false;
    }

    const symbol = project.symbol.trim().toUpperCase();
    return isLaunchpadSwapToken(symbol) || isExchangeNativeToken(symbol);
  }

  swapAriaLabel(project: LaunchProject): string {
    const symbol = project.symbol.trim().toUpperCase();
    if (isExchangeNativeToken(symbol)) {
      const counter = defaultLaunchCounterToken();
      return `Swap R4V3 vers ${counter}`;
    }
    return `Swap R4V3 vers ${symbol}`;
  }

  swapProject(project: LaunchProject, event: Event): void {
    event.stopPropagation();
    event.preventDefault();

    const symbol = project.symbol.trim().toUpperCase();
    if (!symbol || !this.canSwapProject(project)) {
      return;
    }

    if (isLaunchpadSwapToken(symbol)) {
      this.brandCrypto.selectLaunchToken(symbol);
      this.launchState.successMessage.set(`Swap R4V3 → ${symbol}`);
    } else if (isExchangeNativeToken(symbol)) {
      const counter = defaultLaunchCounterToken();
      this.brandCrypto.requestExchangeTrade(EXCHANGE_NATIVE_TOKEN, counter);
      this.brandCrypto.select(EXCHANGE_NATIVE_TOKEN);
      this.launchState.successMessage.set(`Swap R4V3 → ${counter}`);
    } else {
      return;
    }

    globalThis.dispatchEvent(new CustomEvent('exchange-panel-open'));
    globalThis.document.querySelector('.app-hub-swap-stack')?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });
    globalThis.dispatchEvent(new CustomEvent('exchange-panel-focus'));
  }

  onRefresh(event: Event): void {
    event.stopPropagation();
    this.launchState.requestRefresh();
    this.refreshClick.emit();
  }

  private startCarousel(): void {
    this.stopCarousel();
    this.carouselTimer = window.setInterval(() => {
      const projects = this.carouselProjects();
      if (projects.length <= 1 || this.launchState.collapsedStatusKey() !== 'LIVE') {
        return;
      }

      this.carouselAnimating.set(true);
      if (this.animationTimer !== null) {
        window.clearTimeout(this.animationTimer);
      }
      this.animationTimer = window.setTimeout(() => this.carouselAnimating.set(false), 320);

      this.carouselIndex.update((index) => (index + 1) % projects.length);
    }, ShowcaseLaunchSummaryComponent.CAROUSEL_MS);
  }

  private stopCarousel(): void {
    if (this.carouselTimer !== null) {
      window.clearInterval(this.carouselTimer);
      this.carouselTimer = null;
    }
  }
}
