import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  effect,
  inject,
} from '@angular/core';

import { ProductConfigService } from '../../core/config/product-config.service';
import { FocusTrapDirective } from '../../core/directives/focus-trap.directive';
import { PeerView } from '../../core/services/blockchain-api.service';
import { PeersDataService } from '../../core/services/peers-data.service';
import { StarConquestProgressService } from '../../core/services/star-conquest-progress.service';
import { StarConquestStateService } from '../../core/services/star-conquest-state.service';
import { StarConquestFacade } from '../../core/services/star-conquest.facade';
import {
  starQuestFamilyLabel,
  starQuestFamilyRgb,
  starQuestStatusLabel,
} from './star-quest-panel.view';
import type { StarQuestFamily } from './star-conquest-families';
import type { StarQuest, StarQuestStatus } from './star-conquest.model';
import { formatRewardWithDot } from './star-conquest-visuals';
import { starConquestOverlayBox } from './star-conquest-scale';
import { StarConquestPanStickComponent } from './star-conquest-pan-stick';
import { recordStarConquestDiag } from './star-conquest-diagnostics';

/**
 * Overlay fonctionnel uniquement : liste scanner + labels M4T3R.
 * Le joystick est un objet Three.js ancré à l’horizon du floor.
 */
@Component({
  selector: 'app-star-quest-scanner',
  standalone: true,
  imports: [FocusTrapDirective, StarConquestPanStickComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './star-quest-scanner.html',
  styleUrl: './star-quest-scanner.css',
})
export class StarQuestScannerComponent {
  readonly state = inject(StarConquestStateService);
  readonly progress = inject(StarConquestProgressService);
  readonly kpiDebug = inject(ProductConfigService).starConquestKpiDebug;
  private readonly peersData = inject(PeersDataService);
  private readonly facade = inject(StarConquestFacade);

  private readonly peers = computed((): readonly PeerView[] => this.peersData.peers());

  constructor() {
    effect(() => {
      if (this.state.scannerOpen()) {
        this.peersData.init();
        recordStarConquestDiag('scanner');
      }
    });
  }

  readonly connectedCount = computed(() =>
    this.peers().filter((peer) => peer.status === 'CONNECTED').length
  );

  readonly networkPeersCount = computed(() => {
    const fromStats = this.peersData.statsTotal();
    const current = this.peers().length;
    return Math.max(fromStats ?? current, current);
  });

  readonly networkLabel = computed(() => {
    const connected = this.connectedCount();
    const total = this.networkPeersCount();
    if (total <= 0) return 'P2P: 0';
    if (connected <= 0) return `P2P: ${connected}/${total}`;
    return `P2P: ${connected}/${total}`;
  });

  /** Place le scanner au-dessus de la bande floor (sticks MOVE/VIEW), hors joystick. */
  readonly scannerStyle = computed(() => {
    const z = this.state.joyExclusion();
    const vw = typeof window !== 'undefined' ? window.innerWidth : 250;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 550;
    const box = starConquestOverlayBox(vw, vh);
    const panelW = box.scannerW;
    const estH = box.scannerH;
    const floor = `calc(var(--sc-overlay-floor-chrome, ${box.floorChromeH}px) + ${box.margin}px)`;

    if (!z) {
      return {
        left: '50%',
        bottom: floor,
        top: 'auto',
        transform: 'translateX(-50%)',
      };
    }

    let left = (vw - panelW) * 0.5;
    if (left < z.right && left + panelW > z.left) {
      const rightSlot = z.right + 6;
      const leftSlot = z.left - panelW - 6;
      left = rightSlot + panelW <= vw - box.margin ? rightSlot : Math.max(box.margin, leftSlot);
    }
    left = Math.max(box.margin, Math.min(vw - box.margin - panelW, left));

    const maxTop = Math.max(box.margin, box.usableBottom - estH);
    let top = z.top - estH - 8;
    if (top < box.margin || top + estH > z.top) {
      top = Math.max(box.margin, Math.min(maxTop, z.top - estH - 6));
    }
    top = Math.max(box.margin, Math.min(maxTop, top));

    return {
      left: `${left}px`,
      top: `${top}px`,
      bottom: 'auto',
      transform: 'none',
    };
  });

  familyLabel(family: StarQuestFamily): string {
    return starQuestFamilyLabel(family);
  }

  familyRgb(family: StarQuestFamily): string {
    return starQuestFamilyRgb(family);
  }

  pulseDelay(id: string): string {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i) * (i + 1)) % 3600;
    return `${(h % 3600) / 1000}s`;
  }

  rewardText(quest: StarQuest): string {
    return formatRewardWithDot(quest.rewardM4T3R);
  }

  statusLabel(status: StarQuestStatus): string {
    return starQuestStatusLabel(status);
  }

  closeList(): void {
    this.state.closeScanner();
  }

  pick(quest: StarQuest): void {
    this.state.closeScanner();
    this.facade.selectQuest(quest.id);
  }

  pickLabel(questId: string): void {
    this.facade.selectQuest(questId);
  }

  hoverLabel(questId: string): void {
    this.facade.hoverQuest(questId);
  }

  clearHoverLabel(questId: string): void {
    this.facade.hoverQuest(null, questId);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.state.helpOpen()) {
      this.state.closeHelp();
      return;
    }
    if (this.state.scannerOpen()) this.state.closeScanner();
  }
}
