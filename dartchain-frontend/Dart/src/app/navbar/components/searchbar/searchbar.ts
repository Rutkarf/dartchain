import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-searchbar',
  standalone: true,
  imports: [],
  templateUrl: './searchbar.html',
  styleUrl: './searchbar.css',
})
export class SearchbarComponent {
  @Output() readonly focusExplorer = new EventEmitter<void>();
  @Output() readonly openPending = new EventEmitter<void>();

  onFocus(): void {
    this.focusExplorer.emit();
    window.dispatchEvent(new CustomEvent('explorer-search-focus'));
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    this.onFocus();
  }

  onPendingShortcut(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.openPending.emit();
    window.dispatchEvent(
      new CustomEvent('dock-open-panel', { detail: { panel: 'pending' } })
    );
  }
}
