import {
  ChangeDetectionStrategy,
  Component,
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

import { FocusTrapDirective } from '@core/directives/focus-trap.directive';
import { R4v3ThreeComponent } from '@r4v3-scene/r4v3-three/r4v3-three';
import { MarketCartService } from '@showcase/services/market-cart.service';
import { MarketAssetRow } from './market-panel.model';

@Component({
  selector: 'app-market-token-drawer',
  standalone: true,
  imports: [CommonModule, FocusTrapDirective, R4v3ThreeComponent],
  templateUrl: './market-token-drawer.html',
  styleUrls: ['./market-token-drawer.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketTokenDrawerComponent {
  private readonly cart = inject(MarketCartService);
  private readonly drawerPanel = viewChild<ElementRef<HTMLElement>>('drawerPanel');
  private readonly productLogo = viewChild<R4v3ThreeComponent>('productLogo');
  private readonly buyLogo = viewChild<R4v3ThreeComponent>('buyLogo');

  readonly row = input<MarketAssetRow | null>(null);

  readonly closed = output<void>();
  readonly swapped = output<{ message: string }>();
  readonly favoriteToggle = output<void>();

  protected readonly buyQty = signal(1);
  protected readonly qtyPresets = [10, 50, 100, 1000] as const;
  protected readonly cartBusy = this.cart.busy;
  protected readonly cartPulse = signal(false);
  protected readonly favPulse = signal(false);
  protected readonly buyPulse = signal(false);
  protected readonly buyConfirm = signal<{
    symbol: string;
    qty: number;
    totalLabel: string;
    unitPriceR4v3: number;
    native: boolean;
  } | null>(null);

  private cartPulseTimer: ReturnType<typeof setTimeout> | null = null;
  private favPulseTimer: ReturnType<typeof setTimeout> | null = null;
  private buyPulseTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const item = this.row();
      if (item) {
        queueMicrotask(() => this.drawerPanel()?.nativeElement.focus());
        this.buyQty.set(1);
        this.buyConfirm.set(null);
      }
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.buyConfirm()) {
      this.cancelBuyConfirm();
      return;
    }
    if (this.row()) {
      this.dismiss();
    }
  }

  protected dismiss(): void {
    this.buyConfirm.set(null);
    this.closed.emit();
  }

  protected onFavoriteClick(event: MouseEvent, item: MarketAssetRow): void {
    event.stopPropagation();
    this.pulseFav();
    this.favoriteToggle.emit();
    if (!item.config.native) {
      this.cart.addFromRow(item, this.buyQty(), { favorite: true });
      this.swapped.emit({
        message: this.cart.lastMessage() || 'Ajouté aux favoris (panier)',
      });
    }
  }

  protected bumpQty(delta: number): void {
    this.buyQty.update((q) => Math.max(1, Math.min(99999, q + delta)));
  }

  protected addQty(amount: number): void {
    this.bumpQty(Math.floor(amount));
  }

  protected setQty(qty: number): void {
    this.buyQty.set(Math.max(1, Math.min(99999, Math.floor(qty))));
  }

  protected onQtyInput(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const parsed = Math.floor(Number(raw));
    if (!Number.isFinite(parsed) || parsed < 1) {
      this.buyQty.set(1);
      return;
    }
    this.buyQty.set(Math.min(99999, parsed));
  }

  /** Total CHF à parité 1 R4V3 = 1 CHF. */
  protected chfTotalLabel(): string {
    const total = this.buyQty();
    return `${total.toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} CHF`;
  }

  protected onCartClick(event: MouseEvent, item: MarketAssetRow): void {
    event.stopPropagation();
    this.pulseCart();
    if (item.config.native) {
      this.cart.openDrawer();
      return;
    }
    this.cart.addFromRow(item, this.buyQty());
    this.swapped.emit({ message: this.cart.lastMessage() || 'Ajouté au panier' });
    this.cart.openDrawer();
  }

  protected onBuyClick(event: MouseEvent, item: MarketAssetRow): void {
    event.stopPropagation();
    this.pulseBuy();
    const qty = this.buyQty();

    if (item.config.native) {
      this.buyConfirm.set({
        symbol: item.config.displaySymbol,
        qty,
        totalLabel: this.chfTotalLabel(),
        unitPriceR4v3: 1,
        native: true,
      });
      return;
    }

    this.cart.addFromRow(item, qty);
    const unit = this.cart.unitPriceFromRow(item);
    const total = qty * unit;
    this.buyConfirm.set({
      symbol: item.config.displaySymbol,
      qty,
      totalLabel: `${total.toLocaleString('fr-FR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
      })} R4V3`,
      unitPriceR4v3: unit,
      native: false,
    });
  }

  protected cancelBuyConfirm(): void {
    this.buyConfirm.set(null);
  }

  protected confirmBuy(): void {
    const confirm = this.buyConfirm();
    const item = this.row();
    if (!confirm || !item) {
      return;
    }

    if (confirm.native) {
      this.buyConfirm.set(null);
      this.dismiss();
      return;
    }

    this.cart.checkout({
      items: [
        {
          exchangeToken: item.config.exchangeToken,
          displaySymbol: item.config.displaySymbol,
          name: item.config.name,
          offerKind: item.config.offerKind,
          quantity: confirm.qty,
          unitPriceR4v3: confirm.unitPriceR4v3,
          accent: item.config.accent,
        },
      ],
    });
    this.buyConfirm.set(null);
    this.dismiss();
  }

  private pulseCart(): void {
    this.cartPulse.set(false);
    queueMicrotask(() => this.cartPulse.set(true));
    if (this.cartPulseTimer) clearTimeout(this.cartPulseTimer);
    this.cartPulseTimer = setTimeout(() => this.cartPulse.set(false), 520);
  }

  private pulseFav(): void {
    this.favPulse.set(false);
    queueMicrotask(() => this.favPulse.set(true));
    if (this.favPulseTimer) clearTimeout(this.favPulseTimer);
    this.favPulseTimer = setTimeout(() => this.favPulse.set(false), 560);
  }

  private pulseBuy(): void {
    this.buyPulse.set(false);
    queueMicrotask(() => this.buyPulse.set(true));
    // Idle spin = Y → Acheter kick sur l'autre axe (X).
    this.productLogo()?.kickSpin('x');
    this.buyLogo()?.kickSpin('x');
    if (this.buyPulseTimer) clearTimeout(this.buyPulseTimer);
    this.buyPulseTimer = setTimeout(() => this.buyPulse.set(false), 700);
  }

  protected tokenSubtitle(row: MarketAssetRow): string {
    const symbol = (row.config.displaySymbol || '').trim();
    let raw = (row.config.name || row.config.displaySymbol).trim();
    if (symbol) {
      raw = raw.replace(new RegExp(`^${symbol}\\s+`, 'i'), '');
    }
    const normalized = raw.replace(/\bTOKEN\b/gi, 'token');
    return `${normalized} :`;
  }

  protected heroPriceAmount(row: MarketAssetRow): string {
    const raw = (row.price || '—').trim();
    const match = raw.match(/^([\d\s.,]+)/);
    return match ? match[1].trim() : raw;
  }

  protected heroPriceCurrency(row: MarketAssetRow): string | null {
    const raw = (row.price || '').trim();
    if (/\bCHF\b/i.test(raw)) {
      return 'CHF';
    }
    if (/€/.test(raw) || /\bEUR\b/i.test(raw)) {
      return '€';
    }
    if (/\$/.test(raw) || /\bUSD\b/i.test(raw)) {
      return '$';
    }
    return null;
  }

  protected trustSrcLabel(row: MarketAssetRow): string {
    const creator = row.metrics.creatorLabel || '';
    const first = creator.split('·')[0]?.trim();
    return first || creator || '—';
  }

  protected sellerName(row: MarketAssetRow): string {
    if (row.config.native) {
      return 'NickNameRandom';
    }
    return this.trustSrcLabel(row);
  }

  protected offerRayonLabel(row: MarketAssetRow): string {
    switch (row.config.offerKind) {
      case 'nft':
        return 'NFT Physique';
      case 'service':
        return 'Service numérique';
      default:
        return 'Actif';
    }
  }

  protected productPitch(row: MarketAssetRow): string {
    return row.metrics.description || row.config.shortPitch;
  }

  protected initials(row: MarketAssetRow): string {
    return row.config.iconLabel.slice(0, 2).toUpperCase();
  }
}
