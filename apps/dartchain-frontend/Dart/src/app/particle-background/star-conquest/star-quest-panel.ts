import { Component, computed, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import {
  DockNavigationService,
  QuestNavigateAction,
} from '../../core/services/dock-navigation.service';
import { StarConquestProgressService } from '../../core/services/star-conquest-progress.service';
import { StarConquestStateService } from '../../core/services/star-conquest-state.service';
import {
  STAR_QUEST_FAMILIES,
  type StarQuestFamily,
} from './star-conquest-families';
import {
  STAR_QUEST_STATUS_LABEL,
  starQuestClaimKind,
  type StarQuestClaimKind,
} from './star-conquest.model';
import type { StarConquestLiveLink } from './star-conquest-live';

@Component({
  selector: 'app-star-quest-panel',
  standalone: true,
  templateUrl: './star-quest-panel.html',
  styleUrl: './star-quest-panel.css',
})
export class StarQuestPanelComponent {
  readonly state = inject(StarConquestStateService);
  readonly progress = inject(StarConquestProgressService);
  private readonly auth = inject(AuthService);
  private readonly dockNav = inject(DockNavigationService);

  readonly liveLink = computed((): StarConquestLiveLink | undefined => {
    const id = this.state.panel()?.quest.id;
    return id ? this.progress.liveLink(id) : undefined;
  });

  readonly liveTask = computed(() => {
    const id = this.state.panel()?.quest.id;
    return id ? this.progress.liveTask(id) : undefined;
  });

  readonly claimKind = computed((): StarQuestClaimKind => {
    const quest = this.state.panel()?.quest;
    return quest ? starQuestClaimKind(quest.status) : 'locked';
  });

  readonly ctaEnabled = computed(() => {
    const quest = this.state.panel()?.quest;
    if (!quest) return false;
    if (this.liveLink()) return this.claimKind() !== 'completed';
    return this.claimKind() === 'claim';
  });

  familyLabel(family: StarQuestFamily): string {
    return STAR_QUEST_FAMILIES[family]?.label ?? family;
  }

  familyHex(family: StarQuestFamily): string {
    return STAR_QUEST_FAMILIES[family]?.hex ?? '#3ECFDC';
  }

  familyRgb(family: StarQuestFamily): string {
    const rgb = STAR_QUEST_FAMILIES[family]?.rgb255 ?? [62, 207, 220];
    return `${rgb[0]}, ${rgb[1]}, ${rgb[2]}`;
  }

  statusLabel(status: string): string {
    return STAR_QUEST_STATUS_LABEL[status as keyof typeof STAR_QUEST_STATUS_LABEL] ?? status;
  }

  ctaLabel(): string {
    if (this.claimKind() === 'completed') return 'Conquise';
    const live = this.liveLink();
    if (live) return live.ctaLabel;
    const kind = this.claimKind();
    if (kind === 'locked') return 'À débloquer';
    if (kind === 'future') return 'Roadmap';
    return 'Conquérir';
  }

  isPlayerClaimed(questId: string): boolean {
    return Boolean(this.progress.snapshot().claimed[questId]);
  }

  onCta(): void {
    const panel = this.state.panel();
    if (!panel) return;
    const link = this.liveLink();
    if (link) {
      this.goToLiveAction(link);
      if (link.kind === 'navigate') {
        this.progress.completeNavigate(link.starQuestId);
      }
      this.dismiss();
      return;
    }
    this.claim();
  }

  private goToLiveAction(link: StarConquestLiveLink): void {
    if (link.action === 'login') {
      this.auth.openDrawer('login');
      return;
    }
    if (link.action === 'quests') {
      this.dockNav.requestTab('quests');
      return;
    }
    if (link.action === 'wallet') {
      this.dockNav.requestTab('wallet');
      return;
    }
    if (link.action === 'transactions') {
      this.dockNav.requestTab('pending');
      return;
    }
    this.dockNav.requestQuestAction(link.action as QuestNavigateAction);
  }

  claim(): void {
    const panel = this.state.panel();
    if (!panel) return;
    const result = this.progress.claim(panel.quest.id);
    if (!result.ok || !result.quest) return;
    this.state.show(result.quest, panel.x, panel.y, this.state.panelCompact());
    window.dispatchEvent(
      new CustomEvent('star-conquest-progress', { detail: { questId: panel.quest.id } })
    );
  }

  dismiss(): void {
    this.state.clear();
    window.dispatchEvent(new CustomEvent('star-conquest-dismiss'));
  }
}
