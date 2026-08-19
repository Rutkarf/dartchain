import { Component, HostListener, computed, inject } from '@angular/core';
import { StarConquestStateService } from '../../core/services/star-conquest-state.service';
import { PeersDataService } from '../../core/services/peers-data.service';
import {
  STAR_QUEST_FAMILIES,
  type StarQuestFamily,
} from './star-conquest-families';
import type { StarQuest } from './star-conquest.model';
import { formatRewardWithDot } from './star-conquest-visuals';
import { PeerView } from '../../core/services/blockchain-api.service';

/**
 * Overlay fonctionnel uniquement : liste scanner + labels M4T3R.
 * Le joystick est un objet Three.js ancré à l’horizon du floor.
 */
@Component({
  selector: 'app-star-quest-scanner',
  standalone: true,
  templateUrl: './star-quest-scanner.html',
  styleUrl: './star-quest-scanner.css',
})
export class StarQuestScannerComponent {
  readonly state = inject(StarConquestStateService);
  private readonly peersData = inject(PeersDataService);

  private readonly peers = computed((): readonly PeerView[] => this.peersData.peers());

  constructor() {
    // Init "light" pour pouvoir afficher un indicateur P2P même si l'user n'ouvre pas le peer panel.
    this.peersData.init();
  }

  readonly connectedCount = computed(() =>
    this.peers().filter((peer) => peer.status === 'CONNECTED').length
  );

  readonly networkPeersCount = computed(() => {
    const fromStats = this.peersData.statsTotal();
    const current = this.peers().length;
    // `statsTotal` (server) peut être null en début de vie.
    return Math.max(fromStats ?? current, current);
  });

  readonly networkLabel = computed(() => {
    const connected = this.connectedCount();
    const total = this.networkPeersCount();
    if (total <= 0) return 'P2P: 0';
    if (connected <= 0) return `P2P: ${connected}/${total}`;
    return `P2P: ${connected}/${total}`;
  });

  /** Place le scanner au-dessus / à côté de la zone joystick (jamais dessus). */
  readonly scannerStyle = computed(() => {
    const z = this.state.joyExclusion();
    const vw = typeof window !== 'undefined' ? window.innerWidth : 250;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 550;
    const panelW = Math.min(168, vw - 14);
    const estH = Math.min(180, vh * 0.36);

    if (!z) {
      return {
        left: '50%',
        bottom: `max(12px, calc(var(--floor-peek-height, 64px) * 0.15 + 8px))`,
        top: 'auto',
        transform: 'translateX(-50%)',
      };
    }

    let left = (vw - panelW) * 0.5;
    if (left < z.right && left + panelW > z.left) {
      const rightSlot = z.right + 6;
      const leftSlot = z.left - panelW - 6;
      left = rightSlot + panelW <= vw - 6 ? rightSlot : Math.max(6, leftSlot);
    }

    let top = z.top - estH - 8;
    if (top < 8) {
      top = Math.max(8, Math.min(z.top - 40, vh - estH - 8));
      // Si encore chevauchement vertical, coller juste au-dessus
      if (top + estH > z.top) top = Math.max(8, z.top - estH - 6);
    }

    return {
      left: `${left}px`,
      top: `${top}px`,
      bottom: 'auto',
      transform: 'none',
    };
  });

  familyLabel(family: StarQuestFamily): string {
    return STAR_QUEST_FAMILIES[family]?.label ?? family;
  }

  familyRgb(family: StarQuestFamily): string {
    const rgb = STAR_QUEST_FAMILIES[family]?.rgb255 ?? [62, 207, 220];
    return `${rgb[0]}, ${rgb[1]}, ${rgb[2]}`;
  }

  pulseDelay(id: string): string {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i) * (i + 1)) % 3600;
    return `${(h % 3600) / 1000}s`;
  }

  rewardText(quest: StarQuest): string {
    return formatRewardWithDot(quest.rewardM4T3R);
  }

  closeList(): void {
    this.state.closeScanner();
  }

  pick(quest: StarQuest): void {
    this.state.closeScanner();
    window.dispatchEvent(
      new CustomEvent('star-conquest-select', { detail: { questId: quest.id } })
    );
  }

  pickLabel(questId: string): void {
    window.dispatchEvent(
      new CustomEvent('star-conquest-select', { detail: { questId } })
    );
  }

  hoverLabel(questId: string): void {
    window.dispatchEvent(
      new CustomEvent('star-conquest-hover', { detail: { questId } })
    );
  }

  clearHoverLabel(questId: string): void {
    window.dispatchEvent(
      new CustomEvent('star-conquest-hover', {
        detail: { questId: null, from: questId },
      })
    );
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.state.scannerOpen()) this.state.closeScanner();
  }
}
