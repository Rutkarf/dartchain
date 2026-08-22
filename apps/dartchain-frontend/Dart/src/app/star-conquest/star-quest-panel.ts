import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';

import { AuthService } from '@auth/services/auth.service';
import {
  DockNavigationService,
  QuestNavigateAction,
} from '@dock/services/dock-navigation.service';
import { StarConquestProgressService } from '@star-conquest/services/star-conquest-progress.service';
import { StarConquestStateService } from '@star-conquest/services/star-conquest-state.service';
import { StarConquestFacade } from '@star-conquest/services/star-conquest.facade';
import type { StarConquestClaimReason } from './star-conquest-progress';
import type { StarConquestLiveLink } from './star-conquest-live';
import {
  STAR_QUEST_CLAIM_ERROR_MESSAGE,
  buildStarQuestPanelView,
} from './star-quest-panel.view';

@Component({
  selector: 'app-star-quest-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './star-quest-panel.html',
  styleUrl: './star-quest-panel.css',
})
export class StarQuestPanelComponent {
  readonly state = inject(StarConquestStateService);
  readonly progress = inject(StarConquestProgressService);
  private readonly auth = inject(AuthService);
  private readonly dockNav = inject(DockNavigationService);
  private readonly facade = inject(StarConquestFacade);

  readonly claimError = signal<StarConquestClaimReason | null>(null);

  readonly view = computed(() => {
    const panel = this.state.panel();
    if (!panel) return null;
    const id = panel.quest.id;
    return buildStarQuestPanelView({
      quest: panel.quest,
      x: panel.x,
      y: panel.y,
      compact: this.state.panelCompact(),
      live: this.progress.liveLink(id),
      liveTask: this.progress.liveTask(id),
      playerClaimed: Boolean(this.progress.snapshot().claimed[id]),
      previewM4T3R: this.progress.previewM4T3R(),
    });
  });

  readonly claimErrorMessage = computed(() => {
    const reason = this.claimError();
    return reason ? STAR_QUEST_CLAIM_ERROR_MESSAGE[reason] : null;
  });

  constructor() {
    let lastQuestId: string | null = null;
    effect(() => {
      const id = this.state.panel()?.quest.id ?? null;
      if (id === lastQuestId) return;
      lastQuestId = id;
      this.claimError.set(null);
    });
  }

  onCta(): void {
    const panel = this.state.panel();
    if (!panel) return;
    const link = this.progress.liveLink(panel.quest.id);
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
    if (!result.ok || !result.quest) {
      this.claimError.set(result.ok ? 'missing' : result.reason);
      return;
    }
    this.claimError.set(null);
    this.state.show(result.quest, panel.x, panel.y, this.state.panelCompact());
    this.facade.notifyProgress(panel.quest.id);
  }

  dismiss(): void {
    this.claimError.set(null);
    this.state.clear();
    this.facade.dismiss();
  }
}
