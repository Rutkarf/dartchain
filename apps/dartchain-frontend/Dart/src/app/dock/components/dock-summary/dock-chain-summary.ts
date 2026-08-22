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

import { COLLAPSED_SUMMARY_BAR_CLASS } from '@core/models/collapsed-summary.model';
import {
  DockChainPhase,
  DockChainStateService,
} from '@core/services/dock-chain-state.service';

@Component({
  selector: 'app-dock-chain-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dock-chain-summary.html',
  styleUrls: ['./dock-chain-summary.css', './dock-summary-shared.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DockChainSummaryComponent implements OnInit, OnDestroy {
  protected readonly state = inject(DockChainStateService);

  @HostBinding(`class.${COLLAPSED_SUMMARY_BAR_CLASS}`)
  readonly collapsedSummaryBar = true;

  @HostBinding('class.dock-summary-bar__content')
  readonly contentClass = true;

  @HostBinding('class.is-chain')
  readonly panelClass = true;

  @HostBinding('class.is-collapsed')
  readonly collapsedClass = true;

  readonly phase = this.state.phase;
  readonly statusLabel = this.state.statusLabel;
  readonly updatedAgeLabel = this.state.updatedAgeLabel;
  readonly blockCount = this.state.blockCount;
  readonly latestBlock = this.state.latestBlock;
  readonly copied = signal(false);

  private copyResetTimer: number | null = null;

  readonly tipIndex = computed(() => this.latestBlock()?.index ?? null);
  readonly tipHash = computed(() => (this.latestBlock()?.hash ?? '').trim());

  readonly tipTitle = computed(() => {
    const index = this.tipIndex();
    const hash = this.tipHash();
    if (index === null || !hash) {
      return '';
    }
    return `TIP #${index} · ${hash}`;
  });

  readonly emptyLabel = computed(() =>
    this.state.error() ? 'Chaîne indisponible' : this.state.loading() ? 'Chargement…' : 'Aucun bloc'
  );

  readonly barAriaLabel = computed(() => {
    const tip = this.tipTitle();
    const age = this.updatedAgeLabel();
    return [this.statusLabel(), tip || this.emptyLabel(), age].filter(Boolean).join(' · ');
  });

  ngOnInit(): void {
    if (this.state.blockCount() === 0 && !this.state.loading()) {
      void this.state.load();
    }
    window.addEventListener('dartchain-refresh-dock', this.onGlobalRefresh);
  }

  ngOnDestroy(): void {
    window.removeEventListener('dartchain-refresh-dock', this.onGlobalRefresh);
    if (this.copyResetTimer !== null) {
      window.clearTimeout(this.copyResetTimer);
    }
  }

  private onGlobalRefresh = (): void => {
    this.state.refresh(true);
  };

  statusClass(phase: DockChainPhase): string {
    const map: Record<DockChainPhase, string> = {
      error: 'error',
      loading: 'loading',
      empty: 'empty',
      synced: 'synced',
    };
    return `dock-summary-status--${map[phase]}`;
  }

  onOpenTip(event: Event): void {
    event.stopPropagation();
    const block = this.latestBlock();
    if (!block) {
      return;
    }
    window.dispatchEvent(new CustomEvent('open-block-drawer', { detail: { block } }));
  }

  onCopyHash(event: Event): void {
    event.stopPropagation();
    const hash = this.tipHash();
    if (!hash || typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      return;
    }
    void navigator.clipboard.writeText(hash).then(() => {
      this.copied.set(true);
      if (this.copyResetTimer !== null) {
        window.clearTimeout(this.copyResetTimer);
      }
      this.copyResetTimer = window.setTimeout(() => {
        this.copied.set(false);
        this.copyResetTimer = null;
      }, 1200);
    });
  }
}
