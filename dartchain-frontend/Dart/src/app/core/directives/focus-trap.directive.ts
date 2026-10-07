import {
  Directive,
  ElementRef,
  HostListener,
  Input,
  OnChanges,
  SimpleChanges,
  inject,
} from '@angular/core';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

@Directive({
  selector: '[appFocusTrap]',
  standalone: true,
})
export class FocusTrapDirective implements OnChanges {
  @Input({ alias: 'appFocusTrap', required: true }) active = false;

  private readonly host = inject(ElementRef<HTMLElement>);
  private previouslyFocused: HTMLElement | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['active']) {
      return;
    }

    if (this.active) {
      this.previouslyFocused = document.activeElement as HTMLElement | null;
      queueMicrotask(() => this.focusFirst());
      return;
    }

    this.previouslyFocused?.focus();
    this.previouslyFocused = null;
  }

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (!this.active || event.key !== 'Tab') {
      return;
    }

    const elements = this.getFocusableElements();
    if (!elements.length) {
      return;
    }

    const first = elements[0];
    const last = elements[elements.length - 1];
    const activeElement = document.activeElement;

    if (event.shiftKey && activeElement === first) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!event.shiftKey && activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private getFocusableElements(): HTMLElement[] {
    const nodeList = this.host.nativeElement.querySelectorAll(FOCUSABLE_SELECTOR);
    const focusable: HTMLElement[] = [];

    for (let index = 0; index < nodeList.length; index += 1) {
      const element = nodeList.item(index) as HTMLElement | null;
      if (element && !element.hasAttribute('disabled') && element.tabIndex !== -1) {
        focusable.push(element);
      }
    }

    return focusable;
  }

  private focusFirst(): void {
    this.getFocusableElements()[0]?.focus();
  }
}
