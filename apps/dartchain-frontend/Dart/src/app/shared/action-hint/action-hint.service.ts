import { Injectable, NgZone, OnDestroy, inject } from '@angular/core';

const INTERACTIVE_SELECTOR = [
  'button:not([disabled])',
  'a[href]',
  '[role="button"]:not([aria-disabled="true"])',
  '[role="tab"]',
  '[role="menuitem"]',
  '[role="switch"]',
  '[role="checkbox"]',
  'summary',
  'input[type="button"]:not([disabled])',
  'input[type="submit"]:not([disabled])',
  'input[type="reset"]:not([disabled])',
  'select:not([disabled])',
  '[data-action-hint]',
].join(',');

const LONG_PRESS_MS = 420;
const SHOW_DELAY_MS = 280;

/**
 * Hint accessible global : survol / focus / long-press tactile
 * lit data-action-hint → aria-label → title → texte court du bouton.
 */
@Injectable({ providedIn: 'root' })
export class ActionHintService implements OnDestroy {
  private readonly zone = inject(NgZone);

  private tip: HTMLDivElement | null = null;
  private activeEl: HTMLElement | null = null;
  private showTimer: number | null = null;
  private longPressTimer: number | null = null;
  private touchId: number | null = null;
  private bound = false;

  private readonly onPointerOver = (event: PointerEvent) => {
    if (event.pointerType === 'touch') {
      return;
    }
    const target = this.resolveTarget(event.target);
    if (!target) {
      return;
    }
    this.scheduleShow(target, SHOW_DELAY_MS);
  };

  private readonly onPointerOut = (event: PointerEvent) => {
    if (event.pointerType === 'touch') {
      return;
    }
    const related = event.relatedTarget as Node | null;
    if (this.activeEl && related && this.activeEl.contains(related)) {
      return;
    }
    if (this.tip && related instanceof Node && this.tip.contains(related)) {
      return;
    }
    this.hide();
  };

  private readonly onFocusIn = (event: FocusEvent) => {
    const target = this.resolveTarget(event.target);
    if (!target) {
      return;
    }
    this.scheduleShow(target, 80);
  };

  private readonly onFocusOut = () => {
    this.hide();
  };

  private readonly onTouchStart = (event: TouchEvent) => {
    if (event.touches.length !== 1) {
      this.clearLongPress();
      return;
    }
    const touch = event.touches[0];
    const target = this.resolveTarget(event.target);
    if (!target) {
      return;
    }
    this.touchId = touch.identifier;
    this.clearLongPress();
    this.longPressTimer = window.setTimeout(() => {
      this.show(target);
    }, LONG_PRESS_MS);
  };

  private readonly onTouchMove = () => {
    this.clearLongPress();
  };

  private readonly onTouchEnd = () => {
    this.clearLongPress();
    // Ne cache pas immédiatement si long-press a ouvert le tip : laisse 1.2s
    if (this.tip?.classList.contains('is-visible')) {
      window.setTimeout(() => this.hide(), 1200);
    }
  };

