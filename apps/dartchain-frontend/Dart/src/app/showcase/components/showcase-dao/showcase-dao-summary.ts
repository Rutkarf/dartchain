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

import { DaoShowcaseCard, daoStatusLabel } from '@core/models/showcase-dao.model';
import { COLLAPSED_SUMMARY_BAR_CLASS } from '@core/models/collapsed-summary.model';
import { R4v3CommunityFaqService } from '@core/services/r4v3-community-faq.service';
import { ShowcaseDaoStateService } from '@core/services/showcase-dao-state.service';
import { ShowcaseLaunchStateService } from '@core/services/showcase-launch-state.service';

@Component({
  selector: 'app-showcase-dao-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './showcase-dao-summary.html',
  styleUrls: ['./showcase-dao-summary.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShowcaseDaoSummaryComponent implements OnInit, OnDestroy {
  private static readonly CAROUSEL_MS = 5000;

  protected readonly daoState = inject(ShowcaseDaoStateService);
  private readonly launchState = inject(ShowcaseLaunchStateService);
  private readonly community = inject(R4v3CommunityFaqService);

  @Output() readonly refreshClick = new EventEmitter<void>();

  @HostBinding(`class.${COLLAPSED_SUMMARY_BAR_CLASS}`)
  readonly collapsedSummaryBar = true;

  @HostBinding('class.dao-summary-bar__content')
  readonly contentClass = true;

  @HostBinding('class.is-dao')
  readonly isDaoClass = true;

  @HostBinding('class.is-collapsed')
  readonly isCollapsedClass = true;

  readonly carouselIndex = signal(0);
  readonly carouselAnimating = signal(false);

  private carouselTimer: number | null = null;
  private animationTimer: number | null = null;

  readonly loading = computed(
    () =>
      this.daoState.loading() ||
      this.launchState.loading() ||
      this.community.loading() ||
      this.community.refreshing()
  );

  readonly carouselCards = computed(() => this.daoState.carouselCards());

  readonly carouselCard = computed((): DaoShowcaseCard | null => {
    const cards = this.carouselCards();
    if (cards.length === 0) {
      return null;
    }
    const index = this.carouselIndex() % cards.length;
    return cards[index] ?? cards[0];
  });

  ngOnInit(): void {
    if (this.daoState.cards().length === 0 && !this.loading()) {
      this.daoState.load(true);
    }
    this.startCarousel();
  }

  ngOnDestroy(): void {
    this.stopCarousel();
    if (this.animationTimer !== null) {
      window.clearTimeout(this.animationTimer);
    }
  }

  statusShortLabel(card: DaoShowcaseCard): string {
    switch (card.status) {
      case 'active':
        return 'ON';
      case 'closed':
        return 'OFF';
      default:
        return '…';
    }
  }

  cardStats(card: DaoShowcaseCard): string {
    return `${card.proposalsCount}P · ${card.votesCount}V · ${card.membersActive}M · PWR ${this.daoState.daoPowerPercent(card)}%`;
  }

  cardLineTitle(card: DaoShowcaseCard): string {
    return `${daoStatusLabel(card.status)} · ${card.symbol} · ${card.name} · ${this.cardStats(card)} · ${card.summary}`;
  }

  barAriaLabel(): string {
    const card = this.carouselCard();
    if (card) {
      return this.cardLineTitle(card);
    }

    return 'Résumé gouvernance D.A.O.';
  }

  onRefresh(event: Event): void {
    event.stopPropagation();
    this.daoState.refresh();
    this.refreshClick.emit();
  }

  private startCarousel(): void {
    this.stopCarousel();
    this.carouselTimer = window.setInterval(() => {
      const cards = this.carouselCards();
      if (cards.length <= 1) {
        return;
      }

      this.carouselAnimating.set(true);
      if (this.animationTimer !== null) {
        window.clearTimeout(this.animationTimer);
      }
      this.animationTimer = window.setTimeout(() => this.carouselAnimating.set(false), 320);

      this.carouselIndex.update((index) => (index + 1) % cards.length);
    }, ShowcaseDaoSummaryComponent.CAROUSEL_MS);
  }

  private stopCarousel(): void {
    if (this.carouselTimer !== null) {
      window.clearInterval(this.carouselTimer);
      this.carouselTimer = null;
    }
  }
}
