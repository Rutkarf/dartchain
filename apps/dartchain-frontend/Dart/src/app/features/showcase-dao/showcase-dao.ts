import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostBinding,
  HostListener,
  Input,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { DaoShowcaseCard, daoStatusLabel } from '../../core/models/showcase-dao.model';
import { AuthService } from '../../core/services/auth.service';
import { R4v3CommunityFaqService } from '../../core/services/r4v3-community-faq.service';
import { ShowcaseDaoStateService } from '../../core/services/showcase-dao-state.service';
import { ShowcaseLaunchStateService } from '../../core/services/showcase-launch-state.service';
import { ShowcaseDaoDrawerComponent } from './showcase-dao-drawer';
import {
  SHOWCASE_REFRESH_EVENT,
  refreshEventMatchesTab,
} from '../../core/constants/panel-refresh.constants';

@Component({
  selector: 'app-showcase-dao',
  standalone: true,
  imports: [CommonModule, ShowcaseDaoDrawerComponent],
  templateUrl: './showcase-dao.html',
  styleUrls: ['./showcase-dao.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShowcaseDaoComponent {
  @Input() isExpanded = true;

  @ViewChild('searchInput')
  private searchInput?: ElementRef<HTMLInputElement>;

  @HostBinding('class.is-dao')
  readonly isDaoHost = true;

  @HostBinding('class.is-expanded')
  get isExpandedClass(): boolean {
    return this.isExpanded;
  }

  @HostBinding('class.is-collapsed')
  get isCollapsedClass(): boolean {
    return !this.isExpanded;
  }

  protected readonly auth = inject(AuthService);
  protected readonly daoState = inject(ShowcaseDaoStateService);
  private readonly launchState = inject(ShowcaseLaunchStateService);
  private readonly community = inject(R4v3CommunityFaqService);

  readonly searchExpanded = signal(false);
  readonly selectedCard = signal<DaoShowcaseCard | null>(null);

  readonly loading = computed(
    () =>
      this.daoState.loading() ||
      this.launchState.loading() ||
      this.community.loading() ||
      this.community.refreshing()
  );

  readonly error = computed(
    () => this.daoState.error() || this.launchState.error() || this.community.error()
  );

  readonly activeCount = this.daoState.activeCount;
  readonly activeCountLabel = this.daoState.activeCountLabel;
  readonly filteredCards = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const list = this.daoState.cards();
    if (!query) {
      return list;
    }
    return list.filter((card) => {
      const haystack = `${card.name} ${card.symbol} ${card.summary} ${card.objective}`.toLowerCase();
      return haystack.includes(query);
    });
  });

  readonly searchQuery = signal('');

  readonly activeSummaryTooltip = computed(() => {
    const count = this.activeCount();
    if (count === 0) {
      return 'Aucune DAO active pour le moment';
    }
    const names = this.daoState
      .activeCards()
      .map((card) => card.symbol)
      .join(', ');
    return `${count} DAO active${count > 1 ? 's' : ''} · ${names}`;
  });

  constructor() {
    if (this.daoState.cards().length === 0 && !this.loading()) {
      this.daoState.load(true);
    }
  }

  protected refreshAriaLabel(): string {
    return this.loading() ? 'Actualisation des DAO…' : 'Actualiser les DAO';
  }

  protected emptyMessage(): string {
    return this.searchQuery().trim()
      ? 'Aucune DAO ne correspond à votre recherche.'
      : 'Aucune DAO disponible pour le moment.';
  }

  protected refresh(): void {
    this.daoState.refresh();
  }

  @HostListener(`window:${SHOWCASE_REFRESH_EVENT}`, ['$event'])
  onShowcaseRefresh(event: Event): void {
    if (refreshEventMatchesTab(event, 'daonews')) {
      this.refresh();
    }
  }

  protected onSearchInput(value: string): void {
    this.searchQuery.set(value);
  }

  protected openSearch(): void {
    this.searchExpanded.set(true);
    queueMicrotask(() => this.searchInput?.nativeElement.focus());
  }

  protected closeSearch(event?: Event): void {
    event?.preventDefault();
    if (this.searchQuery().trim()) {
      return;
    }
    this.searchExpanded.set(false);
  }

  protected clearSearch(): void {
    this.searchQuery.set('');
    this.searchExpanded.set(false);
  }

  protected statusLabel(card: DaoShowcaseCard): string {
    return daoStatusLabel(card.status);
  }

  protected statusShortLabel(card: DaoShowcaseCard): string {
    switch (card.status) {
      case 'active':
        return 'ON';
      case 'closed':
        return 'OFF';
      default:
        return '…';
    }
  }

  protected cardInitials(card: DaoShowcaseCard): string {
    const symbol = card.symbol?.trim() || card.name?.trim() || '?';
    return symbol.slice(0, 2).toUpperCase();
  }

  protected openDao(card: DaoShowcaseCard): void {
    this.daoState.setLastSelectedDao(card);
    this.selectedCard.set(card);
  }

  protected closeDao(): void {
    this.selectedCard.set(null);
  }

  protected statusClass(card: DaoShowcaseCard): string {
    return `showcase-dao__status--${card.status}`;
  }

  protected xpPercent(card: DaoShowcaseCard): number {
    const raw = Math.round((card.membersActive / 40) * 100 + card.proposalsCount * 4);
    return Math.max(8, Math.min(100, raw));
  }
}
