import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { StarConquestStateService } from '@star-conquest/services/star-conquest-state.service';
import { recordStarConquestDiag } from './star-conquest-diagnostics';
import { STAR_CONQUEST_CONTROLS } from './star-conquest-controls.config';
import { STAR_CONQUEST_FEATURES } from './star-conquest-features';
import { normalizeStarConquestStick } from './star-conquest-input';
import {
  beginStarConquestPointerStroke,
  starConquestStrokeIsTap,
  updateStarConquestPointerStroke,
  type StarConquestPointerStroke,
} from './star-conquest-pointer-safety';

/**
 * Stick de pan univers — overlay exclusif 250×550.
 * Distinct des joysticks MOVE/VIEW du floor (hors périmètre).
 */
@Component({
  selector: 'app-star-conquest-pan-stick',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (enabled && !orbitHidesStick && !state.scannerOpen() && !state.helpOpen()) {
      <div
        class="sc-pan-stick"
        role="application"
        aria-label="Déplacer l’univers Star Conquest"
        (pointerdown)="onDown($event)"
        (pointermove)="onMove($event)"
        (pointerup)="onUp($event)"
        (pointercancel)="onCancel($event)"
      >
        <span class="sc-pan-stick__base" aria-hidden="true"></span>
        <span
          class="sc-pan-stick__knob"
          [style.transform]="knobTransform()"
          aria-hidden="true"
        ></span>
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: contents;
      }
      .sc-pan-stick {
        position: fixed;
        z-index: 120;
        left: 50%;
        bottom: calc(var(--sc-overlay-floor-chrome, 86px) + 6px);
        width: 44px;
        height: 44px;
        margin: 0;
        transform: translateX(-50%);
        touch-action: none;
        pointer-events: auto;
        -webkit-user-select: none;
        user-select: none;
      }
      .sc-pan-stick__base,
      .sc-pan-stick__knob {
        position: absolute;
        border-radius: 50%;
      }
      .sc-pan-stick__base {
        inset: 0;
        border: 1px solid rgba(160, 210, 230, 0.35);
        background: radial-gradient(
          circle at 35% 30%,
          rgba(255, 255, 255, 0.18),
          rgba(8, 10, 16, 0.72) 70%
        );
      }
      .sc-pan-stick__knob {
        left: 50%;
        top: 50%;
        width: 16px;
        height: 16px;
        margin: -8px 0 0 -8px;
        background: rgba(210, 236, 255, 0.92);
        box-shadow: 0 0 8px rgba(80, 200, 255, 0.45);
      }
    `,
  ],
})
export class StarConquestPanStickComponent {
  readonly state = inject(StarConquestStateService);
  readonly enabled = STAR_CONQUEST_FEATURES.panStick;
  readonly orbitHidesStick = STAR_CONQUEST_FEATURES.canvasOrbit;
  readonly knobTransform = signal('translate(0px, 0px)');

  private stroke: StarConquestPointerStroke | null = null;
  private origin: { x: number; y: number } | null = null;

  onDown(event: PointerEvent): void {
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    this.stroke = beginStarConquestPointerStroke(event.pointerId, event.clientX, event.clientY);
    this.origin = { x: event.clientX, y: event.clientY };
    recordStarConquestDiag('stick-start');
    this.apply(event.clientX, event.clientY);
  }

  onMove(event: PointerEvent): void {
    if (!this.stroke || event.pointerId !== this.stroke.pointerId) return;
    event.stopPropagation();
    this.stroke = updateStarConquestPointerStroke(this.stroke, event.clientX, event.clientY);
    this.apply(event.clientX, event.clientY);
  }

  onUp(event: PointerEvent): void {
    if (!this.stroke || event.pointerId !== this.stroke.pointerId) return;
    event.stopPropagation();
    const wasTap = starConquestStrokeIsTap(this.stroke);
    this.reset();
    if (wasTap) recordStarConquestDiag('stick-end', 'tap');
    else recordStarConquestDiag('stick-end');
  }

  onCancel(event: PointerEvent): void {
    if (this.stroke && event.pointerId !== this.stroke.pointerId) return;
    recordStarConquestDiag('pointer-cancel', 'pan-stick');
    this.reset();
  }

  private apply(clientX: number, clientY: number): void {
    if (!this.origin) return;
    const radius = STAR_CONQUEST_CONTROLS.panStickSizePx * 0.5;
    const nx = (clientX - this.origin.x) / radius;
    const ny = (clientY - this.origin.y) / radius;
    const intent = normalizeStarConquestStick(nx, ny, {
      deadzone: STAR_CONQUEST_CONTROLS.stickDeadzone,
    });
    this.state.setStick(intent.x, intent.y);
    const kx = intent.x * 10;
    const ky = intent.y * 10;
    this.knobTransform.set(`translate(${kx}px, ${ky}px)`);
  }

  private reset(): void {
    this.stroke = null;
    this.origin = null;
    this.knobTransform.set('translate(0px, 0px)');
    this.state.endStick();
  }
}
