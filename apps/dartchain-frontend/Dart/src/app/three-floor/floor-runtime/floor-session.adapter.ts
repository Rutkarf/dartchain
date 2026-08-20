import { Injectable } from '@angular/core';

/**
 * Session floor : playerId + refresh wallet UI.
 * DartChain (Auth / Wallet) n’est branché que via FloorSessionBinder.
 */
@Injectable({ providedIn: 'root' })
export class FloorSessionAdapter {
  private playerIdFn: () => string = () => 'guest';
  private refreshFn: () => void = () => undefined;

  bind(playerId: () => string, notifyBalanceRefresh: () => void): void {
    this.playerIdFn = playerId;
    this.refreshFn = notifyBalanceRefresh;
  }

  playerId(): string {
    return this.playerIdFn();
  }

  notifyBalanceRefresh(): void {
    this.refreshFn();
  }
}
