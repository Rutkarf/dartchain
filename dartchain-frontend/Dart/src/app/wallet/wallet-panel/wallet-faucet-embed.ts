import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  effect,
  inject,
  signal,
} from '@angular/core';

import { FaucetRuntimeService } from '@faucet/services/faucet-runtime.service';
import { LocaleService } from '../../core/i18n/locale.service';

@Component({
  selector: 'app-wallet-faucet-embed',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './wallet-faucet-embed.html',
  styleUrls: ['./wallet-faucet-embed.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WalletFaucetEmbedComponent implements AfterViewInit, OnDestroy {
  protected readonly runtime = inject(FaucetRuntimeService);
  protected readonly locale = inject(LocaleService);

  protected readonly valueFitScale = signal(1);

  @ViewChild('valueText', { static: true })
  private valueTextRef!: ElementRef<HTMLElement>;
  @ViewChild('valueWrap', { static: true })
  private valueWrapRef!: ElementRef<HTMLElement>;

  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    effect(() => {
      void this.runtime.displayLine();
      queueMicrotask(() => this.fitValueToContainer());
    });
  }

  ngAfterViewInit(): void {
    this.fitValueToContainer();
    this.resizeObserver = new ResizeObserver(() => this.fitValueToContainer());
    this.resizeObserver.observe(this.valueWrapRef.nativeElement);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }

  protected claim(): void {
    this.runtime.claim();
  }

  protected t(
    key: Parameters<FaucetRuntimeService['t']>[0],
    params?: Record<string, string>
  ): string {
    return this.runtime.t(key, params);
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
    const available = Math.max(0, wrap.clientWidth - 1);
    const needed = Math.max(fit.scrollWidth, el.scrollWidth);

    let scale = 1;
    if (available > 0 && needed > available) {
      scale = Math.max(0.16, available / needed);
    }

    this.valueFitScale.set(scale);
    fit.style.transform = `scale(${scale})`;
  }
}
