import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { AuthService } from '@auth/services/auth.service';
import { WalletSessionService } from '@wallet/services/wallet-session.service';
import { FloorSessionAdapter } from './floor-session.adapter';
import { FloorSessionBinder } from './floor-session.binder';

describe('FloorSessionBinder', () => {
  it('branche Auth et Wallet sur l’adapter', () => {
    const refresh = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        FloorSessionAdapter,
        FloorSessionBinder,
        { provide: AuthService, useValue: { user: () => ({ id: 'u1' }) } },
        { provide: WalletSessionService, useValue: { requestBalanceRefresh: refresh } },
      ],
    });
    TestBed.inject(FloorSessionBinder);
    const adapter = TestBed.inject(FloorSessionAdapter);
    expect(adapter.playerId()).toBe('u1');
    adapter.notifyBalanceRefresh();
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
