import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  BlockchainApiService,
  PendingTransaction,
  LiveUpdateMessage,
} from '../../core/services/blockchain-api.service';

@Component({
  selector: 'app-bandeau-accueil',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bandeau-accueil.html',
  styleUrls: ['./bandeau-accueil.css'],
})
export class BandeauAccueilComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  private readonly api = inject(BlockchainApiService);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('track', { read: ElementRef }) trackRef?: ElementRef<HTMLElement>;
  @ViewChild('viewport', { read: ElementRef })
  viewportRef?: ElementRef<HTMLElement>;

  message1 = '';
  lastTransaction = 'Chargement...';
  lastTransactionShort = 'Chargement...';
  userCount = 0;

  marqueeCopies: number[] = [0, 1];
  isDragging = false;

  private readonly autoScrollPxPerSec = 38;
  private offsetPx = 0;
  private loopWidthPx = 0;
  private rafId = 0;
  private lastFrameTs = 0;
  private autoScrollEnabled = true;

  private dragPointerId: number | null = null;
  private dragStartClientX = 0;
  private dragStartOffsetPx = 0;

  ngOnInit(): void {
    this.autoScrollEnabled = !window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    this.fetchBanner();
    this.listenLiveUpdates();
  }

  ngAfterViewInit(): void {
    requestAnimationFrame(() => {
      this.updateMarqueeCopies();
      this.startScrollLoop();
    });
    window.addEventListener('resize', this.onResize);
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.onResize);
    this.stopScrollLoop();
  }

  onPointerDown(event: PointerEvent): void {
    if (event.button !== 0 && event.pointerType === 'mouse') return;

    const viewport = this.viewportRef?.nativeElement;
    if (!viewport) return;

    this.isDragging = true;
    this.dragPointerId = event.pointerId;
    this.dragStartClientX = event.clientX;
    this.dragStartOffsetPx = this.offsetPx;

    viewport.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.isDragging || this.dragPointerId !== event.pointerId) return;

    const dx = event.clientX - this.dragStartClientX;
    this.offsetPx = this.dragStartOffsetPx + dx;
    this.applyTransform();
    event.preventDefault();
  }

  onPointerUp(event: PointerEvent): void {
    if (this.dragPointerId !== event.pointerId) return;
    this.finishDrag(event);
  }

  onPointerCancel(event: PointerEvent): void {
    if (this.dragPointerId !== event.pointerId) return;
    this.finishDrag(event);
  }

  private finishDrag(event: PointerEvent): void {
    const viewport = this.viewportRef?.nativeElement;
    if (viewport?.hasPointerCapture(event.pointerId)) {
      viewport.releasePointerCapture(event.pointerId);
    }

    this.isDragging = false;
    this.dragPointerId = null;
    this.normalizeOffset();
    this.applyTransform();
  }

  private onResize = (): void => {
    this.updateMarqueeCopies();
    this.normalizeOffset();
    this.applyTransform();
  };

  private startScrollLoop(): void {
    if (this.rafId) return;
    this.lastFrameTs = 0;
    this.rafId = requestAnimationFrame(this.tick);
  }

  private stopScrollLoop(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  private tick = (timestamp: number): void => {
    if (!this.lastFrameTs) {
      this.lastFrameTs = timestamp;
    }

    const dt = (timestamp - this.lastFrameTs) / 1000;
    this.lastFrameTs = timestamp;

    if (this.autoScrollEnabled && !this.isDragging && this.loopWidthPx > 0) {
      this.offsetPx -= this.autoScrollPxPerSec * dt;
      this.normalizeOffset();
      this.applyTransform();
    }

    this.rafId = requestAnimationFrame(this.tick);
  };

  private normalizeOffset(): void {
    if (this.loopWidthPx <= 0) return;

    while (this.offsetPx <= -this.loopWidthPx) {
      this.offsetPx += this.loopWidthPx;
    }
    while (this.offsetPx > 0) {
      this.offsetPx -= this.loopWidthPx;
    }
  }

  private applyTransform(): void {
    const track = this.trackRef?.nativeElement;
    if (!track) return;
    track.style.transform = `translate3d(${this.offsetPx}px, 0, 0)`;
  }

  private fetchBanner(): void {
    this.api
      .getBanner()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.message1 = data.message1 ?? 'Bienvenue sur Dart Explorer !';
          this.lastTransaction =
            data.lastTransaction ?? 'Aucune transaction récente';
          this.lastTransactionShort =
            data.lastTransactionShort ?? this.lastTransaction;
          this.userCount = data.userCount ?? 0;

          queueMicrotask(() => this.updateMarqueeCopies());
        },
        error: (error: unknown) => {
          console.error('Erreur banner:', error);
          this.message1 = 'Bienvenue sur Dart Explorer !';
          this.lastTransaction = 'Erreur de récupération';
          this.lastTransactionShort = this.lastTransaction;
          this.userCount = 0;

          queueMicrotask(() => this.updateMarqueeCopies());
        },
      });
  }

  private listenLiveUpdates(): void {
    this.api
      .connectLiveUpdates()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (message: LiveUpdateMessage) => {
          if (message.type === 'pending-transactions') {
            this.applyLatestTransaction(message.data);
            queueMicrotask(() => this.updateMarqueeCopies());
          }

          if (message.type === 'snapshot') {
            this.applyLatestTransaction(message.data.pendingTransactions);

            if (message.data.stats) {
              this.userCount = message.data.stats.totalBlocks ?? this.userCount;
            }

            queueMicrotask(() => this.updateMarqueeCopies());
          }
        },
        error: (error: unknown) => {
          console.error('Erreur live updates:', error);
        },
      });
  }

  private applyLatestTransaction(transactions: PendingTransaction[]): void {
    if (!transactions || transactions.length === 0) {
      this.lastTransaction = 'Aucune transaction récente';
      this.lastTransactionShort = this.lastTransaction;
      return;
    }

    const latest = [...transactions].sort(
      (a, b) => (b.createdAt ?? b.timestamp ?? 0) - (a.createdAt ?? a.timestamp ?? 0)
    )[0];

    const latestHash =
      latest.hash ??
      latest.id ??
      latest.payload ??
      latest.data ??
      'Transaction inconnue';

    this.lastTransaction = latestHash;
    this.lastTransactionShort =
      latestHash.length > 24 ? `${latestHash.slice(0, 24)}...` : latestHash;
  }

  private updateMarqueeCopies(): void {
    const track = this.trackRef?.nativeElement;
    const firstContent = track?.querySelector(
      '.bandeau-accueil__content'
    ) as HTMLElement | null;
    const viewport = this.viewportRef?.nativeElement;

    if (!track || !viewport || !firstContent) {
      return;
    }

    const viewportWidth = viewport.clientWidth || 1;
    const contentWidth = firstContent.scrollWidth || 1;
    const needed = Math.max(2, Math.ceil((viewportWidth * 2) / contentWidth) + 1);

    this.marqueeCopies = Array.from({ length: needed }, (_, i) => i);

    requestAnimationFrame(() => {
      const totalWidth = track.scrollWidth || contentWidth * needed;
      this.loopWidthPx = totalWidth / 2;
      this.normalizeOffset();
      this.applyTransform();
    });
  }
}
