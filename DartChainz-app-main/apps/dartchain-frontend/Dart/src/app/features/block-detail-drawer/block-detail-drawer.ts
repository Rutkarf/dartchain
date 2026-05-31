import { Component, HostListener, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Block } from '../../core/models/block.model';

@Component({
  selector: 'app-block-detail-drawer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './block-detail-drawer.html',
  styleUrls: ['./block-detail-drawer.css'],
})
export class BlockDetailDrawerComponent {
  open = input<boolean>(false);
  block = input<Block | null>(null);

  close = output<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open()) {
      this.close.emit();
    }
  }

  closeDrawer(): void {
    this.close.emit();
  }

  formatTimestamp(
    timestamp: number | string | Date | undefined | null
  ): string {
    if (!timestamp) {
      return 'N/A';
    }

    let date: Date;

    if (typeof timestamp === 'number') {
      date = new Date(timestamp * 1000);
    } else {
      date = new Date(timestamp);
    }

    if (Number.isNaN(date.getTime())) {
      return 'N/A';
    }

    return date.toLocaleString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  shortHash(value: string | undefined | null, size = 10): string {
    if (!value) {
      return 'N/A';
    }

    if (value.length <= size * 2) {
      return value;
    }

    return `${value.slice(0, size)}...${value.slice(-size)}`;
  }

  difficultyLabel(value: number | undefined | null): string {
    return typeof value === 'number' && Number.isFinite(value)
      ? String(value)
      : 'N/A';
  }
}