import { ChangeDetectionStrategy, Component, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FocusTrapDirective } from '@core/directives/focus-trap.directive';
import { MarketCartService } from '@showcase/services/market-cart.service';

@Component({
  selector: 'app-market-cart-drawer',
  standalone: true,
  imports: [CommonModule, FocusTrapDirective],
  templateUrl: './market-cart-drawer.html',
  styleUrls: ['./market-cart-drawer.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketCartDrawerComponent {
  protected readonly cart = inject(MarketCartService);

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.cart.open()) {
      this.cart.closeDrawer();
    }
  }

  protected bump(token: string, delta: number, current: number): void {
    this.cart.setQuantity(token, current + delta);
  }

  protected pay(): void {
    this.cart.checkout();
  }
}
