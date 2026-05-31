import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

import {
  DockNavigationService,
  QuestNavigateAction,
} from '../../core/services/dock-navigation.service';
import { CURRENT_MISSION, WEEKLY_REWARD } from './quests-panel.constants';
import { QuestTaskView } from './quests-panel.model';
import { QuestsPanelService } from './quests-panel.service';

@Component({
  selector: 'app-quests-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './quests-panel.html',
  styleUrls: ['./quests-panel.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestsPanelComponent {
  private readonly questsService = inject(QuestsPanelService);
  private readonly dockNav = inject(DockNavigationService);

  private readonly dailySection = viewChild<ElementRef<HTMLElement>>('dailySection');

  protected readonly mission = CURRENT_MISSION;
  protected readonly weekly = WEEKLY_REWARD;

  protected readonly state = toSignal(this.questsService.state$, {
    initialValue: this.questsService.snapshot(),
  });

  protected readonly tasks = computed(() => this.questsService.buildTaskViews(this.state()));
  protected readonly missionProgress = computed(() => this.questsService.missionProgress(this.state()));
  protected readonly missionClaimable = computed(
    () => this.missionProgress() >= 100 && !this.state().missionClaimed
  );
  protected readonly weeklyClaimable = computed(
    () => this.questsService.allDailyClaimed(this.state()) && !this.state().weeklyClaimed
  );

  protected readonly resetCountdown = toSignal(
    interval(1000).pipe(
      startWith(0),
      map(() => this.questsService.formatResetCountdown(this.questsService.msUntilDailyReset()))
    ),
    { initialValue: this.questsService.formatResetCountdown(this.questsService.msUntilDailyReset()) }
  );

  protected readonly toastMessage = signal('');
  protected readonly toastKind = signal<'success' | 'info'>('success');

  constructor() {
    this.questsService.refresh();
  }

  protected rewardLabel(mts: number): string {
    return `+${mts.toFixed(2)} MTS`;
  }

  protected onClaim(task: QuestTaskView): void {
    if (!this.questsService.claimTask(task.id)) {
      return;
    }

    this.toast(`Récompense réclamée : ${this.rewardLabel(task.rewardMts)}`, 'success');
  }

  protected onGo(task: QuestTaskView): void {
    if (task.action === 'login') {
      return;
    }

    this.dockNav.requestQuestAction(task.action as QuestNavigateAction);
  }

  protected onViewMissionDetails(): void {
    this.dailySection()?.nativeElement.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  protected onClaimMission(): void {
    if (!this.questsService.claimMission()) {
      this.onViewMissionDetails();
      return;
    }

    this.toast(
      `Mission complétée : ${this.mission.rewardMts.toFixed(2)} MTS + ${this.mission.rewardXp} XP`,
      'success'
    );
  }

  protected onClaimWeekly(): void {
    if (!this.questsService.claimWeekly()) {
      return;
    }

    this.toast(`Récompense hebdo : ${this.weekly.rewardMts.toFixed(2)} MTS`, 'success');
  }

  private toast(message: string, kind: 'success' | 'info'): void {
    this.toastMessage.set(message);
    this.toastKind.set(kind);
    window.setTimeout(() => this.toastMessage.set(''), 2400);
  }
}
