import { Injectable, computed, signal } from '@angular/core';
import type {
  StarQuest,
  StarQuestPanelState,
} from '@star-conquest/star-conquest.model';
import type { StarQuestFamily } from '@star-conquest/star-conquest-families';

export type { StarQuestPanelState };

export interface StarQuestRewardLabel {
  id: string;
  x: number;
  y: number;
  text: string;
  family: StarQuestFamily;
  active?: boolean;
  dim?: boolean;
  reward?: number;
  /** Opacité diffusée selon profondeur Three.js. */
  opacity?: number;
  depth?: number;
}

/**
 * Pont Star Conquest : scène ↔ panneaux HTML (sélection, labels, scanner).
 */
@Injectable({ providedIn: 'root' })
export class StarConquestStateService {
  readonly panel = signal<StarQuestPanelState | null>(null);
  readonly selected = signal(false);
  /** Quests masquées (UI) ou hors champ (viewport). */
  readonly hiddenQuests = signal<StarQuest[]>([]);
  readonly scannerOpen = signal(false);
  /** Labels M4T3R adaptatifs (hover / sélection / gains élevés visibles). */
  readonly rewardLabels = signal<StarQuestRewardLabel[]>([]);
  /** Joystick : navigation monde en cours (suspend raycast). */
  readonly worldNavigating = signal(false);
  /** Stick normalisé [-1…1] consommé par StarConquestWorld. */
  readonly stick = signal<{ x: number; y: number }>({ x: 0, y: 0 });
  /** Zone d’exclusion joystick (AABB écran) pour scanner / overlays. */
  readonly joyExclusion = signal<{
    left: number;
    top: number;
    right: number;
    bottom: number;
    x: number;
    y: number;
  } | null>(null);
  /** Panneau Quest en mode compact (viewport étroit près du stick). */
  readonly panelCompact = signal(false);
  /** Aide contrôles (progressive disclosure). */
  readonly helpOpen = signal(false);
  /** Overlay runtime additif (loading/error) — défaut ready. */
  readonly runtimePhase = signal<'ready' | 'loading' | 'error'>('ready');
  readonly runtimeMessage = signal<string | null>(null);
  /** Feuille optionnelle (help/details). */
  readonly sheetKind = signal<'help' | 'details' | 'none'>('none');

  readonly hiddenCount = computed(() => this.hiddenQuests().length);
  /** Joystick toujours visible ; la liste scanner dépend des Quests hors vue. */
  readonly scannerVisible = computed(() => true);

  show(quest: StarQuest, x: number, y: number, compact = false): void {
    this.panel.set({ quest, x, y });
    this.panelCompact.set(compact);
    this.selected.set(true);
  }

  move(x: number, y: number, compact?: boolean): void {
    const current = this.panel();
    if (!current) return;
    this.panel.set({ ...current, x, y });
    if (compact !== undefined) this.panelCompact.set(compact);
  }

  clear(): void {
    this.panel.set(null);
    this.selected.set(false);
    this.panelCompact.set(false);
  }

  setJoyExclusion(
    zone: {
      left: number;
      top: number;
      right: number;
      bottom: number;
      x: number;
      y: number;
    } | null
  ): void {
    this.joyExclusion.set(zone);
  }

  setHiddenQuests(quests: StarQuest[]): void {
    this.hiddenQuests.set(quests);
  }

  toggleScanner(): void {
    this.scannerOpen.update((v) => !v);
  }

  openScanner(): void {
    this.scannerOpen.set(true);
  }

  closeScanner(): void {
    this.scannerOpen.set(false);
  }

  setRewardLabels(labels: StarQuestRewardLabel[]): void {
    this.rewardLabels.set(labels);
  }

  setStick(x: number, y: number): void {
    this.stick.set({ x, y });
    this.worldNavigating.set(true);
  }

  endStick(): void {
    this.stick.set({ x: 0, y: 0 });
    this.worldNavigating.set(false);
  }

  openHelp(): void {
    this.helpOpen.set(true);
    this.sheetKind.set('help');
  }

  closeHelp(): void {
    this.helpOpen.set(false);
    if (this.sheetKind() === 'help') this.sheetKind.set('none');
  }

  toggleHelp(): void {
    if (this.helpOpen()) this.closeHelp();
    else this.openHelp();
  }

  setRuntime(phase: 'ready' | 'loading' | 'error', message: string | null = null): void {
    this.runtimePhase.set(phase);
    this.runtimeMessage.set(message);
  }
}
