import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  computed,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { COLLAPSED_SUMMARY_BAR_CLASS } from '../../core/models/collapsed-summary.model';
import {
  ShowcaseTerminalMode,
  ShowcaseTerminalPhase,
  ShowcaseTerminalStateService,
} from '../../core/services/showcase-terminal-state.service';

@Component({
  selector: 'app-showcase-terminal-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './showcase-terminal-summary.html',
  styleUrls: [
    './showcase-terminal-summary.css',
    '../dock-summary/dock-summary-shared.css',
    './showcase-terminal-reseau.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShowcaseTerminalSummaryComponent implements OnInit, OnChanges, OnDestroy {
  protected readonly state = inject(ShowcaseTerminalStateService);

  @Input({ required: true }) mode: ShowcaseTerminalMode = 'reseau';

  @HostBinding('class')
  readonly hostClasses = `${COLLAPSED_SUMMARY_BAR_CLASS} showcase-terminal-summary__content`;

  @HostBinding('class.is-collapsed')
  readonly isCollapsedClass = true;

  @HostBinding('attr.data-terminal-mode')
  get terminalModeAttr(): ShowcaseTerminalMode {
    return this.mode;
  }

  readonly phase = this.state.phase;
  readonly statusLabel = this.state.statusLabel;
  readonly headline = this.state.headline;
  readonly progressLabel = this.state.progressLabel;
  readonly updatedAgeLabel = this.state.updatedAgeLabel;
  readonly loading = this.state.loading;

  readonly collapsedStatusValue = computed(() => {
    const connected = this.state.connectedCount();
    if (connected > 0) {
      return String(connected);
    }

    const blocks = this.state.blocks();
    return blocks > 0 ? String(blocks) : '0';
  });

  readonly peersCollapsedHeadline = this.state.peersCollapsedHeadline;
  readonly peersLedActive = this.state.peersLedActive;

  ngOnInit(): void {
    this.state.setMode(this.mode);
    void this.state.load();
    window.addEventListener('naivechain-refresh', this.onGlobalRefresh);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['mode'] && !changes['mode'].firstChange) {
      this.state.setMode(this.mode);
      void this.state.load();
    }
  }

  ngOnDestroy(): void {
    window.removeEventListener('naivechain-refresh', this.onGlobalRefresh);
  }

  private onGlobalRefresh = (): void => {
    this.state.refresh();
  };

  statusClass(phase: ShowcaseTerminalPhase): string {
    const map: Record<ShowcaseTerminalPhase, string> = {
      error: 'error',
      loading: 'busy',
      empty: 'empty',
      ready: 'ready',
      sync: 'synced',
    };
    return `dock-summary-status--${map[phase]}`;
  }

  panelLabel(): string {
    return this.mode === 'peers' ? 'PEERS' : 'RÉSEAU';
  }

  onRefresh(event: Event): void {
    event.stopPropagation();
    this.state.refresh();
  }
}
