import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { FloorSessionAdapter } from './floor-session.adapter';

describe('FloorSessionAdapter', () => {
  let adapter: FloorSessionAdapter;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [FloorSessionAdapter] });
    adapter = TestBed.inject(FloorSessionAdapter);
  });

  it('retourne guest tant que le binder n’a pas branché Auth', () => {
    expect(adapter.playerId()).toBe('guest');
  });

  it('délègue playerId et refresh après bind', () => {
    const refresh = vi.fn();
    adapter.bind(() => 'user-42', refresh);
    expect(adapter.playerId()).toBe('user-42');
    adapter.notifyBalanceRefresh();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('refresh est un no-op avant bind', () => {
    expect(() => adapter.notifyBalanceRefresh()).not.toThrow();
  });
});
