import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { BlockchainApiService } from '../core/services/blockchain-api.service';

interface PeerStats {
  active: number;
  total: number;
}

@Component({
  selector: 'app-navbar-peer-status',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navbar-peer-status.html',
  styleUrl: './navbar-peer-status.css',
})
export class NavbarPeerStatusComponent implements OnInit {
  private readonly api = inject(BlockchainApiService);

  readonly stats = signal<PeerStats>({ active: 0, total: 0 });
  readonly loading = signal(false);
  readonly loadError = signal(false);

  readonly isOnline = computed(() => this.stats().active > 0);

  readonly peersLabel = computed(() => {
    if (this.loading()) {
      return '…/…';
    }

    const { active, total } = this.stats();
    return `${active}/${total}`;
  });

  readonly statusAriaLabel = computed(() => {
    const { active, total } = this.stats();
    const state = this.isOnline() ? 'en ligne' : 'hors ligne';
    return `Peers ${state}, ${active} actifs sur ${total} au total`;
  });

  ngOnInit(): void {
    void this.loadStats();
  }

  refresh(): void {
    void this.loadStats();
  }

  private async loadStats(): Promise<void> {
    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    this.loadError.set(false);

    try {
      const response = await firstValueFrom(this.api.getPeerStats());
      this.stats.set({
        active: this.normalizeCount(response.active),
        total: this.normalizeCount(response.total),
      });
    } catch {
      this.loadError.set(true);
      this.stats.set({ active: 0, total: 0 });
    } finally {
      this.loading.set(false);
    }
  }

  private normalizeCount(value: unknown): number {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed < 0) {
      return 0;
    }

    return Math.floor(parsed);
  }
}
