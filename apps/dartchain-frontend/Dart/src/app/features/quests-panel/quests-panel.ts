import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  OnDestroy,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

import { LocaleService } from '../../core/i18n/locale.service';
import { AuthService } from '../../core/services/auth.service';
import {
  DockNavigationService,
  QuestNavigateAction,
} from '../../core/services/dock-navigation.service';
import { QuestsDataService } from '../../core/services/quests-data.service';
import { WalletSessionService } from '../../core/services/wallet-session.service';
import { QuestTaskView } from './quests-panel.model';
import { QuestsPanelService } from './quests-panel.service';
import {
  DOCK_REFRESH_EVENT,
  refreshEventMatchesTab,
} from '../../core/constants/panel-refresh.constants';

@Component({
  selector: 'app-quests-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './quests-panel.html',
  styleUrls: ['./quests-panel.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestsPanelComponent implements OnDestroy {
  private readonly questsService = inject(QuestsPanelService);
  private readonly questsData = inject(QuestsDataService);
  private readonly dockNav = inject(DockNavigationService);
  private readonly walletSession = inject(WalletSessionService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly locale = inject(LocaleService);

  private readonly dailySection = viewChild<ElementRef<HTMLElement>>('dailySection');

  protected readonly mission = computed(() => this.questsService.getCurrentMission());
  protected readonly weekly = computed(() => this.questsService.getWeeklyReward());
  protected readonly loading = this.questsData.loading;

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

  protected readonly tasksSummary = computed(() => {
    const tasks = this.tasks();
    const state = this.state();
    const claimed = tasks.filter((task) => state.tasks[task.id]?.claimed === true).length;
    return `${claimed}/${tasks.length}`;
  });

  protected readonly dailyProgressPercent = computed(() => {
    const tasks = this.tasks();
    if (!tasks.length) {
      return 0;
    }

    const state = this.state();
    const claimed = tasks.filter((task) => state.tasks[task.id]?.claimed === true).length;
    return Math.round((claimed / tasks.length) * 100);
  });

  protected readonly dailyComplete = computed(() => {
    const tasks = this.tasks();
    const state = this.state();
    return tasks.length > 0 && tasks.every((task) => state.tasks[task.id]?.claimed === true);
  });

  protected readonly countdownUrgent = computed(() => {
    return this.questsService.msUntilDailyReset() <= 3_600_000;
  });

  private readonly questAccentPalette = [
    '#00d9ff',
    '#ff6bcb',
    '#00ff88',
    '#ffb347',
    '#b48cff',
    '#ff5c7a',
  ] as const;

  protected readonly errorBanner = computed(() => {
    const code = this.questsData.error();
    if (!code) {
      return null;
    }

    if (code === 'rate-limit') {
      const seconds = this.questsData.rateLimitCountdownLabel() ?? '60';
      return this.locale.t('quests.errorRateLimit').replace('{seconds}', seconds);
    }

    if (code === 'state') {
      return this.locale.t('quests.errorState');
    }

    if (code === 'catalog') {
      return this.locale.t('quests.errorCatalog');
    }

    return this.locale.t('quests.error');
  });

  protected readonly resetCountdown = toSignal(
    interval(1000).pipe(
      startWith(0),
      map(() => this.questsService.formatResetCountdown(this.questsService.msUntilDailyReset()))
    ),
    { initialValue: this.questsService.formatResetCountdown(this.questsService.msUntilDailyReset()) }
  );

  protected readonly toastMessage = signal('');
  protected readonly toastKind = signal<'success' | 'info' | 'error'>('success');
  protected readonly celebrateTaskId = signal<string | null>(null);
  protected readonly weeklyClaiming = signal(false);

  constructor() {
    this.questsData.init();
    this.destroyRef.onDestroy(() => this.questsData.destroy());
  }

  ngOnDestroy(): void {
    this.questsData.destroy();
  }

  protected rewardLabel(mts: number): string {
    return `+${mts.toFixed(2)} R4V3`;
  }

  protected formatMts(mts: number): string {
    return `${mts.toFixed(2)} R4V3`;
  }

  protected questAccent(index: number): string {
    return this.questAccentPalette[index % this.questAccentPalette.length];
  }

  protected goButtonLabel(task: QuestTaskView): string {
    if (task.action === 'login') {
      return this.locale.t('quests.login');
    }

    return '→';
  }

  protected goAriaLabel(task: QuestTaskView): string {
    if (task.action === 'login') {
      return this.locale.t('quests.login');
    }

    return `${this.locale.t('quests.go')} — ${task.title}`;
  }

  protected weeklyLockedLabel(): string {
    const summary = this.tasksSummary();
    return this.locale.t('quests.weeklyLockedHint').replace('{progress}', summary);
  }

  protected refreshQuests(): void {
    this.questsData.error.set(null);
    void this.questsData.refreshAll(true);
  }

  @HostListener(`window:${DOCK_REFRESH_EVENT}`, ['$event'])
  onDockRefresh(event: Event): void {
    if (refreshEventMatchesTab(event, 'quests')) {
      this.refreshQuests();
    }
  }

  protected dismissError(): void {
    this.questsData.error.set(null);
  }

  protected async onClaim(task: QuestTaskView): Promise<void> {
    const result = await this.questsService.claimTask(task.id);
    if (!result.ok) {
      this.toast(result.error ?? this.locale.t('quests.claimFailed'), 'error');
      return;
    }

    this.toast(
      this.locale.t('quests.claimSuccess').replace('{reward}', this.rewardLabel(task.rewardMts)),
      'success'
    );
    this.triggerCelebrate(task.id);
    this.walletSession.requestBalanceRefresh();
    this.questsData.scheduleRefresh(true);
  }

  protected onGo(task: QuestTaskView): void {
    if (task.action === 'login') {
      this.auth.openDrawer('login');
      return;
    }

    this.dockNav.requestQuestAction(task.action as QuestNavigateAction);
  }

  protected onPendingWallet(event: MouseEvent): void {
    event.stopPropagation();
    this.dockNav.requestTab('wallet');
    this.toast(this.locale.t('quests.walletRequired'), 'info');
  }

  protected onViewMissionDetails(): void {
    this.dailySection()?.nativeElement.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  protected async onClaimMission(): Promise<void> {
    const result = await this.questsService.claimMission();
    if (!result.ok) {
      this.toast(result.error ?? this.locale.t('quests.missionFailed'), 'error');
      this.onViewMissionDetails();
      return;
    }

    this.toast(
      this.locale
        .t('quests.missionSuccess')
        .replace('{mts}', this.mission().rewardMts.toFixed(2))
        .replace('{xp}', String(this.mission().rewardXp)),
      'success'
    );
    this.triggerCelebrate('mission');
    this.walletSession.requestBalanceRefresh();
    this.questsData.scheduleRefresh(true);
  }

  protected async onClaimWeekly(): Promise<void> {
    if (!this.weeklyClaimable() || this.weeklyClaiming()) {
      this.toast(this.locale.t('quests.weeklyFailed'), 'info');
      return;
    }

    this.weeklyClaiming.set(true);
    const result = await this.questsService.claimWeekly();
    this.weeklyClaiming.set(false);

    if (!result.ok) {
      this.toast(result.error ?? this.locale.t('quests.weeklyFailed'), 'error');
      return;
    }

    this.toast(
      this.locale.t('quests.weeklySuccess').replace('{mts}', this.weekly().rewardMts.toFixed(2)),
      'success'
    );
    this.triggerCelebrate('weekly');
    this.walletSession.requestBalanceRefresh();
    this.questsData.scheduleRefresh(true);
  }

  private triggerCelebrate(id: string): void {
    this.celebrateTaskId.set(id);
    window.setTimeout(() => this.celebrateTaskId.set(null), 900);
  }

  private toast(message: string, kind: 'success' | 'info' | 'error'): void {
    this.toastMessage.set(message);
    this.toastKind.set(kind);
    window.setTimeout(() => this.toastMessage.set(''), 2600);
  }
}
