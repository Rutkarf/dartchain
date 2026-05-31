import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  inject,
} from '@angular/core';

import { BrandCryptoSymbol } from '../core/constants/rate-panel-symbols';
import { BrandCryptoSelectionService } from '../core/services/brand-crypto-selection.service';

@Component({
  selector: 'app-brand-crypto-select',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './brand-crypto-select.html',
  styleUrl: './brand-crypto-select.css',
})
export class BrandCryptoSelectComponent {
  private readonly host = inject(ElementRef<HTMLElement>);
  readonly selection = inject(BrandCryptoSelectionService);

  menuOpen = false;

  toggleMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.menuOpen = !this.menuOpen;
  }

  selectSymbol(symbol: BrandCryptoSymbol): void {
    this.selection.select(symbol);
    this.menuOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.menuOpen) {
      return;
    }

    if (this.host.nativeElement.contains(event.target as Node)) {
      return;
    }

    this.menuOpen = false;
  }
}
