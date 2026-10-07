import {
  Directive,
  ElementRef,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  Renderer2,
  inject,
} from '@angular/core';

let navbarHintIdCounter = 0;

/**
 * Tooltip accessible au survol / focus clavier via aria-describedby.
 * Enveloppe l’élément hôte dans .navbar-hint-wrap pour ne pas casser le flex parent.
 */
@Directive({
  selector: '[appNavbarHint]',
  standalone: true,
})
export class NavbarHintDirective implements OnInit, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly renderer = inject(Renderer2);

  @Input('appNavbarHint') hint = '';

  private tooltipEl: HTMLElement | null = null;
  private wrapperEl: HTMLElement | null = null;
  private readonly tooltipId = `navbar-hint-${++navbarHintIdCounter}`;

  ngOnInit(): void {
    const element = this.host.nativeElement;
    if (!this.hint.trim()) {
      return;
    }

    const parent = element.parentElement;
    if (!parent) {
      return;
    }

    this.wrapperEl = this.renderer.createElement('span');
    this.renderer.addClass(this.wrapperEl, 'navbar-hint-wrap');
    this.renderer.insertBefore(parent, this.wrapperEl, element);
    this.renderer.appendChild(this.wrapperEl, element);

    this.tooltipEl = this.renderer.createElement('span');
    this.renderer.addClass(this.tooltipEl, 'navbar-hint__tooltip');
    this.renderer.setAttribute(this.tooltipEl, 'id', this.tooltipId);
    this.renderer.setAttribute(this.tooltipEl, 'role', 'tooltip');
    this.renderer.setProperty(this.tooltipEl, 'textContent', this.hint.trim());
    this.renderer.appendChild(this.wrapperEl, this.tooltipEl);
    this.renderer.setAttribute(element, 'aria-describedby', this.tooltipId);
  }

  ngOnDestroy(): void {
    if (this.tooltipEl?.parentElement) {
      this.renderer.removeChild(this.tooltipEl.parentElement, this.tooltipEl);
    }

    const element = this.host.nativeElement;
    const parent = this.wrapperEl?.parentElement;
    if (this.wrapperEl && parent) {
      this.renderer.insertBefore(parent, element, this.wrapperEl);
      this.renderer.removeChild(parent, this.wrapperEl);
    }
  }

  @HostListener('keydown.escape')
  onEscape(): void {
    this.host.nativeElement.blur();
  }
}
