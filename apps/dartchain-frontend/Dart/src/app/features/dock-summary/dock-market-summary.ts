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
import { MarketDataService } from '../../core/services/market-data.service';
import { MarketAssetRow } from '../market-panel/market-panel.model';
import {
  DOCK_REFRESH_EVENT,
  SHOWCASE_REFRESH_EVENT,
} from '../../core/constants/panel-refresh.constants';

@Component({
  selector: 'app-dock-market-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dock-market-summary.html',
  styleUrls: ['./dock-market-summary.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DockMarketSummaryComponent implements OnInit, OnDestroy {
  private static readonly CAROUSEL_MS = 5000;

  private readonly marketData = inject(MarketDataService);

  @HostBinding('class')
  readonly hostClasses = `${COLLAPSED_SUMMARY_BAR_CLASS} dock-summary-bar__content is-market`;

  @HostBinding('class.is-collapsed')
  readonly collapsedClass = true;

  readonly carouselIndex = signal(0);
  readonly carouselAnimating = signal(false);

  private carouselTimer: number | null = null;
  private animationTimer: number | null = null;

  readonly loading = this.marketData.loadingRows;
  readonly error = computed(() => Boolean(this.marketData.error()));

  readonly carouselRows = computed(() => this.marketData.rows());

  readonly carouselRow = computed((): MarketAssetRow | null => {
    const rows = this.carouselRows();
    if (rows.length === 0) {
      return null;
    }
    const index = this.carouselIndex() % rows.length;
    return rows[index] ?? rows[0];
  });

  ngOnInit(): void {
    this.marketData.init();
    if (this.marketData.rows().length === 0) {
      void this.marketData.refreshRows(false);
    }
    this.startCarousel();
    window.addEventListener(DOCK_REFRESH_EVENT, this.onGlobalRefresh);
    window.addEventListener(SHOWCASE_REFRESH_EVENT, this.onGlobalRefresh);
  }

  ngOnDestroy(): void {
    this.stopCarousel();
    if (this.animationTimer !== null) {
      window.clearTimeout(this.animationTimer);
    }
    window.removeEventListener(DOCK_REFRESH_EVENT, this.onGlobalRefresh);
    window.removeEventListener(SHOWCASE_REFRESH_EVENT, this.onGlobalRefresh);
  }

  formatChange(row: MarketAssetRow): string {
    const sign = row.positive ? '+' : '';
    return `${sign}${row.changePercent.toFixed(1)}%`;
  }

  compactMetric(value: string): string {
    const trimmed = value.trim();
    if (!trimmed || trimmed === '—') {
      return '—';
    }

    return trimmed
      .replace('LaunchLab', 'LL')
      .replace('Peg CHF', 'Peg')
      .replace(/\s*R4V3\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  rowTitle(row: MarketAssetRow): string {
    return [
      row.config.displaySymbol,
      row.config.name,
      row.price,
      this.formatChange(row),
      `Vol ${row.metrics.volumeLabel}`,
      `Liq ${row.metrics.liquidityLabel}`,
      `Cap ${row.metrics.marketCapLabel}`,
    ].join(' · ');
  }

  barAriaLabel(): string {
    const row = this.carouselRow();
    if (row) {
      return this.rowTitle(row);
    }
    return 'Résumé marché';
  }

  private onGlobalRefresh = (): void => {
    void this.marketData.refreshRows(true);
  };

  private startCarousel(): void {
    this.stopCarousel();
    this.carouselTimer = window.setInterval(() => {
      const rows = this.carouselRows();
      if (rows.length <= 1) {
        return;
      }

      this.carouselAnimating.set(true);
      if (this.animationTimer !== null) {
        window.clearTimeout(this.animationTimer);
      }
      this.animationTimer = window.setTimeout(() => this.carouselAnimating.set(false), 320);

      this.carouselIndex.update((index) => (index + 1) % rows.length);
    }, DockMarketSummaryComponent.CAROUSEL_MS);
  }

  private stopCarousel(): void {
    if (this.carouselTimer !== null) {
      window.clearInterval(this.carouselTimer);
      this.carouselTimer = null;
    }
  }
}
