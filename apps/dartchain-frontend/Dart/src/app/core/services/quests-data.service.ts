import { Injectable, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

import { QuestsPanelService } from '../../features/quests-panel/quests-panel.service';

@Injectable({ providedIn: 'root' })
export class QuestsDataService {
  private static readonly REFRESH_DEBOUNCE_MS = 500;
  private static readonly RATE_LIMIT_BACKOFF_MS = 60_000;
  private static readonly MIN_REFRESH_GAP_MS = 2_000;
  private static readonly AUTO_REFRESH_MS = 45_000;

  private readonly questsService = inject(QuestsPanelService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly rateLimitedUntil = signal(0);

  private refreshTimerId: number | null = null;
  private pollTimerId: number | null = null;
  private refreshInflight: Promise<void> | null = null;
  private lastFetchMs = 0;
  private started = false;

  private readonly onExternalRefresh = (): void => {
    this.scheduleRefresh(true);
  };

  init(): void {
    if (this.started) {
      return;
    }

    this.started = true;
    window.addEventListener('dartchain-refresh-dock', this.onExternalRefresh);
    window.addEventListener('market-swap-complete', this.onExternalRefresh);

    this.pollTimerId = window.setInterval(() => {
      void this.refreshAll(false);
    }, QuestsDataService.AUTO_REFRESH_MS);

    void this.refreshAll(true);
  }

  destroy(): void {
    window.removeEventListener('dartchain-refresh-dock', this.onExternalRefresh);
    window.removeEventListener('market-swap-complete', this.onExternalRefresh);

    if (this.pollTimerId !== null) {
      window.clearInterval(this.pollTimerId);
      this.pollTimerId = null;
    }

    if (this.refreshTimerId !== null) {
      window.clearTimeout(this.refreshTimerId);
      this.refreshTimerId = null;
    }
  }

  scheduleRefresh(force = false): void {
    if (this.refreshTimerId !== null) {
      window.clearTimeout(this.refreshTimerId);
    }

    this.refreshTimerId = window.setTimeout(() => {
      this.refreshTimerId = null;
      void this.refreshAll(force);
    }, QuestsDataService.REFRESH_DEBOUNCE_MS);
  }

  async refreshAll(force = false): Promise<void> {
    if (this.isRateLimited()) {
      this.error.set('rate-limit');
      return;
    }

    const now = Date.now();
    if (!force && now - this.lastFetchMs < QuestsDataService.MIN_REFRESH_GAP_MS) {
      return;
    }

    if (this.refreshInflight && !force) {
      return this.refreshInflight;
    }

    this.loading.set(true);
    this.refreshInflight = (async () => {
      const errors: string[] = [];

      try {
        await this.questsService.loadCatalogAsync().catch((error) => {
          this.handleRateLimit(error);
          errors.push('catalog');
        });

        await this.questsService.syncStateAsync().catch((error) => {
          this.handleRateLimit(error);
          errors.push('state');
        });

        this.lastFetchMs = Date.now();

        if (this.isRateLimited()) {
          this.error.set('rate-limit');
          return;
        }

        if (errors.length === 0) {
          this.error.set(null);
        } else if (errors.length === 2) {
          this.error.set('full');
        } else if (errors.includes('state')) {
          this.error.set('state');
        } else {
          this.error.set('catalog');
        }
      } catch (error) {
        this.handleRateLimit(error);
        if (!this.isRateLimited()) {
          this.error.set('full');
        }
      } finally {
        this.loading.set(false);
        this.refreshInflight = null;
      }
    })();

    return this.refreshInflight;
  }

  rateLimitCountdownLabel(): string | null {
    const until = this.rateLimitedUntil();
    if (until <= Date.now()) {
      return null;
    }

    const seconds = Math.ceil((until - Date.now()) / 1000);
    return `${seconds}s`;
  }

  private isRateLimited(): boolean {
    return Date.now() < this.rateLimitedUntil();
  }

  private handleRateLimit(error: unknown): void {
    if (error instanceof HttpErrorResponse && error.status === 429) {
      this.rateLimitedUntil.set(Date.now() + QuestsDataService.RATE_LIMIT_BACKOFF_MS);
      this.error.set('rate-limit');
    }
  }
}
