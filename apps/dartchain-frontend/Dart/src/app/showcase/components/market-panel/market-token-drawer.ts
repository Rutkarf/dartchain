import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';

import { FocusTrapDirective } from '@core/directives/focus-trap.directive';
import { BlockchainApiService } from '@core/services/blockchain-api.service';
import { AuthService } from '@core/services/auth.service';
import { WalletSessionService } from '@core/services/wallet-session.service';
import { EXCHANGE_NATIVE_TOKEN } from '@core/constants/exchange-launchpad.constants';
import { MarketAssetRow, MarketRecentTrade } from './market-panel.model';

@Component({
  selector: 'app-market-token-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule, FocusTrapDirective],
  templateUrl: './market-token-drawer.html',
  styleUrls: ['./market-token-drawer.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketTokenDrawerComponent {
  private readonly api = inject(BlockchainApiService);
  private readonly auth = inject(AuthService);
  private readonly walletSession = inject(WalletSessionService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly drawerPanel = viewChild<ElementRef<HTMLElement>>('drawerPanel');

  readonly row = input<MarketAssetRow | null>(null);
  readonly recentTrades = input<MarketRecentTrade[]>([]);
  readonly alertEnabled = input(false);

  readonly closed = output<void>();
  readonly swapped = output<{ message: string }>();
  readonly favoriteToggle = output<void>();
  readonly alertToggle = output<void>();
  readonly exchangeOpen = output<void>();

  protected readonly quickPercents = [10, 25, 50, 100] as const;
  protected readonly tradeSide = signal<'buy' | 'sell'>('buy');
  protected readonly fromBalance = signal(0);
  protected readonly rate = signal(0);
  protected readonly amountPreset = signal(0);
  protected readonly amountInput = signal('');
  protected readonly loading = signal(false);
  protected readonly submitting = signal(false);
  protected readonly tradeError = signal<string | null>(null);

  constructor() {
    effect(() => {
      const item = this.row();
      if (item) {
        queueMicrotask(() => this.drawerPanel()?.nativeElement.focus());
        this.tradeSide.set('buy');
        this.amountPreset.set(0);
        this.amountInput.set('');
        this.tradeError.set(null);
        this.loadTradePanel(item, 'buy');
      }
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.row()) {
      this.dismiss();
    }
  }

  protected dismiss(): void {
    this.closed.emit();
  }

  protected onFavoriteClick(event: MouseEvent): void {
    event.stopPropagation();
    this.favoriteToggle.emit();
  }

  protected onAlertClick(event: MouseEvent): void {
    event.stopPropagation();
    this.alertToggle.emit();
  }

  protected onExchangeClick(event: MouseEvent): void {
    event.stopPropagation();
    this.exchangeOpen.emit();
  }

  protected setSide(side: 'buy' | 'sell'): void {
    const item = this.row();
    if (!item || item.config.native) {
      return;
    }

    this.tradeSide.set(side);
    this.amountPreset.set(0);
    this.amountInput.set('');
    this.tradeError.set(null);
    this.loadTradePanel(item, side);
  }

  protected applyPercent(percent: number): void {
    const balance = this.fromBalance();
    if (balance <= 0) {
      return;
    }

    const amount = (balance * percent) / 100;
    this.amountPreset.set(amount);
    this.amountInput.set(String(amount));
  }

  protected onAmountInput(value: string): void {
    this.amountInput.set(value);
    const normalized = value.replace(',', '.').trim();
    const amount = Number.parseFloat(normalized);
    this.amountPreset.set(Number.isFinite(amount) && amount > 0 ? amount : 0);
  }

  protected confirmTrade(): void {
    const item = this.row();
    const address = this.walletSession.address();
    const amount = this.amountPreset();

    if (!item || !address || amount <= 0) {
      return;
    }

    const guard = this.ensureTradeReady();
    if (guard) {
      this.tradeError.set(guard);
      return;
    }

    const side = this.tradeSide();
    const fromToken = side === 'buy' ? EXCHANGE_NATIVE_TOKEN : item.config.exchangeToken;
    const toToken = side === 'buy' ? item.config.exchangeToken : EXCHANGE_NATIVE_TOKEN;

    this.submitting.set(true);
    this.tradeError.set(null);

    this.api
      .swapExchangeTokens({
        fromToken,
        toToken,
        amount,
        walletAddress: address,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          window.dispatchEvent(
            new CustomEvent('market-swap-complete', {
              detail: {
                fromToken: response.fromToken,
                toToken: response.toToken,
                amountIn: response.amountIn,
                amountOut: response.amountOut,
                txHash: (response as { txHash?: string }).txHash,
              },
            })
          );
          this.walletSession.requestBalanceRefresh();
          this.swapped.emit({
            message: `Swap OK : ${response.amountOut} ${response.toToken}`,
          });
          this.submitting.set(false);
        },
        error: () => {
          this.tradeError.set('Swap impossible — vérifiez solde et connexion');
          this.submitting.set(false);
        },
      });
  }

  protected formatChange(row: MarketAssetRow): string {
    const sign = row.positive ? '+' : '';
    return `${sign}${row.changePercent.toFixed(2)}%`;
  }

  protected tokenTrades(): MarketRecentTrade[] {
    const item = this.row();
    if (!item) {
      return [];
    }

    const token = item.config.exchangeToken;
    return this.recentTrades().filter(
      (trade) => trade.fromToken === token || trade.toToken === token
    );
  }

  protected initials(row: MarketAssetRow): string {
    return row.config.iconLabel.slice(0, 2).toUpperCase();
  }

  protected estimatedOutput(): string | null {
    const amount = this.amountPreset();
    const exchangeRate = this.rate();
    if (amount <= 0 || exchangeRate <= 0) {
      return null;
    }

    const item = this.row();
    if (!item) {
      return null;
    }

    const toToken =
      this.tradeSide() === 'buy' ? item.config.exchangeToken : EXCHANGE_NATIVE_TOKEN;
    return `${(amount * exchangeRate).toLocaleString('fr-FR', { maximumFractionDigits: 6 })} ${toToken}`;
  }

  private loadTradePanel(row: MarketAssetRow, side: 'buy' | 'sell'): void {
    if (row.config.native) {
      return;
    }

    const fromToken = side === 'buy' ? EXCHANGE_NATIVE_TOKEN : row.config.exchangeToken;
    const toToken = side === 'buy' ? row.config.exchangeToken : EXCHANGE_NATIVE_TOKEN;

    this.loading.set(true);
    this.api
      .getExchangePanel({
        walletAddress: this.walletSession.address(),
        fromToken,
        toToken,
      })
      .pipe(
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((panel) => {
        this.loading.set(false);
        if (!panel) {
          this.tradeError.set('Impossible de charger la paire');
          return;
        }

        this.fromBalance.set(panel.fromBalance);
        this.rate.set(panel.rate);
      });
  }

  private ensureTradeReady(): string | null {
    if (!this.walletSession.address()) {
      window.dispatchEvent(new CustomEvent('dock-open-panel', { detail: { panel: 'wallet' } }));
      return 'Créez un wallet pour trader';
    }

    if (!this.auth.isAuthenticated()) {
      this.auth.openDrawer('login');
      return 'Connexion requise pour trader';
    }

    return null;
  }
}
