import { Injectable, signal } from '@angular/core';

export type LogoRelayRole = 'source' | 'target';

export interface LogoRelayFlight {
  id: string;
  from: DOMRectReadOnly;
  to: DOMRectReadOnly;
  /** Vol depuis le voyageur central (pas le header). */
  fromDescent?: boolean;
}

export type LogoRelayMode = 'idle' | 'flying' | 'descent';

/**
 * Relais gem : header → cibles, puis (home) descente centrale jusqu’au footer.
 */
@Injectable({ providedIn: 'root' })
export class LogoRelayService {
  readonly sourceEl = signal<HTMLElement | null>(null);
  readonly flight = signal<LogoRelayFlight | null>(null);
  readonly landedIds = signal<ReadonlySet<string>>(new Set());
  readonly busy = signal(false);
  readonly mode = signal<LogoRelayMode>('idle');
  /** Déclenche la phase descente centrale après home-hero. */
  readonly descentToken = signal(0);

  private readonly targets = new Map<string, HTMLElement>();
  private queue: string[] = [];
  private reduced = false;
  private descentFrom: DOMRectReadOnly | null = null;
  /** Bloque les vols tant que l’intro plein écran n’est pas finie. */
  private introHold = false;
  private pendingIntroLand = false;

  setReducedMotion(value: boolean): void {
    this.reduced = value;
  }

  isReduced(): boolean {
    return this.reduced;
  }

  registerSource(el: HTMLElement): void {
    this.sourceEl.set(el);
  }

  unregisterSource(el: HTMLElement): void {
    if (this.sourceEl() === el) this.sourceEl.set(null);
  }

  registerTarget(id: string, el: HTMLElement): void {
    this.targets.set(id, el);
    if (this.pendingIntroLand && id === 'home-hero') {
      this.applyIntroLand();
      return;
    }
    if (this.landedIds().has(id)) {
      el.classList.add('logo-relay-target--landed');
    } else if (this.reduced) {
      this.markLanded(id, el);
    } else {
      el.classList.add('logo-relay-target--waiting');
    }
  }

  unregisterTarget(id: string, el: HTMLElement): void {
    this.targets.delete(id);
    this.queue = this.queue.filter((q) => q !== id);
    el.classList.remove(
      'logo-relay-target--waiting',
      'logo-relay-target--landed',
      'logo-relay-target--pulse',
    );
  }

  getTarget(id: string): HTMLElement | undefined {
    return this.targets.get(id);
  }

  /** Position courante du voyageur (renseignée par l’overlay en descente). */
  setDescentFrom(rect: DOMRectReadOnly | null): void {
    this.descentFrom = rect;
  }

  setIntroHold(on: boolean): void {
    this.introHold = on;
  }

  /** Bloque les vols dès le boot intro (avant AfterViewInit des cibles). */
  armForIntro(): void {
    this.introHold = true;
    this.pendingIntroLand = false;
    this.flight.set(null);
    this.busy.set(false);
    this.mode.set('idle');
    this.descentFrom = null;
  }

  /**
   * Après l’intro : relâche le hold et rejoue header → hero → descente scroll.
   * Le gem hero reste en waiting jusqu’à l’atterrissage du vol.
   */
  releaseAfterIntro(): void {
    this.pendingIntroLand = false;
    this.mode.set('idle');
    this.flight.set(null);
    this.busy.set(false);
    // Garder le hold jusqu’au lancement du vol pour éviter un flash / un vol précoce
    this.introHold = true;

    const hero = this.targets.get('home-hero');
    if (hero) {
      const landed = new Set(this.landedIds());
      landed.delete('home-hero');
      this.landedIds.set(landed);
      hero.classList.remove('logo-relay-target--landed', 'logo-relay-target--pulse');
      if (this.reduced) {
        this.introHold = false;
        this.markLanded('home-hero', hero);
      } else {
        hero.classList.add('logo-relay-target--waiting');
      }
    }

    this.queue = this.queue.filter((id) => id !== 'home-hero');
    // Laisser l’intro se retirer et le header apparaître avant le vol
    window.setTimeout(() => {
      this.introHold = false;
      if (this.reduced) {
        if (this.targets.has('site-footer')) {
          this.mode.set('descent');
          this.descentToken.update((n) => n + 1);
        } else {
          this.drainQueue();
        }
        return;
      }
      if (this.targets.has('home-hero') && !this.landedIds().has('home-hero')) {
        this.requestFlight('home-hero');
      } else {
        this.drainQueue();
      }
    }, 320);
  }

