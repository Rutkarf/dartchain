import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostBinding,
  OnInit,
  Output,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { COLLAPSED_SUMMARY_BAR_CLASS } from '../../core/models/collapsed-summary.model';
import { DockWalletStateService } from '../../core/services/dock-wallet-state.service';
import { ShowcaseR4v3StateService } from '../../core/services/showcase-r4v3-state.service';

@Component({
  selector: 'app-showcase-r4v3-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './showcase-r4v3-summary.html',
  styleUrls: ['./showcase-r4v3-summary.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShowcaseR4v3SummaryComponent implements OnInit {
  protected readonly state = inject(ShowcaseR4v3StateService);
  private readonly walletState = inject(DockWalletStateService);

  @Output() readonly refreshClick = new EventEmitter<void>();

  @HostBinding(`class.${COLLAPSED_SUMMARY_BAR_CLASS}`)
  readonly collapsedSummaryBar = true;

  @HostBinding('class.r4v3-summary-bar__content')
  readonly contentClass = true;

  @HostBinding('class.is-r4v3')
  readonly isR4v3Class = true;

  @HostBinding('class.is-collapsed')
  readonly isCollapsedClass = true;

  readonly panel = this.state.panel;
  readonly headline = this.state.headline;
  readonly previewText = this.state.previewText;
  readonly unreadCount = this.state.unreadCount;
  readonly updatedAgeLabel = this.state.updatedAgeLabel;
  readonly loading = this.state.loading;
  readonly walletHeadline = this.walletState.headline;

  ngOnInit(): void {
    if (this.state.items().length === 0 && !this.state.loading()) {
      this.state.load();
    }
    void this.walletState.load();
  }

  onRefresh(event: Event): void {
    event.stopPropagation();
    this.state.load();
    void this.walletState.load();
    this.refreshClick.emit();
  }

  onSwap(event: Event): void {
    event.stopPropagation();
    document.querySelector('.app-market-card--swap')?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });
  }
}
