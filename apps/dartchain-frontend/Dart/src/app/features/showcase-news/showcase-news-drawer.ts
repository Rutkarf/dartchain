import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { NewsItem, NewsSource } from '../../core/models/showcase.model';
import { FocusTrapDirective } from '../../core/directives/focus-trap.directive';
import { ShowcaseNewsStateService } from '../../core/services/showcase-news-state.service';
import { buildNewsCopyText, copyTextToClipboard } from '../../core/utils/clipboard.util';
import {
  formatNewsDisplayTitle,
  newsCategoryAbbrev,
  normalizeNewsCategorySlug,
} from './showcase-news-display.util';
import {
  NewsDrawerField,
  buildNewsDrawerFields,
  drawerSourceLabel,
} from './showcase-news-drawer.fields.util';

@Component({
  selector: 'app-showcase-news-drawer',
  standalone: true,
  imports: [CommonModule, FocusTrapDirective],
  templateUrl: './showcase-news-drawer.html',
  styleUrls: ['./showcase-news-drawer.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShowcaseNewsDrawerComponent implements OnDestroy {
  private readonly drawerPanel = viewChild<ElementRef<HTMLElement>>('drawerPanel');
  private readonly newsState = inject(ShowcaseNewsStateService);

  private copyResetTimer: number | null = null;

  readonly copied = signal(false);
  readonly copyFailed = signal(false);

  readonly item = input<NewsItem | null>(null);
  readonly loading = input(false);
  readonly canPrev = input(false);
  readonly canNext = input(false);
  readonly itemIndex = input(-1);
  readonly itemTotal = input(0);

  readonly closeDrawer = output<void>();
  readonly navigatePrev = output<void>();
  readonly navigateNext = output<void>();
  readonly runAction = output<NewsItem>();
  readonly copySummary = output<NewsItem>();

  readonly skeletonRows = [1, 2, 3, 4, 5, 6, 7, 8];

  readonly positionLabel = computed(() => {
    const index = this.itemIndex();
    const total = this.itemTotal();
    if (index < 0 || total <= 0) {
      return '';
    }
    return `${index + 1}/${total}`;
  });

  readonly drawerFields = computed(() => {
    const news = this.item();
    if (!news) {
      return [] as NewsDrawerField[];
    }
    return buildNewsDrawerFields(news);
  });

  readonly metaFields = computed(() =>
    this.drawerFields().filter((field) => field.section === 'meta')
  );

  readonly contentFields = computed(() =>
    this.drawerFields().filter((field) => field.section === 'content')
  );

  constructor() {
    effect(() => {
      if (this.item()) {
        this.copied.set(false);
        this.copyFailed.set(false);
        queueMicrotask(() => this.drawerPanel()?.nativeElement.focus());
      }
    });
  }

  ngOnDestroy(): void {
    if (this.copyResetTimer !== null) {
      window.clearTimeout(this.copyResetTimer);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.item()) {
      this.closeDrawer.emit();
    }
  }

  @HostListener('document:keydown.arrowleft')
  onArrowLeft(): void {
    if (this.item() && this.canPrev()) {
      this.navigatePrev.emit();
    }
  }

  @HostListener('document:keydown.arrowright')
  onArrowRight(): void {
    if (this.item() && this.canNext()) {
      this.navigateNext.emit();
    }
  }

  protected dismiss(): void {
    this.closeDrawer.emit();
  }

  protected drawerTitle(item: NewsItem): string {
    return formatNewsDisplayTitle(item);
  }

  protected categorySlug(category: string): string {
    return normalizeNewsCategorySlug(category);
  }

  protected categoryAbbrev(item: NewsItem): string {
    return newsCategoryAbbrev(item.category, item.source);
  }

  protected categoryLabel(category: string): string {
    return this.newsState.categoryLabel(category);
  }

  protected sourceLabel(source: NewsSource): string {
    return drawerSourceLabel(source);
  }

  protected actionLabel(item: NewsItem): string | null {
    switch (item.actionType) {
      case 'VIEW_BLOCK':
        return 'Voir bloc';
      case 'VIEW_PENDING':
      case 'OPEN_PENDING':
        return 'Pending';
      case 'OPEN_PEERS':
        return 'Peers';
      case 'OPEN_FAUCET':
        return 'Faucet';
      case 'OPEN_SWAP':
        return 'Swap';
      case 'OPEN_WALLET':
        return 'Wallet';
      default:
        return null;
    }
  }

  protected copyButtonLabel(): string {
    if (this.copied()) {
      return 'Copié';
    }
    if (this.copyFailed()) {
      return 'Échec';
    }
    return 'Copier';
  }

  protected async onCopy(news: NewsItem, event: Event): Promise<void> {
    event.stopPropagation();
    const text = buildNewsCopyText(news);
    const ok = await this.copyPlainText(text);
    if (ok) {
      this.copySummary.emit(news);
    }
  }

  private async copyPlainText(text: string): Promise<boolean> {
    const ok = await copyTextToClipboard(text);

    if (this.copyResetTimer !== null) {
      window.clearTimeout(this.copyResetTimer);
      this.copyResetTimer = null;
    }

    if (ok) {
      this.copied.set(true);
      this.copyFailed.set(false);
      this.copyResetTimer = window.setTimeout(() => {
        this.copied.set(false);
        this.copyResetTimer = null;
      }, 2_000);
      return true;
    }

    this.copied.set(false);
    this.copyFailed.set(true);
    this.copyResetTimer = window.setTimeout(() => {
      this.copyFailed.set(false);
      this.copyResetTimer = null;
    }, 2_000);
    return false;
  }
}
