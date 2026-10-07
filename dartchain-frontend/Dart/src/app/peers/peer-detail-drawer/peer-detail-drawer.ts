import { CommonModule } from '@angular/common';
import { Component, HostListener, inject, input, output } from '@angular/core';

import { FocusTrapDirective } from '../../core/directives/focus-trap.directive';
import { LocaleService } from '../../core/i18n/locale.service';
import { PeerRowView } from '../peer-panel/peer-panel.model';

@Component({
  selector: 'app-peer-detail-drawer',
  standalone: true,
  imports: [CommonModule, FocusTrapDirective],
  templateUrl: './peer-detail-drawer.html',
  styleUrls: ['./peer-detail-drawer.css'],
})
export class PeerDetailDrawerComponent {
  protected readonly locale = inject(LocaleService);

  open = input<boolean>(false);
  peer = input<PeerRowView | null>(null);

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

  statusLabel(status: PeerRowView['status']): string {
    switch (status) {
      case 'CONNECTED':
        return this.locale.t('peers.statusConnected');
      case 'CONNECTING':
        return this.locale.t('peers.statusConnecting');
      case 'DISCONNECTED':
        return this.locale.t('peers.statusDisconnected');
      case 'ERROR':
        return this.locale.t('peers.statusError');
    }
  }

  formatLastSync(value: string | null): string {
    if (!value) {
      return '—';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString();
  }

  chainHeightLabel(peer: PeerRowView): string {
    if (peer.chainHeight === null && peer.localChainHeight === null) {
      return '—';
    }

    const remote = peer.chainHeight ?? '—';
    const local = peer.localChainHeight ?? '—';
    return `${local} / ${remote}`;
  }
}
