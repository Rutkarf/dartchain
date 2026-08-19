import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnDestroy,
  Output,
  ViewChild,
  inject,
} from '@angular/core';

export interface JoystickVector {
  x: number;
  y: number;
}

/**
 * Joystick virtuel — mises à jour DOM hors NgZone (pas de CD à chaque move).
 */
@Component({
  selector: 'app-virtual-joystick',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      #zone
      class="vj-zone"
      [attr.aria-label]="ariaLabel"
      role="application"
      (pointerdown)="onPointerDown($event)"
    >
      <div class="vj-base" [class.vj-base-walk-run]="walkRunRings">
        @if (walkRunRings) {
          <div class="vj-ring vj-ring-run" aria-hidden="true"></div>
          <div class="vj-ring vj-ring-walk" aria-hidden="true"></div>
        }
      </div>
      <div #knob class="vj-knob"></div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: var(--vj-size, 120px);
        height: var(--vj-size, 120px);
        pointer-events: auto;
        touch-action: none;
        user-select: none;
        -webkit-user-select: none;
      }
      .vj-zone {
        position: relative;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        overflow: hidden;
        cursor: grab;
      }
      .vj-zone:active {
        cursor: grabbing;
      }
      .vj-base {
        position: absolute;
        inset: var(--vj-face-inset, 0px);
        border-radius: 50%;
        background: radial-gradient(
          circle at 35% 30%,
          rgba(255, 255, 255, 0.28),
          rgba(20, 28, 36, 0.72) 55%,
          rgba(8, 12, 18, 0.82)
        );
        border: 1px solid rgba(0, 180, 220, 0.45);
        box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.12);
      }
      .vj-base-walk-run {
        /* Same base design as VIEW — rings provide the walk/run feedback */
      }
      .vj-ring {
        position: absolute;
        border-radius: 50%;
        pointer-events: none;
        box-sizing: border-box;
      }
      .vj-ring-walk {
        inset: 19%;
        border: 1px solid rgba(64, 224, 255, 0.85);
        box-shadow: 0 0 4px rgba(64, 224, 255, 0.35);
      }
      .vj-ring-run {
        inset: 4%;
        border: 1px dashed rgba(255, 62, 207, 0.7);
      }
      .vj-knob {
        position: absolute;
        left: 50%;
        top: 50%;
        width: var(--vj-knob-size, 36%);
        height: var(--vj-knob-size, 36%);
        margin-left: calc(var(--vj-knob-size, 36%) / -2);
        margin-top: calc(var(--vj-knob-size, 36%) / -2);
        border-radius: 50%;
        background: radial-gradient(
          circle at 30% 25%,
          rgba(255, 255, 255, 0.9),
          rgba(160, 200, 220, 0.55) 70%
        );
        border: 1px solid rgba(0, 180, 220, 0.35);
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
        will-change: transform;
        transform: translate(0px, 0px);
      }
    `,
  ],
})
export class VirtualJoystickComponent implements AfterViewInit, OnDestroy {
  @ViewChild('zone', { static: true }) zoneRef!: ElementRef<HTMLElement>;
  @ViewChild('knob', { static: true }) knobRef!: ElementRef<HTMLElement>;
  @Input() ariaLabel = 'Joystick';
  @Input() walkRunRings = false;
  @Output() readonly vectorChange = new EventEmitter<JoystickVector>();

  private readonly zone = inject(NgZone);
  private readonly host = inject(ElementRef<HTMLElement>);

  private activePointer: number | null = null;
  private radius = 48;
  private readonly onMove = (e: PointerEvent): void => this.onPointerMove(e);
  private readonly onUp = (e: PointerEvent): void => this.onPointerUp(e);

  ngAfterViewInit(): void {
    this.measure();
  }

  ngOnDestroy(): void {
    this.unbindWindow();
    this.emit(0, 0);
  }

  onPointerDown(event: PointerEvent): void {
    if (this.activePointer !== null) return;
    event.preventDefault();
    this.measure();
    this.activePointer = event.pointerId;
    this.zoneRef.nativeElement.setPointerCapture?.(event.pointerId);
    this.zone.runOutsideAngular(() => {
      window.addEventListener('pointermove', this.onMove, { passive: false });
      window.addEventListener('pointerup', this.onUp);
      window.addEventListener('pointercancel', this.onUp);
    });
    this.updateFromEvent(event);
  }

  private onPointerMove(event: PointerEvent): void {
    if (event.pointerId !== this.activePointer) return;
    event.preventDefault();
    this.updateFromEvent(event);
  }

  private onPointerUp(event: PointerEvent): void {
    if (event.pointerId !== this.activePointer) return;
    this.activePointer = null;
    this.unbindWindow();
    this.setKnob(0, 0);
    this.emit(0, 0);
  }

  private updateFromEvent(event: PointerEvent): void {
    const rect = this.zoneRef.nativeElement.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = event.clientX - cx;
    let dy = event.clientY - cy;
    const len = Math.hypot(dx, dy) || 1;
    const max = this.radius;
    if (len > max) {
      dx = (dx / len) * max;
      dy = (dy / len) * max;
    }
    this.setKnob(dx, dy);
    // y inversé : haut écran = avance (y>0)
    this.emit(dx / max, -dy / max);
  }

  private setKnob(dx: number, dy: number): void {
    this.knobRef.nativeElement.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  private emit(x: number, y: number): void {
    this.vectorChange.emit({ x, y });
  }

  private measure(): void {
    const el = this.zoneRef.nativeElement;
    const size = el.clientWidth;
    const styles = getComputedStyle(this.host.nativeElement);
    const inset = Number.parseFloat(styles.getPropertyValue('--vj-face-inset')) || 0;
    const knobRaw = styles.getPropertyValue('--vj-knob-size').trim();
    const knobRatio = knobRaw.endsWith('%')
      ? Number.parseFloat(knobRaw) / 100
      : Number.parseFloat(knobRaw) / Math.max(1, size);
    const faceRadius = Math.max(8, size * 0.5 - inset);
    const knobRadius = (Number.isFinite(knobRatio) ? knobRatio : 0.36) * size * 0.5;
    this.radius = Math.max(6, faceRadius - knobRadius - 1);
  }

  private unbindWindow(): void {
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onUp);
    window.removeEventListener('pointercancel', this.onUp);
  }
}
