import { Injectable, inject } from '@angular/core';

import { AuthService } from '../../core/services/auth.service';
import { WalletSessionService } from '../../core/services/wallet-session.service';
import { FloorSessionAdapter } from './floor-session.adapter';

/**
 * Unique import Auth/Wallet du floor — branche l’adapter au démarrage du character.
 */
@Injectable({ providedIn: 'root' })
export class FloorSessionBinder {
  constructor() {
    const adapter = inject(FloorSessionAdapter);
    const auth = inject(AuthService);
    const wallet = inject(WalletSessionService);
    adapter.bind(
      () => auth.user()?.id ?? 'guest',
      () => wallet.requestBalanceRefresh()
    );
  }
}
