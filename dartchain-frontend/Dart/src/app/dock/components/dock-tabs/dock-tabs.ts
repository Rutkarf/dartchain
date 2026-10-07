import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  QueryList,
  ViewChildren,
  signal,
} from '@angular/core';

export type OverlayPanel =
  | 'pending'
  | 'composer'
  | 'wallet'
  | 'chain'
  | 'peers';

@Component({
  selector: 'app-dock-tabs',
  standalone: true,
  imports: [],
  templateUrl: './dock-tabs.html',
  styleUrl: './dock-tabs.css',
  host: {
    class: 'dock-tabs-host',
    '[attr.data-active-panel]': 'activePanel()',
  },
})
export class DockTabsComponent {
  readonly activePanel = signal<OverlayPanel>('pending');

  @Input() set selectedPanel(value: OverlayPanel) {
    this.activePanel.set(value);
    this.focusedPanel = value;
  }

  @Output() readonly panelChange = new EventEmitter<OverlayPanel>();

  readonly panels: OverlayPanel[] = [
    'pending',
    'composer',
    'chain',
  ];

  @ViewChildren('dockTabButton')
  private readonly tabButtons?: QueryList<ElementRef<HTMLButtonElement>>;

  private focusedPanel: OverlayPanel = 'pending';

  openPanel(panel: OverlayPanel): void {
    this.focusedPanel = panel;
    this.activePanel.set(panel);
    this.panelChange.emit(panel);
  }

  @HostListener('focusin')
  onFocusIn(): void {
    this.focusedPanel = this.activePanel();
  }

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;

    if (!target?.closest('.dock-tabs')) {
      return;
    }

    const currentPanel = this.getCurrentFocusedPanel(target);
    const currentIndex = this.panels.indexOf(currentPanel);

    if (currentIndex < 0) {
      return;
    }

    let nextIndex = currentIndex;

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        nextIndex = (currentIndex + 1) % this.panels.length;
        event.preventDefault();
        this.focusOnly(nextIndex);
        return;

      case 'ArrowUp':
      case 'ArrowLeft':
        nextIndex = (currentIndex - 1 + this.panels.length) % this.panels.length;
        event.preventDefault();
        this.focusOnly(nextIndex);
        return;

      case 'Home':
        event.preventDefault();
        this.focusOnly(0);
        return;

      case 'End':
        event.preventDefault();
        this.focusOnly(this.panels.length - 1);
        return;

      case 'Enter':
      case ' ':
        event.preventDefault();
        this.openPanel(currentPanel);
        return;

      default:
        return;
    }
  }

  private getCurrentFocusedPanel(target: HTMLElement): OverlayPanel {
    const tabId = target.closest('[role="tab"]')?.id;

    switch (tabId) {
      case 'tab-pending':
        return 'pending';
      case 'tab-composer':
        return 'composer';
      case 'tab-chain':
        return 'chain';
      default:
        return this.focusedPanel;
    }
  }

  private focusOnly(index: number): void {
    const panel = this.panels[index];
    this.focusedPanel = panel;

    queueMicrotask(() => {
      const button = this.tabButtons?.get(index)?.nativeElement;
      button?.focus();
    });
  }
}
