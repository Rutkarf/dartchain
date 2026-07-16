import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { NewsItem } from '../../core/models/showcase.model';
import { ShowcaseNewsStateService } from '../../core/services/showcase-news-state.service';

@Component({
  selector: 'app-showcase-news-drawer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './showcase-news-drawer.html',
  styleUrls: ['./showcase-news-drawer.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShowcaseNewsDrawerComponent {
  private readonly drawerPanel = viewChild<ElementRef<HTMLElement>>('drawerPanel');
  private readonly newsState = inject(ShowcaseNewsStateService);

  readonly item = input<NewsItem | null>(null);
  readonly loading = input(false);
  readonly canPrev = input(false);
  readonly canNext = input(false);

  readonly closeDrawer = output<void>();
  readonly navigatePrev = output<void>();
  readonly navigateNext = output<void>();
  readonly runAction = output<NewsItem>();
  readonly copySummary = output<NewsItem>();

  constructor() {
    effect(() => {
      if (this.item()) {
        queueMicrotask(() => this.drawerPanel()?.nativeElement.focus());
      }
    });
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
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  protected categoryLabel(category: string): string {
    return this.newsState.categoryLabel(category);
  }
}
