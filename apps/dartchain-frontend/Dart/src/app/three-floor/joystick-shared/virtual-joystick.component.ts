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
      <div class="vj-base"></div>
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
        cursor: grab;
      }
      .vj-zone:active {
        cursor: grabbing;
      }
      .vj-base {
        position: absolute;
        inset: 0;
        border-radius: 50%;
        background: radial-gradient(
          circle at 35% 30%,
          rgba(255, 255, 255, 0.22),
          rgba(20, 28, 36, 0.45) 55%,
          rgba(8, 12, 18, 0.55)
        );
        border: 1px solid rgba(0, 180, 220, 0.45);
        box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.12);
        backdrop-filter: blur(6px);
      }
      .vj-knob {
        position: absolute;
        left: 50%;
        top: 50%;
        width: 42%;
        height: 42%;
        margin-left: -21%;
        margin-top: -21%;
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
  @Output() readonly vectorChange = new EventEmitter<JoystickVector>();

  private readonly zone = inject(NgZone);

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
    this.radius = Math.max(24, el.clientWidth * 0.38);
  }

  private unbindWindow(): void {
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onUp);
    window.removeEventListener('pointercancel', this.onUp);
  }
}