  private readonly onScroll = () => this.hide();
  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      this.hide();
    }
  };

  /** Démarre l’écoute document (idempotent). */
  start(): void {
    if (this.bound || typeof document === 'undefined') {
      return;
    }
    this.bound = true;
    this.zone.runOutsideAngular(() => {
      document.addEventListener('pointerover', this.onPointerOver, true);
      document.addEventListener('pointerout', this.onPointerOut, true);
      document.addEventListener('focusin', this.onFocusIn, true);
      document.addEventListener('focusout', this.onFocusOut, true);
      document.addEventListener('touchstart', this.onTouchStart, { capture: true, passive: true });
      document.addEventListener('touchmove', this.onTouchMove, { capture: true, passive: true });
      document.addEventListener('touchend', this.onTouchEnd, { capture: true, passive: true });
      document.addEventListener('touchcancel', this.onTouchEnd, { capture: true, passive: true });
      window.addEventListener('scroll', this.onScroll, true);
      document.addEventListener('keydown', this.onKeyDown, true);
    });
  }

  ngOnDestroy(): void {
    this.stop();
  }

  stop(): void {
    if (!this.bound) {
      return;
    }
    this.bound = false;
    document.removeEventListener('pointerover', this.onPointerOver, true);
    document.removeEventListener('pointerout', this.onPointerOut, true);
    document.removeEventListener('focusin', this.onFocusIn, true);
    document.removeEventListener('focusout', this.onFocusOut, true);
    document.removeEventListener('touchstart', this.onTouchStart, true);
    document.removeEventListener('touchmove', this.onTouchMove, true);
    document.removeEventListener('touchend', this.onTouchEnd, true);
    document.removeEventListener('touchcancel', this.onTouchEnd, true);
    window.removeEventListener('scroll', this.onScroll, true);
    document.removeEventListener('keydown', this.onKeyDown, true);
    this.hide();
  }

  private resolveTarget(raw: EventTarget | null): HTMLElement | null {
    if (!(raw instanceof Element)) {
      return null;
    }
    const el = raw.closest(INTERACTIVE_SELECTOR);
    if (!(el instanceof HTMLElement)) {
      return null;
    }
    if (el.closest('.navbar-hint-wrap')) {
      return null;
    }
    if (el.closest('[data-action-hint="off"], .action-hint-skip')) {
      return null;
    }
    if (el.getAttribute('data-action-hint') === 'off') {
      return null;
    }
    const label = this.resolveLabel(el);
    if (!label) {
      return null;
    }
    el.dataset['actionHintResolved'] = label;
    return el;
  }

  private resolveLabel(el: HTMLElement): string {
    const data = el.getAttribute('data-action-hint')?.trim();
    if (data && data !== 'off') {
      return data;
    }
    const aria = el.getAttribute('aria-label')?.trim();
    if (aria) {
      return aria;
    }
    const titled = el.getAttribute('title')?.trim();
    if (titled) {
      return titled;
    }
    if (el.matches('button, [role="button"], [role="tab"], a[href]')) {
      const text = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
      if (text.length > 0 && text.length <= 56) {
        return text;
      }
    }
    return '';
  }

  private scheduleShow(el: HTMLElement, delay: number): void {
    this.clearShowTimer();
    if (this.activeEl === el && this.tip?.classList.contains('is-visible')) {
      return;
    }
    this.showTimer = window.setTimeout(() => this.show(el), delay);
  }

  private show(el: HTMLElement): void {
    const label = el.dataset['actionHintResolved'] || this.resolveLabel(el);
    if (!label) {
      return;
    }
    this.activeEl = el;
    const tip = this.ensureTip();
    tip.textContent = label;
    tip.classList.add('is-visible');
    tip.setAttribute('aria-hidden', 'false');
    this.position(el, tip);

    // Accessibilité : décrit l’élément pendant l’affichage
    if (!el.getAttribute('aria-describedby')?.includes('app-action-hint-tip')) {
      const existing = el.getAttribute('aria-describedby');
      el.setAttribute(
        'aria-describedby',
        existing ? `${existing} app-action-hint-tip` : 'app-action-hint-tip'
      );
      el.dataset['actionHintDescribed'] = '1';
    }
  }

  private hide(): void {
    this.clearShowTimer();
    this.clearLongPress();
    if (this.activeEl?.dataset['actionHintDescribed'] === '1') {
      const current = this.activeEl.getAttribute('aria-describedby') || '';
      const next = current
        .split(/\s+/)
        .filter((id) => id && id !== 'app-action-hint-tip')
        .join(' ');
      if (next) {
        this.activeEl.setAttribute('aria-describedby', next);
      } else {
        this.activeEl.removeAttribute('aria-describedby');
      }
      delete this.activeEl.dataset['actionHintDescribed'];
    }
    this.activeEl = null;
    if (this.tip) {
      this.tip.classList.remove('is-visible');
      this.tip.setAttribute('aria-hidden', 'true');
      this.tip.textContent = '';
    }
  }

  private ensureTip(): HTMLDivElement {
    if (this.tip) {
      return this.tip;
    }
    const tip = document.createElement('div');
    tip.id = 'app-action-hint-tip';
    tip.className = 'action-hint-tip';
    tip.setAttribute('role', 'tooltip');
    tip.setAttribute('aria-hidden', 'true');
    document.body.appendChild(tip);
    this.tip = tip;
    return tip;
  }

  private position(el: HTMLElement, tip: HTMLDivElement): void {
    const rect = el.getBoundingClientRect();
    tip.style.left = '0px';
    tip.style.top = '0px';
    // force layout
    const tipRect = tip.getBoundingClientRect();
    const gap = 8;
    let left = rect.left + rect.width / 2 - tipRect.width / 2;
    let top = rect.top - tipRect.height - gap;
    const preferBelow = top < 8;
    if (preferBelow) {
      top = rect.bottom + gap;
      tip.classList.add('is-below');
    } else {
      tip.classList.remove('is-below');
    }
    left = Math.max(8, Math.min(left, window.innerWidth - tipRect.width - 8));
    tip.style.left = `${Math.round(left)}px`;
    tip.style.top = `${Math.round(top)}px`;
  }

  private clearShowTimer(): void {
    if (this.showTimer != null) {
      window.clearTimeout(this.showTimer);
      this.showTimer = null;
    }
  }

  private clearLongPress(): void {
    if (this.longPressTimer != null) {
      window.clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
    this.touchId = null;
  }
}
