import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
  signal,
} from '@angular/core';

import { FaucetRuntimeService } from '../../core/services/faucet-runtime.service';
import { LocaleService } from '../../core/i18n/locale.service';

@Component({
  selector: 'app-faucet',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './faucet.html',
  styleUrls: ['./faucet.css'],
})
export class FaucetComponent implements AfterViewInit, OnDestroy {
  protected readonly runtime = inject(FaucetRuntimeService);
  protected readonly locale = inject(LocaleService);

  protected readonly valueFitScale = signal(1);

  @ViewChild('valueText', { static: true })
  private valueTextRef!: ElementRef<HTMLElement>;
  @ViewChild('valueWrap', { static: true })
  private valueWrapRef!: ElementRef<HTMLElement>;

  private resizeObserver: ResizeObserver | null = null;

  ngAfterViewInit(): void {
    this.fitValueToContainer();
    this.resizeObserver = new ResizeObserver(() => this.fitValueToContainer());
    this.resizeObserver.observe(this.valueWrapRef.nativeElement);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }

  protected refreshPanel(): void {
    this.runtime.refreshPanel();
  }

  protected retryConnection(): void {
    this.runtime.retryConnection();
  }

  protected claim(): void {
    this.runtime.claim();
  }

  protected copyTxHash(): void {
    this.runtime.copyTxHash();
  }

  protected exportHistoryJson(): void {
    this.runtime.exportHistoryJson();
  }

  protected t(key: Parameters<FaucetRuntimeService['t']>[0], params?: Record<string, string>): string {
    return this.runtime.t(key, params);
  }

  protected openTxInExplorer(txHash?: string): void {
    const hash = (txHash ?? this.runtime.txHash()).trim();
    if (!hash) {
      return;
    }

    window.dispatchEvent(
      new CustomEvent('explorer-search-query', {
        detail: { query: hash },
      })
    );
  }

  protected openBlockInExplorer(): void {
    const height = this.runtime.blockHeight();
    if (height == null || height <= 0) {
      return;
    }

    window.dispatchEvent(
      new CustomEvent('explorer-search-query', {
        detail: { query: String(height) },
      })
    );
  }

  private fitValueToContainer(): void {
    if (!this.valueTextRef || !this.valueWrapRef) {
      return;
    }

    const el = this.valueTextRef.nativeElement;
    const wrap = this.valueWrapRef.nativeElement;
    const fit = el.parentElement as HTMLElement | null;
    if (!fit) {
      return;
    }

    fit.style.transform = 'scale(1)';
    this.valueFitScale.set(1);

    const available = wrap.clientWidth;
    const needed = Math.max(fit.scrollWidth, el.scrollWidth);
    if (available <= 0 || needed <= 0) {
      return;
    }

    if (needed > available) {
      const scale = Math.max(0.28, available / needed);
      this.valueFitScale.set(scale);
    }
  }
}
