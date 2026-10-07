import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  effect,
  inject,
} from '@angular/core';
import { LocaleService } from '@core/i18n/locale.service';
import {
  onboardingStepCopy,
  onboardingUi,
} from './onboarding-tour.i18n';
import { OnboardingTourService } from './onboarding-tour.service';
import { TourLogoTraveler } from './tour-logo-traveler';

type BubblePlacement = 'below' | 'above' | 'left' | 'right';

/**
 * Voile + spotlight + traveler logo.stl + bulle BD (T1–T4).
 */
@Component({
  selector: 'app-onboarding-tour-overlay',
  standalone: true,
  imports: [TourLogoTraveler],
  templateUrl: './onboarding-tour-overlay.html',
  styleUrl: './onboarding-tour-overlay.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingTourOverlay {
  protected readonly tour = inject(OnboardingTourService);
  private readonly locale = inject(LocaleService);

  protected readonly ui = computed(() => onboardingUi(this.locale.locale()));
  protected readonly stepView = computed(() => {
    const step = this.tour.step();
    if (!step) return null;
    const copy = onboardingStepCopy(this.locale.locale(), step.id, {
      title: step.title,
      body: step.body,
    });
    return { ...step, title: copy.title, body: copy.body };
  });

  protected readonly hole = computed(() => this.tour.spotlight());

  /**
   * Token visible seulement avec pose d’entrée ou spotlight —
   * jamais le fallback mid-écran (source du pop bizarre Feed → hub).
   */
  protected readonly showTourToken = computed(() => {
    if (this.tour.entryPose()) return true;
    if (this.hole()) return true;
    const step = this.tour.step();
    // Étapes sans cible (ex. park) : token flottant OK.
    return !!step && !step.targetSelector;
  });

  /** Centre + taille du personnage logo. */
  protected readonly tokenPose = computed(() => {
    const entry = this.tour.entryPose();
    // Relais Feed → tutoriel : pose figée sous Live (intro a déjà descendu).
    if (entry) {
      return {
        cx: entry.x,
        cy: entry.y,
        size: entry.size,
        left: entry.x - entry.size / 2,
        top: entry.y - entry.size / 2,
      };
    }

    const hole = this.hole();
    const step = this.tour.step();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const narrow = vw <= 280;
    const isFloating = !step?.targetSelector && !hole;
    const anchor = step?.tokenAnchor ?? 'below';
    const size = isFloating ? (narrow ? 48 : 56) : narrow ? 34 : 40;
    const edge = 4;
    const gap = narrow ? 6 : 8;

    // Première bulle Live sans hole encore : reste hors cadre (pas de pop mid).
    if (!hole && step?.id === 'network-status') {
      const cx = vw * 0.5;
      const cy = -size;
      return {
        cx,
        cy,
        size,
        left: cx - size / 2,
        top: cy - size / 2,
      };
    }

    if (!hole || isFloating) {
      // Flottant hors première étape : haut d’écran seulement (jamais mid vh*0.16).
      const cx = vw * 0.5;
      const cy = size * 0.75 + 10;
      return {
        cx,
        cy,
        size,
        left: Math.min(Math.max(cx - size / 2, edge), vw - size - edge),
        top: Math.min(Math.max(cy - size / 2, edge), vh - size - edge),
      };
    }

    const hx = hole.left + hole.width / 2;
    const hy = hole.top + hole.height / 2;
    const layout = step?.layout ?? 'default';
    let cx = hx;
    let cy =
      anchor === 'above'
        ? hole.top - gap - size / 2
        : hole.top + hole.height + gap + size / 2;

    if (layout === 'token-left') {
      cx = Math.max(edge + size / 2, hole.left - gap - size / 2);
      cy = hy;
    } else if (layout === 'token-right') {
      cx = Math.min(vw - edge - size / 2, hole.left + hole.width + gap + size / 2);
      cy = hy;
    }

    // Si hors écran verticalement, bascule de l’autre côté.
    if (layout !== 'token-left' && layout !== 'token-right') {
      if (cy - size / 2 < edge) {
        cy = hole.top + hole.height + gap + size / 2;
      }
      if (cy + size / 2 > vh - edge) {
        cy = Math.max(edge + size / 2, hole.top - gap - size / 2);
      }
    }

    cx = Math.min(Math.max(cx, size / 2 + edge), vw - size / 2 - edge);
    cy = Math.min(Math.max(cy, size / 2 + edge), vh - size / 2 - edge);
    return {
      cx,
      cy,
      size,
      left: cx - size / 2,
      top: cy - size / 2,
    };
  });

  protected readonly bubbleLayout = computed(() => {
    const token = this.tokenPose();
    const step = this.tour.step();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 6;
    const bubbleW = Math.min(160, Math.max(120, vw - margin * 2));
    const bubbleH = Math.min(110, Math.max(92, vh * 0.2));
    const gap = vw <= 280 ? 6 : 8;
    const layout = step?.layout ?? 'default';
    const preferAbove =
      step?.tokenAnchor === 'above' || layout === 'bubble-above';

    type Result = {
      top: number;
      left: number;
      width: number;
      placement: BubblePlacement;
      tailOffset: number;
    };

    const clampBox = (
      top: number,
      left: number,
      placement: BubblePlacement,
    ): Result => {
      const maxLeft = Math.max(margin, vw - bubbleW - margin);
      const maxTop = Math.max(margin, vh - bubbleH - margin);
      const L = Math.min(Math.max(left, margin), maxLeft);
      const T = Math.min(Math.max(top, margin), maxTop);
      const tailX = Math.min(Math.max(token.cx - L, 12), bubbleW - 12);
      const tailY = Math.min(Math.max(token.cy - T, 12), bubbleH - 12);
      return {
        top: T,
        left: L,
        width: bubbleW,
        placement,
        tailOffset:
          placement === 'left' || placement === 'right' ? tailY : tailX,
      };
    };

    const belowTop = token.cy + token.size / 2 + gap;
    const aboveTop = token.cy - token.size / 2 - gap - bubbleH;
    const centeredLeft = token.cx - bubbleW / 2;
    const leftOfToken = token.cx - token.size / 2 - gap - bubbleW;
    const rightOfToken = token.cx + token.size / 2 + gap;

    if (layout === 'bubble-left' || layout === 'token-left') {
      if (leftOfToken >= margin) {
        return clampBox(token.cy - bubbleH / 2, leftOfToken, 'left');
      }
      if (rightOfToken + bubbleW <= vw - margin) {
        return clampBox(token.cy - bubbleH / 2, rightOfToken, 'right');
      }
    }

    if (layout === 'bubble-right' || layout === 'token-right') {
      if (rightOfToken + bubbleW <= vw - margin) {
        return clampBox(token.cy - bubbleH / 2, rightOfToken, 'right');
      }
      if (leftOfToken >= margin) {
        return clampBox(token.cy - bubbleH / 2, leftOfToken, 'left');
      }
      // Graph / token à droite : bulle sous le token, hors du graph.
      return clampBox(belowTop, Math.min(centeredLeft, vw - bubbleW - margin), 'below');
    }

    if (preferAbove) {
      if (aboveTop >= margin) {
        return clampBox(aboveTop, centeredLeft, 'above');
      }
      return clampBox(belowTop, centeredLeft, 'below');
    }

    if (layout === 'bubble-below' || layout === 'default') {
      if (belowTop + bubbleH <= vh - margin) {
        return clampBox(belowTop, centeredLeft, 'below');
      }
      if (aboveTop >= margin) {
        return clampBox(aboveTop, centeredLeft, 'above');
      }
    }

    if (belowTop + bubbleH <= vh - margin) {
      return clampBox(belowTop, centeredLeft, 'below');
    }
    if (aboveTop >= margin) {
      return clampBox(aboveTop, centeredLeft, 'above');
    }
    return clampBox(margin, centeredLeft, 'below');
  });

  /**
   * Voile sombre plein écran, trou(s) en evenodd.
   * Pas de backdrop-filter ni de mask-image : ces deux-là rééchantillonnent
   * le hub (WebGL inclus) à chaque trou et font sauter l’image.
   */
  protected readonly veilShape = computed(() => {
    const holes = this.tour.clearHoles();
    const vw = typeof window !== 'undefined' ? window.innerWidth : 0;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 0;
    if (!vw || !vh) return { viewBox: '0 0 1 1', d: '' };
    let d = `M0,0H${vw}V${vh}H0Z`;
    for (const h of holes) {
      const x = h.left;
      const y = h.top;
      const r = x + h.width;
      const b = y + h.height;
      d += `M${x},${y}H${r}V${b}H${x}Z`;
    }
    return { viewBox: `0 0 ${vw} ${vh}`, d };
  });

  protected readonly veilClip = computed(() => {
    const holes = this.tour.clearHoles();
    const vw = typeof window !== 'undefined' ? window.innerWidth : 0;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 0;
    if (!vw || !vh) return 'none';
    // Evenodd : écran plein moins chaque trou → bloque les clics hors zones nettes.
    let d = `M0,0H${vw}V${vh}H0Z`;
    for (const h of holes) {
      const x = h.left;
      const y = h.top;
      const r = x + h.width;
      const b = y + h.height;
      d += `M${x},${y}H${r}V${b}H${x}Z`;
    }
    return `path(evenodd, "${d}")`;
  });

  constructor() {
    effect(() => {
      if (!this.tour.active()) return;
      this.tour.step();
      requestAnimationFrame(() => this.tour.refreshSpotlight());
    });

    // Handoff atterrit déjà sur Live : libère l’entry sans second trajet.
    effect((onCleanup) => {
      if (!this.tour.active() || !this.tour.entryPose()) return;
      let cancelled = false;
      const id = window.setTimeout(() => {
        if (!cancelled) this.tour.clearEntryPose();
      }, 40);
      onCleanup(() => {
        cancelled = true;
        window.clearTimeout(id);
      });
    });
  }

  @HostListener('window:resize')
  @HostListener('window:orientationchange')
  @HostListener('window:scroll')
  @HostListener('document:scroll')
  onViewportChange(): void {
    if (!this.tour.active()) return;
    this.tour.refreshSpotlight();
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (!this.tour.active()) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.tour.skip();
    }
  }

  protected skip(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.tour.skip();
  }

  protected back(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    if (this.tour.paused() || this.tour.isFirstStep()) return;
    this.tour.back();
  }

  protected next(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    if (this.tour.paused()) return;
    this.tour.next();
  }
}
