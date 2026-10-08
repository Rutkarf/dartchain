import {
  Injectable,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { AuthService } from '@auth/services/auth.service';
import { ProductConfigService } from '@core/config/product-config.service';
import { DockNavigationService } from '@dock/services/dock-navigation.service';
import { ShowcaseNavigationService } from '@showcase/services/showcase-navigation.service';
import { LogoRelayService } from '../logo-relay/logo-relay.service';
import {
  ONBOARDING_AUTO_ADVANCE_MS,
  ONBOARDING_STORAGE_KEY,
  ONBOARDING_TOUR_STEPS,
  type OnboardingTourStatus,
  type OnboardingTourStep,
  type SpotlightRect,
  type TourEntryPose,
} from './onboarding-tour.model';

const FOCUS_CLASS = 'onboarding-tour-target-focus';
const LURE_CLASS = 'onboarding-tour-target-lure';

/**
 * Tutoriel hub post-intro (P1–P4 : shell, R4V3, dock, graph/floor/SC/park).
 */
@Injectable({ providedIn: 'root' })
export class OnboardingTourService {
  private readonly relay = inject(LogoRelayService);
  private readonly auth = inject(AuthService);
  private readonly product = inject(ProductConfigService);
  private readonly showcaseNav = inject(ShowcaseNavigationService);
  private readonly dockNav = inject(DockNavigationService);

  readonly status = signal<OnboardingTourStatus>('idle');
  readonly stepIndex = signal(0);
  readonly spotlight = signal<SpotlightRect | null>(null);
  /** Trous de flou persistants (Inscription / Connexion + cible courante). */
  readonly clearHoles = signal<readonly SpotlightRect[]>([]);
  readonly reducedMotion = signal(false);
  /** Grossissement « envie de cliquer » sur la cible (ex. Inscription). */
  readonly lureActive = signal(false);
  /**
   * Pose initiale héritée du traveler intro (haut d’écran).
   * Le token tutoriel démarre ici puis glisse vers la 1ʳᵉ cible.
   */
  readonly entryPose = signal<TourEntryPose | null>(null);

  private stepTimer: number | null = null;
  private spotlightRetryTimer: number | null = null;
  private revealRefreshTimer: number | null = null;
  private revealPassesLeft = 0;
  private suppressDomObserver = false;
  private resumeAfterDrawer = false;
  private drawerWasOpen = false;
  private pulsedEl: Element | null = null;
  private targetClickBound?: (event: Event) => void;
  private domObserver: MutationObserver | null = null;
  /** Sélecteurs gardés nets jusqu’à la fin du tutoriel. */
  private stickyClears: { sel: string; pad: number; lift: boolean }[] = [];
  private stickyFocusEls = new Set<Element>();
  /**
   * Cibles déjà spotlightées. Une fois nettes, elles le restent
   * jusqu’à la fin du tutoriel — l’élément lui-même, pas tout le site.
   */
  private revealedTargets: { el: Element; pad: number }[] = [];

  readonly active = computed(() => {
    const s = this.status();
    return s === 'running' || s === 'paused';
  });
  readonly paused = computed(() => this.status() === 'paused');
  readonly step = computed((): OnboardingTourStep | null => {
    if (!this.active()) return null;
    return this.visibleSteps()[this.stepIndex()] ?? null;
  });
  readonly stepCount = computed(() => this.visibleSteps().length);
  readonly isFirstStep = computed(() => this.stepIndex() <= 0);
  readonly isLastStep = computed(
    () => this.stepIndex() >= this.visibleSteps().length - 1,
  );
  readonly progressLabel = computed(() => {
    const total = this.stepCount();
    if (total <= 0) return '';
    return `${Math.min(this.stepIndex() + 1, total)}/${total}`;
  });

  constructor() {
    if (typeof window !== 'undefined') {
      this.reducedMotion.set(
        window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      );
    }

    effect(() => {
      if (!this.active()) return;
      const open = this.auth.drawerOpen();
      if (open && !this.drawerWasOpen) {
        this.drawerWasOpen = true;
        this.pauseForDrawer();
        return;
      }
      if (!open && this.drawerWasOpen) {
        this.drawerWasOpen = false;
        if (this.resumeAfterDrawer) {
          this.resumeAfterDrawer = false;
          // Reprend le tutoriel sans avancer — la page reste floutée hors drawer.
          this.status.set('running');
          this.scheduleTimeout();
          this.scheduleRevealRefresh();
        }
      }
    });
  }

  private visibleSteps(): readonly OnboardingTourStep[] {
    return ONBOARDING_TOUR_STEPS.filter((step) => !this.shouldSkipStep(step));
  }

  private shouldSkipStep(step: OnboardingTourStep): boolean {
    switch (step.skipWhen) {
      case 'authenticated':
        // Jamais filtrer sur l’absence DOM (hub pas encore peint → sautait Inscription/Connexion).
        return this.auth.isAuthenticated();
      case 'showcase-off':
        return !this.product.showcaseEnabled;
      case 'faucet-off':
        return !this.product.faucetEnabled;
      case 'sc-off':
        return !this.product.starConquestEnabled;
      default:
        return false;
    }
  }

  shouldStart(): boolean {
    if (typeof window === 'undefined') return false;
    if (this.active()) return false;
    return !this.readDone();
  }

  /** Cible DOM de la 1ʳᵉ bulle visible (handoff Feed → tutoriel, sans flash LED). */
  firstVisibleStepTarget(): Element | null {
    return this.resolveTarget(this.visibleSteps()[0] ?? null);
  }

  /** Pose de continuité Feed The R4V3 → tutoriel (avant start). */
  seedEntryPose(pose: TourEntryPose): void {
    this.entryPose.set(pose);
  }

  clearEntryPose(): void {
    this.entryPose.set(null);
  }

  start(): boolean {
    if (this.active()) return true;
    if (this.readDone()) return false;

    const steps = this.visibleSteps();
    if (steps.length === 0) {
      this.persistDone('done');
      this.status.set('done');
      this.clearEntryPose();
      return false;
    }

    this.stepIndex.set(0);
    this.status.set('running');
    this.resumeAfterDrawer = false;
    this.drawerWasOpen = this.auth.drawerOpen();
    /* Pas de trous sticky résiduels (évite un flash LED si une session a laissé Direct). */
    this.stickyClears = [];
    this.clearHoles.set([]);
    this.spotlight.set(null);
    this.relay.setIntroHold(true);
    this.applyDomClass(true);
    this.startDomObserver();
    this.enterCurrentStep();
    return true;
  }

  skip(): void {
    if (!this.active() && this.readDone()) return;
    this.clearTimeout();
    this.stopLure();
    this.persistDone('skipped');
    this.status.set('skipped');
    this.teardownRuntime();
  }

  complete(): void {
    if (!this.active() && this.readDone()) return;
    this.clearTimeout();
    this.stopLure();
    this.restoreHubAfterTour();
    this.persistDone('done');
    this.status.set('done');
    this.teardownRuntime();
  }

  back(): void {
    if (this.status() !== 'running') return;
    if (this.stepIndex() <= 0) return;
    this.clearTimeout();
    this.stopLure();
    this.stepIndex.update((i) => Math.max(0, i - 1));
    this.enterCurrentStep();
  }

  next(): void {
    if (this.status() !== 'running') return;
    this.clearTimeout();
    this.stopLure();
    if (this.isLastStep()) {
      this.complete();
      return;
    }
    this.stepIndex.update((i) => i + 1);
    this.enterCurrentStep();
  }

  refreshSpotlight(): void {
    if (typeof document === 'undefined' || !this.active()) {
      this.spotlight.set(null);
      this.clearHoles.set([]);
      this.clearPulse();
      return;
    }
    const step = this.step();
    if (!step?.targetSelector && !step?.fallbackSelectors?.length) {
      this.spotlight.set(null);
      this.clearPulse();
      this.refreshClearHoles();
      return;
    }
    const el = this.resolveTarget(step);
    if (!el) {
      this.spotlight.set(null);
      this.clearPulse();
      this.refreshClearHoles();
      return;
    }
    const pad = step.pad ?? 0;
    const rect = this.rectFromElement(el, pad);
    if (!rect) {
      this.spotlight.set(null);
      this.clearPulse();
      this.refreshClearHoles();
      return;
    }
    this.publishSpotlight(rect);
    this.rememberRevealedTarget(el, pad);
    this.rememberStickyClear(step, el);
    this.applyTargetHighlight(el);
    this.refreshClearHoles();
  }

  resolveTarget(step: OnboardingTourStep | null): Element | null {
    if (typeof document === 'undefined' || !step) return null;
    const selectors = [
      step.targetSelector,
      ...(step.fallbackSelectors ?? []),
    ].filter(Boolean) as string[];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  private matchedSelector(step: OnboardingTourStep, el: Element): string {
    const selectors = [
      step.targetSelector,
      ...(step.fallbackSelectors ?? []),
    ].filter(Boolean) as string[];
    for (const sel of selectors) {
      try {
        if (el.matches(sel) || el.closest(sel) === el) return sel;
      } catch {
        /* invalid selector */
      }
      if (document.querySelector(sel) === el) return sel;
    }
    return step.targetSelector ?? selectors[0] ?? '';
  }

  /** Garde le nœud spotlighté (pas ses cousins du même sélecteur). */
  private rememberRevealedTarget(el: Element, pad: number): void {
    const known = this.revealedTargets.find((entry) => entry.el === el);
    if (known) {
      known.pad = pad;
      return;
    }
    this.revealedTargets.push({ el, pad });
  }

  private rememberStickyClear(step: OnboardingTourStep, el: Element): void {
    // Sticky opt-in uniquement (défaut false) — évite d’empiler de grandes zones nettes.
    if (step.stickyClear !== true) return;
    if (!step.targetSelector && !step.fallbackSelectors?.length) return;
    const sel = this.matchedSelector(step, el);
    if (!sel) return;
    if (!this.stickyClears.some((s) => s.sel === sel)) {
      this.stickyClears = [
        ...this.stickyClears,
        { sel, pad: step.pad ?? 0, lift: true },
      ];
    }
    el.classList.add(FOCUS_CLASS);
    this.stickyFocusEls.add(el);
  }

  private refreshClearHoles(): void {
    if (typeof document === 'undefined') {
      this.clearHoles.set([]);
      return;
    }
    const holes: SpotlightRect[] = [];
    const seen = new Set<string>();
    const pushHole = (rect: SpotlightRect, el?: Element | null): void => {
      const key = `${Math.round(rect.left)}:${Math.round(rect.top)}:${Math.round(rect.width)}:${Math.round(rect.height)}`;
      if (seen.has(key)) return;
      seen.add(key);
      holes.push(rect);
      if (el) {
        el.classList.add(FOCUS_CLASS);
        this.stickyFocusEls.add(el);
      }
    };

    for (const entry of this.revealedTargets) {
      if (!entry.el.isConnected) continue;
      const rect = this.rectFromElement(entry.el, entry.pad);
      if (rect) pushHole(rect);
    }

    for (const entry of this.stickyClears) {
      for (const el of this.queryAllVisible(entry.sel)) {
        const rect = this.rectFromElement(el, entry.pad);
        // lift=false pour les drawers (évite position:relative qui casse l’absolu).
        if (rect) pushHole(rect, entry.lift ? el : null);
      }
    }

    const step = this.step();
    const interactive = step?.interactive !== false;
    const current = this.spotlight();
    if (interactive && current) {
      pushHole(current);
    }

    // Menus / drawers de l’étape courante uniquement (jamais sticky).
    if (interactive && step?.revealSelectors?.length) {
      const pad = step.pad ?? 0;
      for (const sel of step.revealSelectors) {
        for (const el of this.queryAllVisible(sel)) {
          const rect = this.rectFromElement(el, pad);
          if (rect) pushHole(rect);
        }
      }
    }

    this.publishHoles(holes);
  }

  /**
   * Le lure scale(1.1) fait osciller getBoundingClientRect.
   * On ne republie le trou que s’il a vraiment bougé, sinon le voile
   * est redessiné à chaque frame et l’image du hub saute.
   */
  private publishSpotlight(rect: SpotlightRect): void {
    const prev = this.spotlight();
    if (prev && this.nearRect(prev, rect)) return;
    this.spotlight.set(this.roundRect(rect));
  }

  private publishHoles(holes: SpotlightRect[]): void {
    const prev = this.clearHoles();
    if (
      prev.length === holes.length &&
      holes.every((hole, i) => this.nearRect(prev[i], hole))
    ) {
      return;
    }
    this.clearHoles.set(holes.map((hole) => this.roundRect(hole)));
  }

  private nearRect(a: SpotlightRect, b: SpotlightRect): boolean {
    return (
      Math.abs(a.top - b.top) < 1.25 &&
      Math.abs(a.left - b.left) < 1.25 &&
      Math.abs(a.width - b.width) < 1.25 &&
      Math.abs(a.height - b.height) < 1.25
    );
  }

  private roundRect(rect: SpotlightRect): SpotlightRect {
    return {
      top: Math.round(rect.top),
      left: Math.round(rect.left),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    };
  }

  /** Éléments matchant un sélecteur, visibles (taille > 0). */
  private queryAllVisible(sel: string): Element[] {
    try {
      return Array.from(document.querySelectorAll(sel)).filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width >= 2 && r.height >= 2;
      });
    } catch {
      return [];
    }
  }

  /**
   * Observe l’apparition des drawers / menus (ex. pastille Live)
   * pour déflouter `revealSelectors` sans quitter le tutoriel.
   */
  private startDomObserver(): void {
    this.stopDomObserver();
    if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') {
      return;
    }
    this.domObserver = new MutationObserver((records) => {
      if (this.suppressDomObserver || !this.active()) return;
      if (!this.isMeaningfulDomChange(records)) return;
      this.scheduleRevealRefresh();
    });
    this.domObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        'class',
        'hidden',
        'aria-expanded',
        'aria-hidden',
      ],
    });
  }

  private stopDomObserver(): void {
    this.domObserver?.disconnect();
    this.domObserver = null;
    this.revealPassesLeft = 0;
    if (this.revealRefreshTimer != null) {
      window.clearTimeout(this.revealRefreshTimer);
      this.revealRefreshTimer = null;
    }
  }

  /** Ignore le voile tutoriel (évite une boucle quand le mask/clip se met à jour). */
  private isMeaningfulDomChange(records: MutationRecord[]): boolean {
    for (const record of records) {
      if (this.isTourChrome(record.target)) continue;

      if (record.type === 'childList') {
        for (const node of [...record.addedNodes, ...record.removedNodes]) {
          if (this.isTourChrome(node)) continue;
          if (node instanceof Element) return true;
        }
        continue;
      }

      if (record.type === 'attributes') {
        // Ignore le churn de nos classes focus/lure sur la cible déjà suivie.
        if (
          record.attributeName === 'class' &&
          record.target instanceof Element &&
          (this.stickyFocusEls.has(record.target) || record.target === this.pulsedEl)
        ) {
          continue;
        }
        return true;
      }
    }
    return false;
  }

  private isTourChrome(node: Node | null): boolean {
    if (!node) return false;
    if (node instanceof Element) {
      return (
        node.classList.contains('onboarding-tour') ||
        node.closest('.onboarding-tour') != null
      );
    }
    return node.parentElement?.closest('.onboarding-tour') != null;
  }

  /** Rafraîchit spotlight + trous après ouverture async d’un panneau. */
  private scheduleRevealRefresh(): void {
    if (!this.active()) return;
    // Au moins 3 passes espacées pour les drawers peints en async.
    this.revealPassesLeft = Math.max(this.revealPassesLeft, 3);
    if (this.revealRefreshTimer != null) return;

    const tick = (): void => {
      this.revealRefreshTimer = null;
      if (!this.active() || this.revealPassesLeft <= 0) {
        this.revealPassesLeft = 0;
        return;
      }
      this.revealPassesLeft -= 1;
      this.withDomObserverPaused(() => this.refreshSpotlight());
      if (this.revealPassesLeft > 0) {
        const delay = this.revealPassesLeft >= 2 ? 40 : 180;
        this.revealRefreshTimer = window.setTimeout(tick, delay);
      }
    };

    requestAnimationFrame(tick);
  }

  private withDomObserverPaused(fn: () => void): void {
    this.suppressDomObserver = true;
    try {
      fn();
    } finally {
      // Defer re-enable so sync mutation callbacks from this refresh are ignored.
      Promise.resolve().then(() => {
        this.suppressDomObserver = false;
      });
    }
  }
  private rectFromElement(el: Element, pad: number): SpotlightRect | null {
    // Ignore le scale du lure pour caler le trou pile sur la div (pas plus large).
    const r = this.unscaledClientRect(el);
    if (r.width < 2 || r.height < 2) return null;
    return {
      top: Math.max(0, r.top - pad),
      left: Math.max(0, r.left - pad),
      width: Math.min(
        window.innerWidth - Math.max(0, r.left - pad),
        r.width + pad * 2,
      ),
      height: Math.min(
        window.innerHeight - Math.max(0, r.top - pad),
        r.height + pad * 2,
      ),
    };
  }

  private unscaledClientRect(el: Element): {
    top: number;
    left: number;
    width: number;
    height: number;
  } {
    const r = el.getBoundingClientRect();
    const t = getComputedStyle(el).transform;
    if (!t || t === 'none') {
      return { top: r.top, left: r.left, width: r.width, height: r.height };
    }
    try {
      const m = new DOMMatrixReadOnly(t);
      const sx = Math.hypot(m.a, m.b) || 1;
      const sy = Math.hypot(m.c, m.d) || 1;
      const width = r.width / sx;
      const height = r.height / sy;
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      return {
        left: cx - width / 2,
        top: cy - height / 2,
        width,
        height,
      };
    } catch {
      return { top: r.top, left: r.left, width: r.width, height: r.height };
    }
  }

  resetProgress(): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    this.clearTimeout();
    this.stopDomObserver();
    this.status.set('idle');
    this.stepIndex.set(0);
    this.spotlight.set(null);
    this.clearHoles.set([]);
    this.clearStickyFocus();
    this.clearPulse();
    this.clearEntryPose();
    this.applyDomClass(false);
  }

  /** Relance le tutoriel (Quêtes / settings). */
  replay(): boolean {
    this.clearTimeout();
    this.stopDomObserver();
    this.clearPulse();
    this.clearStickyFocus();
    this.clearEntryPose();
    this.spotlight.set(null);
    this.clearHoles.set([]);
    this.resumeAfterDrawer = false;
    this.drawerWasOpen = false;
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(ONBOARDING_STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
    this.status.set('idle');
    this.stepIndex.set(0);
    this.applyDomClass(false);
    return this.start();
  }

  private enterCurrentStep(): void {
    const step = this.step();
    if (!step) return;
    // Funnel : grossissement fort sur Inscription / Connexion.
    const isAuthCta = step.id === 'register' || step.id === 'login';
    this.lureActive.set(
      Boolean(step.targetSelector || step.fallbackSelectors?.length) &&
        step.id !== 'park' &&
        !this.reducedMotion(),
    );
    this.runEnterAction(step);
    this.scheduleTimeout();
    this.refreshSpotlight();
    // Panneaux ouverts via enterAction / click : déflouter dès qu’ils apparaissent.
    this.scheduleRevealRefresh();
    // Cible auth parfois pas encore peinte — retries + scroll (ne jamais skipper l’étape).
    this.clearSpotlightRetry();
    const needsScroll =
      isAuthCta ||
      step.id === 'whitepaper' ||
      step.id === 'wiki' ||
      step.id === 'collapse-panels' ||
      step.id.startsWith('pillar-') ||
      step.id === 'peg-chf';
    const retryMs = this.reducedMotion() ? 80 : isAuthCta ? 80 : 280;
    this.spotlightRetryTimer = window.setTimeout(() => {
      this.spotlightRetryTimer = null;
      if (this.step()?.id !== step.id) return;
      if (needsScroll) {
        this.resolveTarget(step)?.scrollIntoView({
          block: 'nearest',
          inline: 'nearest',
          behavior: 'auto',
        });
      }
      this.refreshSpotlight();
      if ((isAuthCta || needsScroll) && !this.resolveTarget(step)) {
        this.spotlightRetryTimer = window.setTimeout(() => {
          this.spotlightRetryTimer = null;
          if (this.step()?.id !== step.id) return;
          this.refreshSpotlight();
        }, 160);
      }
    }, retryMs);
  }

  private runEnterAction(step: OnboardingTourStep): void {
    switch (step.enterAction) {
      case 'expand-showcase-r4v3':
        this.showcaseNav.requestTab('r4v3');
        break;
      case 'expand-showcase-rv23':
        this.showcaseNav.requestTab('rv23');
        break;
      case 'expand-showcase-daonews':
        this.showcaseNav.requestTab('daonews');
        break;
      case 'expand-showcase-dao':
        this.showcaseNav.requestTab('dao');
        break;
      case 'expand-showcase-market':
        this.showcaseNav.requestTab('market');
        break;
      case 'expand-showcase-tours':
        this.showcaseNav.requestTab('tours');
        break;
      case 'expand-dock-wallet':
        this.dockNav.requestTab('wallet');
        break;
      case 'expand-dock-faucet':
        this.dockNav.requestTab('faucet');
        break;
      case 'expand-dock-quests':
        this.dockNav.requestTab('quests');
        break;
      case 'expand-dock-chain':
        this.dockNav.requestTab('chain');
        break;
      case 'expand-dock-peers':
        this.dockNav.requestTab('peers');
        break;
      case 'expand-dock-transactions':
        this.dockNav.requestTab('transactions');
        break;
      case 'expand-chart':
        this.clickIfPresent(
          '.app-market-card--rate.is-summary-expandable',
          '.app-market-stack--rate .is-summary-expandable',
        );
        break;
      case 'collapse-chart': {
        const open = document.querySelector(
          '.app-market-stack--rate:not(.is-chart-collapsed)',
        );
        if (!open) break;
        const btn =
          (open.querySelector(
            'button[aria-label*="Réduire"], button[aria-label*="replier"], .collapsed-bar-actions__collapse',
          ) as HTMLElement | null) ?? null;
        btn?.click();
        break;
      }
      case 'scroll-floor': {
        const open = document.querySelector(
          '.app-market-stack--rate:not(.is-chart-collapsed)',
        );
        if (open) {
          const btn = open.querySelector(
            'button[aria-label*="Réduire"], button[aria-label*="replier"], .collapsed-bar-actions__collapse',
          ) as HTMLElement | null;
          btn?.click();
        }
        document
          .querySelector('app-three-floor, .arena-hud__strip')
          ?.scrollIntoView({
            behavior: this.reducedMotion() ? 'auto' : 'smooth',
            block: 'center',
          });
        break;
      }
      case 'park-logo':
        document.querySelector('.logo-shell')?.scrollIntoView({
          behavior: this.reducedMotion() ? 'auto' : 'smooth',
          block: 'nearest',
        });
        break;
      case 'finish-hub':
        this.restoreHubAfterTour();
        break;
    }
  }

  /**
   * Fin du tutoriel : remonte showcase (NEWS), dock (faucet) et graph.
   */
  private restoreHubAfterTour(): void {
    if (typeof document === 'undefined') return;
    this.showcaseNav.requestTab('tours');
    if (this.product.faucetEnabled) {
      this.dockNav.requestTab('faucet');
    } else {
      this.dockNav.requestTab('wallet');
    }
    // Déplie le graph s’il est encore en smart-bar.
    const collapsedChart = document.querySelector(
      '.app-market-stack--rate.is-chart-collapsed, .app-market-card--rate.is-summary-expandable',
    );
    if (collapsedChart) {
      this.clickIfPresent(
        '.app-market-card--rate.is-summary-expandable',
        '.app-market-stack--rate .is-summary-expandable',
        '.app-market-stack--rate .panel-collapse-control',
      );
    }
  }

  private clickIfPresent(...selectors: string[]): void {
    for (const sel of selectors) {
      const el = document.querySelector(sel) as HTMLElement | null;
      if (el) {
        el.click();
        return;
      }
    }
  }

  private pauseForDrawer(): void {
    if (this.status() !== 'running') return;
    this.clearTimeout();
    this.resumeAfterDrawer = true;
    this.status.set('paused');
    // Défloute le tiroir auth pendant la pause.
    this.scheduleRevealRefresh();
  }

  private scheduleTimeout(): void {
    if (this.stepTimer != null) {
      window.clearTimeout(this.stepTimer);
      this.stepTimer = null;
    }
    if (typeof window === 'undefined') return;
    if (this.status() !== 'running') return;
    const step = this.step();
    if (!step) return;
    const ms = step.timeoutMs ?? ONBOARDING_AUTO_ADVANCE_MS;
    if (ms <= 0) return;
    const delay = this.reducedMotion() ? Math.min(ms, 2000) : ms;
    this.stepTimer = window.setTimeout(() => {
      this.stepTimer = null;
      if (this.status() !== 'running') return;
      this.next();
    }, delay);
  }

  private clearTimeout(): void {
    if (this.stepTimer != null) {
      window.clearTimeout(this.stepTimer);
      this.stepTimer = null;
    }
    this.clearSpotlightRetry();
  }

  private clearSpotlightRetry(): void {
    if (this.spotlightRetryTimer != null) {
      window.clearTimeout(this.spotlightRetryTimer);
      this.spotlightRetryTimer = null;
    }
  }

  /** Arrête le grossissement ; la cible reste nette (spotlight). */
  stopLure(): void {
    this.lureActive.set(false);
    if (this.pulsedEl) {
      this.pulsedEl.classList.remove(LURE_CLASS);
    }
  }

  private applyTargetHighlight(el: Element): void {
    if (this.pulsedEl && this.pulsedEl !== el) {
      this.disarmTargetClick();
      this.pulsedEl.classList.remove(LURE_CLASS, 'onboarding-tour-target-pulse');
      // Garde l’illumination sur Inscription / Connexion déjà révélées.
      if (!this.stickyFocusEls.has(this.pulsedEl)) {
        this.pulsedEl.classList.remove(FOCUS_CLASS);
      }
      this.pulsedEl = null;
    }
    if (this.pulsedEl !== el) {
      el.classList.add(FOCUS_CLASS);
      this.pulsedEl = el;
      this.armTargetClick(el);
    }
    if (this.lureActive() && !this.reducedMotion()) {
      el.classList.add(LURE_CLASS);
    } else {
      el.classList.remove(LURE_CLASS);
    }
  }

  private armTargetClick(el: Element): void {
    this.disarmTargetClick();
    this.targetClickBound = () => {
      this.stopLure();
      // Pas d’auto-avance : l’utilisateur clique Suivant pour changer de bulle.
      // L’action (drawer Live, menu token, etc.) peint après le pointerdown.
      this.scheduleRevealRefresh();
    };
    el.addEventListener('pointerdown', this.targetClickBound, true);
  }

  private disarmTargetClick(): void {
    if (!this.targetClickBound || !this.pulsedEl) {
      this.targetClickBound = undefined;
      return;
    }
    this.pulsedEl.removeEventListener('pointerdown', this.targetClickBound, true);
    this.targetClickBound = undefined;
  }

  private clearPulse(): void {
    this.disarmTargetClick();
    if (this.pulsedEl) {
      this.pulsedEl.classList.remove(LURE_CLASS, 'onboarding-tour-target-pulse');
      if (!this.stickyFocusEls.has(this.pulsedEl)) {
        this.pulsedEl.classList.remove(FOCUS_CLASS);
      }
      this.pulsedEl = null;
    }
  }

  private clearStickyFocus(): void {
    for (const el of this.stickyFocusEls) {
      el.classList.remove(FOCUS_CLASS, LURE_CLASS, 'onboarding-tour-target-pulse');
    }
    this.stickyFocusEls.clear();
    this.stickyClears = [];
    this.revealedTargets = [];
  }

  private teardownRuntime(): void {
    this.clearTimeout();
    this.stopDomObserver();
    this.stopLure();
    this.clearPulse();
    this.clearStickyFocus();
    this.clearEntryPose();
    this.spotlight.set(null);
    this.clearHoles.set([]);
    this.resumeAfterDrawer = false;
    this.applyDomClass(false);
    this.relay.setIntroHold(false);
    this.relay.releaseAfterIntro();
  }

  private readDone(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const raw = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw) as { done?: boolean };
      return Boolean(parsed?.done);
    } catch {
      return false;
    }
  }

  private persistDone(how: 'done' | 'skipped'): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        ONBOARDING_STORAGE_KEY,
        JSON.stringify({ done: true, how, at: Date.now() }),
      );
    } catch {
      /* ignore quota */
    }
  }

  private applyDomClass(on: boolean): void {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('onboarding-tour-active', on);
  }
}
