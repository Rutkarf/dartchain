import { Injectable, computed, inject, signal } from '@angular/core';

import { formatDockRelativeTime } from '@core/utils/dock-time.util';
import { FaucetRuntimeService, FaucetLedTone } from '@faucet/services/faucet-runtime.service';
import {
  formatSmartbarAmount,
  formatSpacedDecimalDigits,
} from '@faucet/faucet/faucet.util';
import { WalletSessionService } from '@wallet/services/wallet-session.service';

export type DockFaucetPhase =
  | 'error'
  | 'loading'
  | 'disconnected'
  | 'cooldown'
  | 'ready';

@Injectable({ providedIn: 'root' })
export class DockFaucetStateService {
  private readonly runtime = inject(FaucetRuntimeService);
  private readonly walletSession = inject(WalletSessionService);

  readonly loading = signal(false);
  readonly lastUpdatedAt = signal<number | null>(null);

  readonly hasWallet = computed(() => this.walletSession.wallet() !== null);

  readonly phase = computed((): DockFaucetPhase => {
    if (this.runtime.faucetDisabled()) {
      return 'error';
    }
    if (this.runtime.offlineMode()) {
      return 'error';
    }
    if (!this.hasWallet()) {
      return 'disconnected';
    }
    if (!this.runtime.eligible() && this.runtime.cooldownSeconds() > 0) {
      return 'cooldown';
    }
    return this.runtime.eligible() ? 'ready' : 'cooldown';
  });

  readonly statusLabel = computed(() => {
    switch (this.phase()) {
      case 'error':
        return this.runtime.offlineMode() ? 'Hors ligne' : 'Indisponible';
      case 'disconnected':
        return 'Sans wallet';
      case 'ready':
        return 'Disponible';
      default:
        return 'Délai';
    }
  });

  readonly headline = computed(() =>
    formatSmartbarAmount(this.runtime.wholePartDisplay(), this.runtime.decimalDigits())
  );
  readonly wholePart = this.runtime.wholePartDisplay;
  readonly decimalDigitsSpaced = computed(() =>
    formatSpacedDecimalDigits(this.runtime.decimalDigits())
  );

  readonly progressLabel = computed(() => {
    if (this.runtime.cooldownSeconds() > 0) {
      return `Cooldown ${this.runtime.cooldownLabel()}`;
    }

    if (this.runtime.eligible()) {
      return 'Réclamation disponible';
    }

    return '';
  });

  readonly updatedAgeLabel = computed(() =>
    formatDockRelativeTime(this.lastUpdatedAt())
  );

  readonly ledTone = computed((): FaucetLedTone => this.runtime.ledTone());

  refresh(): void {
    this.runtime.refreshPanel();
    this.lastUpdatedAt.set(Date.now());
  }
}
