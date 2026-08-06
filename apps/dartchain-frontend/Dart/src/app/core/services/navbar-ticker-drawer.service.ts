import { Injectable, computed, inject, signal } from '@angular/core';

import {
  NavbarTickerSegment,
  NavbarTickerStateService,
} from './navbar-ticker-state.service';
import { ShellFeedbackService } from './shell-feedback.service';

@Injectable({ providedIn: 'root' })
export class NavbarTickerDrawerService {
  private readonly ticker = inject(NavbarTickerStateService);
  private readonly shell = inject(ShellFeedbackService);

  readonly open = signal(false);
  readonly activeSegmentId = signal<string | null>(null);

  readonly activeSegment = computed((): NavbarTickerSegment | null => {
    const id = this.activeSegmentId();
    if (!id) return null;
    return this.ticker.segments().find((segment) => segment.id === id) ?? null;
  });

  show(segmentId: string): void {
    const exists = this.ticker.segments().some((segment) => segment.id === segmentId);
    if (!exists) return;
    this.shell.closeNavbarDrawers('ticker');
    this.activeSegmentId.set(segmentId);
    this.open.set(true);
  }

  close(): void {
    this.open.set(false);
    this.activeSegmentId.set(null);
  }
}