  private applyIntroLand(): void {
    if (!this.pendingIntroLand) return;
    const hero = this.targets.get('home-hero');
    if (!hero) return;
    this.pendingIntroLand = false;
    if (!this.landedIds().has('home-hero')) {
      this.markLanded('home-hero', hero);
    }
    if (!this.reduced && this.targets.has('site-footer')) {
      this.mode.set('descent');
      this.descentToken.update((n) => n + 1);
      return;
    }
    this.mode.set('idle');
    this.drainQueue();
  }

  requestFlight(id: string): void {
    if (this.introHold) {
      if (!this.queue.includes(id)) this.queue.push(id);
      return;
    }
    if (this.reduced || this.landedIds().has(id)) {
      if (this.reduced) {
        const el = this.targets.get(id);
        if (el) this.markLanded(id, el);
      }
      return;
    }

    if (this.busy() || this.mode() === 'flying') {
      if (!this.queue.includes(id)) this.queue.push(id);
      return;
    }

    // Pendant la descente : footer part du centre, pas du header
    if (id === 'site-footer' && this.mode() === 'descent') {
      this.startFlightFromDescent(id);
      return;
    }

    // Ne pas lancer le footer depuis le header si on attend encore le hero (home)
    if (id === 'site-footer' && this.targets.has('home-hero') && !this.landedIds().has('home-hero')) {
      if (!this.queue.includes(id)) this.queue.push(id);
      return;
    }

    this.startFlight(id);
  }

  completeFlight(id: string): void {
    const el = this.targets.get(id);
    if (el) this.markLanded(id, el);
    this.flight.set(null);
    this.busy.set(false);

    if (id === 'home-hero' && !this.reduced && this.targets.has('site-footer')) {
      this.mode.set('descent');
      this.descentToken.update((n) => n + 1);
      return;
    }

    this.mode.set('idle');
    this.drainQueue();
  }

  /** Fin de descente sans vol (reduced / abort). */
  endDescent(): void {
    this.mode.set('idle');
    this.descentFrom = null;
    this.drainQueue();
  }

  resetForNavigation(): void {
    this.queue = [];
    this.flight.set(null);
    this.busy.set(false);
    this.mode.set('idle');
    this.descentFrom = null;
    this.pendingIntroLand = false;
    this.introHold = false;
    this.landedIds.set(new Set());
    for (const el of this.targets.values()) {
      el.classList.remove('logo-relay-target--landed', 'logo-relay-target--pulse');
      if (!this.reduced) el.classList.add('logo-relay-target--waiting');
    }
  }

  private drainQueue(): void {
    const next = this.queue.shift();
    if (!next) return;
    requestAnimationFrame(() => this.requestFlight(next));
  }

  private startFlight(id: string): void {
    const source = this.sourceEl();
    const target = this.targets.get(id);
    if (!target || this.landedIds().has(id)) return;
    if (!source) {
      // Header pas encore monté — réessayer au frame suivant
      requestAnimationFrame(() => this.startFlight(id));
      return;
    }

    this.busy.set(true);
    this.mode.set('flying');
    source.classList.add('logo-relay-source--emit');
    window.setTimeout(() => source.classList.remove('logo-relay-source--emit'), 420);

    this.flight.set({
      id,
      from: source.getBoundingClientRect(),
      to: target.getBoundingClientRect(),
    });
  }

  private startFlightFromDescent(id: string): void {
    const target = this.targets.get(id);
    if (!target || this.landedIds().has(id)) return;

    const from =
      this.descentFrom ??
      new DOMRect(window.innerWidth / 2 - 28, window.innerHeight * 0.45, 56, 56);

    this.busy.set(true);
    this.mode.set('flying');
    this.flight.set({
      id,
      from,
      to: target.getBoundingClientRect(),
      fromDescent: true,
    });
  }

  private markLanded(id: string, el: HTMLElement): void {
    const next = new Set(this.landedIds());
    next.add(id);
    this.landedIds.set(next);
    el.classList.remove('logo-relay-target--waiting');
    el.classList.add('logo-relay-target--landed', 'logo-relay-target--pulse');
    window.setTimeout(() => el.classList.remove('logo-relay-target--pulse'), 700);
  }
}
