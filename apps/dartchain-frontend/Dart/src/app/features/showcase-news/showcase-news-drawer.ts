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

  readonly positionLabel = computed(() => {
    const index = this.itemIndex();
    const total = this.itemTotal();
    if (index < 0 || total <= 0) {
      return '';
    }
    return `${index + 1}/${total}`;
  });

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

  protected actionLabel(item: NewsItem): string | null {
    switch (item.actionType) {
      case 'VIEW_BLOCK':
        return 'Voir le bloc';
      case 'VIEW_PENDING':
        return 'Voir les pending';
      case 'OPEN_PENDING':
        return 'Voir les pending';
      case 'OPEN_PEERS':
        return 'Ouvrir Peers';
      case 'OPEN_FAUCET':
        return 'Ouvrir Faucet';
      case 'OPEN_SWAP':
        return 'Ouvrir Swap';
      case 'OPEN_WALLET':
        return 'Ouvrir Wallet';
      default:
        return null;
    }
  }

  protected formatPublishedAt(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  protected categoryLabel(category: string): string {
    return this.newsState.categoryLabel(category);
  }

  protected categoryIcon(category: string): string {
    return this.newsState.categoryIcon(category);
  }

  protected sourceLabel(source: NewsSource): string {
    switch (source) {
      case 'CHAIN':
        return 'On-chain';
      case 'EDITORIAL':
        return 'Édito';
      default:
        return source;
    }
  }

  protected targetLabel(item: NewsItem): string {
    if (!item.actionTarget) {
      return '—';
    }

    switch (item.actionType) {
      case 'VIEW_BLOCK':
        return `Bloc #${item.actionTarget}`;
      default:
        return item.actionTarget;
    }
  }

  protected summaryText(item: NewsItem): string {
    return item.summary?.trim() || item.body?.trim() || 'Aucun résumé disponible.';
  }

  protected showDetailSection(item: NewsItem): boolean {
    const summary = item.summary?.trim() ?? '';
    const body = item.body?.trim() ?? '';
    return body.length > 0 && body !== summary;
  }

  protected copyButtonLabel(): string {
    if (this.copied()) {
      return 'Copié ✓';
    }
    if (this.copyFailed()) {
      return 'Échec';
    }
    return 'Copier';
  }

  protected async onCopy(news: NewsItem, event: Event): Promise<void> {
    event.stopPropagation();

    const text = buildNewsCopyText(news);
    const ok = await copyTextToClipboard(text);

    if (this.copyResetTimer !== null) {
      window.clearTimeout(this.copyResetTimer);
      this.copyResetTimer = null;
    }

    if (ok) {
      this.copied.set(true);
      this.copyFailed.set(false);
      this.copySummary.emit(news);
      this.copyResetTimer = window.setTimeout(() => {
        this.copied.set(false);
        this.copyResetTimer = null;
      }, 2_000);
      return;
    }

    this.copied.set(false);
    this.copyFailed.set(true);
    this.copyResetTimer = window.setTimeout(() => {
      this.copyFailed.set(false);
      this.copyResetTimer = null;
    }, 2_000);
  }
}
