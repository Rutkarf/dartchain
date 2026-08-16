import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  HostListener,
  Input,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { LaunchProject, LaunchStatus } from '../../core/models/showcase.model';
import {
  EXCHANGE_NATIVE_TOKEN,
  defaultLaunchCounterToken,
  isExchangeNativeToken,
  isLaunchpadSwapToken,
} from '../../core/constants/exchange-launchpad.constants';
import { BrandCryptoSelectionService } from '../../core/services/brand-crypto-selection.service';
import { ShowcaseLaunchStateService } from '../../core/services/showcase-launch-state.service';
import { ShowcaseLaunchProjectDrawerComponent } from './showcase-launch-project-drawer';
import {
  SHOWCASE_REFRESH_EVENT,
  refreshEventMatchesTab,
} from '../../core/constants/panel-refresh.constants';

@Component({
  selector: 'app-showcase-launch',
  standalone: true,
  imports: [CommonModule, ShowcaseLaunchProjectDrawerComponent],
  templateUrl: './showcase-launch.html',
  styleUrls: ['./showcase-launch.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShowcaseLaunchComponent {
  @Input() isExpanded = true;

  @HostBinding('class.is-launch')
  readonly isLaunchHost = true;

  @HostBinding('class.is-expanded')
  get isExpandedClass(): boolean {
    return this.isExpanded;
  }

  @HostBinding('class.is-collapsed')
  get isCollapsedClass(): boolean {
    return !this.isExpanded;
  }

  private readonly brandCrypto = inject(BrandCryptoSelectionService);
  protected readonly launchState = inject(ShowcaseLaunchStateService);

  readonly loading = this.launchState.loading;
  readonly error = this.launchState.error;
  readonly successMessage = this.launchState.successMessage;
  readonly projects = this.launchState.projects;
  readonly searchQuery = signal('');
  readonly selectedProject = signal<LaunchProject | null>(null);

  readonly liveCount = computed(() => this.launchState.counts().live);

  readonly liveCountLabel = computed(() => `${this.liveCount()} LIVE`);

  readonly liveSummaryTooltip = computed(() => {
    const live = this.liveCount();
    if (live === 0) {
      return 'Aucun projet live pour le moment';
    }
    const names = this.launchState
      .liveProjects()
      .map((project) => project.symbol)
      .join(', ');
    return `${live} projet${live > 1 ? 's' : ''} live · ${names}`;
  });

  readonly filteredProjects = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const list = this.projects();

    if (!query) {
      return list;
    }

    return list.filter((project) => {
      const name = project.name.toLowerCase();
      const symbol = project.symbol.toLowerCase();
      return name.includes(query) || symbol.includes(query);
    });
  });

  constructor() {
    if (this.launchState.projects().length === 0 && !this.launchState.loading()) {
      this.launchState.loadProjects();
    }
  }

  protected refreshAriaLabel(): string {
    return this.loading() ? 'Actualisation des projets…' : 'Actualiser les projets';
  }

  protected emptyMessage(): string {
    return this.searchQuery().trim()
      ? 'Aucun projet ne correspond à votre recherche.'
      : 'Aucun projet disponible pour le moment.';
  }

  protected openDrawer(): void {
    this.launchState.openLaunchDrawer();
  }

  protected refresh(): void {
    this.launchState.requestRefresh();
  }

  @HostListener(`window:${SHOWCASE_REFRESH_EVENT}`, ['$event'])
  onShowcaseRefresh(event: Event): void {
    if (refreshEventMatchesTab(event, 'dao')) {
      this.refresh();
    }
  }

  protected onSearchInput(value: string): void {
    this.searchQuery.set(value);
  }

  protected clearSearch(): void {
    this.searchQuery.set('');
  }

  protected statusLabel(status: LaunchStatus): string {
    switch (status) {
      case 'LIVE':
        return 'Live';
      case 'ENDED':
        return 'Ended';
      default:
        return 'Soon';
    }
  }

  protected isSoon(status: LaunchStatus): boolean {
    return status === 'SOON';
  }

  protected isEnded(status: LaunchStatus): boolean {
    return status === 'ENDED';
  }

  protected projectInitials(project: LaunchProject): string {
    const symbol = project.symbol?.trim() || project.name?.trim() || '?';
    return symbol.slice(0, 2).toUpperCase();
  }

  protected marketCapLabel(project: LaunchProject): string {
    return this.launchState.marketCapLabel(project);
  }

  protected progressPercent(project: LaunchProject): number | null {
    const raised = this.parseAmount(project.raised);
    const target = this.parseAmount(project.target);
    if (raised === null || target === null || target <= 0) {
      return null;
    }
    return Math.min(100, Math.round((raised / target) * 100));
  }

  private parseAmount(value: string | undefined): number | null {
    if (!value) {
      return null;
    }
    const cleaned = value.replace(/[^\d.kKmM]/g, '').trim();
    if (!cleaned || cleaned === '—' || cleaned === '-') {
      return null;
    }
    const match = cleaned.match(/^([\d.]+)\s*([kKmM])?$/);
    if (!match) {
      const n = Number(cleaned);
      return Number.isFinite(n) ? n : null;
    }
    const base = Number(match[1]);
    if (!Number.isFinite(base)) {
      return null;
    }
    const suffix = match[2]?.toLowerCase();
    if (suffix === 'k') {
      return base * 1_000;
    }
    if (suffix === 'm') {
      return base * 1_000_000;
    }
    return base;
  }

  protected hasWhitepaper(project: LaunchProject): boolean {
    return Boolean(project.whitepaperUrl?.trim());
  }

  protected whitepaperAriaLabel(project: LaunchProject): string {
    return this.hasWhitepaper(project)
      ? `Ouvrir le whitepaper ${project.symbol}`
      : `Whitepaper indisponible pour ${project.symbol}`;
  }

  protected openWhitepaper(project: LaunchProject, event: MouseEvent): void {
    event.stopPropagation();
    const url = project.whitepaperUrl?.trim();
    if (!url) {
      return;
    }
    globalThis.open(url, '_blank', 'noopener,noreferrer');
  }

  protected openProject(project: LaunchProject): void {
    this.selectedProject.set(project);
  }

  protected closeProject(): void {
    this.selectedProject.set(null);
  }

  protected onDrawerSwap(project: LaunchProject): void {
    this.swapProject(project, new Event('click'));
  }

  protected swapProject(project: LaunchProject, event: Event): void {
    event.stopPropagation();
    event.preventDefault();

    const symbol = project.symbol.trim().toUpperCase();
    if (!symbol) {
      return;
    }

    if (isLaunchpadSwapToken(symbol)) {
      this.brandCrypto.selectLaunchToken(symbol);
      this.showSwapFeedback(`Swap R4V3 → ${symbol}`);
    } else if (isExchangeNativeToken(symbol)) {
      const counter = defaultLaunchCounterToken();
      this.brandCrypto.requestExchangeTrade(EXCHANGE_NATIVE_TOKEN, counter);
      this.brandCrypto.select(EXCHANGE_NATIVE_TOKEN);
      this.showSwapFeedback(`Swap R4V3 → ${counter}`);
    } else {
      return;
    }

    this.openExchangePanel();
  }

  protected canSwapProject(project: LaunchProject): boolean {
    if (project.status !== 'LIVE' && project.status !== 'SOON') {
      return false;
    }

    const symbol = project.symbol.trim().toUpperCase();
    return isLaunchpadSwapToken(symbol) || isExchangeNativeToken(symbol);
  }

  protected swapAriaLabel(project: LaunchProject): string {
    const symbol = project.symbol.trim().toUpperCase();
    if (isExchangeNativeToken(symbol)) {
      const counter = defaultLaunchCounterToken();
      return `Swap R4V3 vers ${counter}`;
    }
    return `Swap R4V3 vers ${symbol}`;
  }

  private showSwapFeedback(message: string): void {
    this.launchState.successMessage.set(message);
    window.setTimeout(() => {
      if (this.launchState.successMessage() === message) {
        this.launchState.successMessage.set(null);
      }
    }, 2800);
  }

  private openExchangePanel(): void {
    globalThis.dispatchEvent(new CustomEvent('exchange-panel-open'));
    globalThis.document.querySelector('.app-hub-swap-stack')?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });
    globalThis.dispatchEvent(new CustomEvent('exchange-panel-focus'));
  }
}
