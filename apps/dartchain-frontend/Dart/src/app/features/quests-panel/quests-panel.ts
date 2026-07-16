import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
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
    const complete = tasks.filter((task) => task.complete).length;
    return `${complete}/${tasks.length}`;
  });

  protected readonly usesServerAutoClaim = computed(() => this.questsService.isAuthenticated());

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

  protected refreshQuests(): void {
    this.questsData.error.set(null);
    void this.questsData.refreshAll(true);
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
    this.walletSession.requestBalanceRefresh();
    this.questsData.scheduleRefresh(true);
  }

  protected async onClaimWeekly(): Promise<void> {
    const result = await this.questsService.claimWeekly();
    if (!result.ok) {
      this.toast(result.error ?? this.locale.t('quests.weeklyFailed'), 'error');
      return;
    }

    this.toast(
      this.locale.t('quests.weeklySuccess').replace('{mts}', this.weekly().rewardMts.toFixed(2)),
      'success'
    );
    this.walletSession.requestBalanceRefresh();
    this.questsData.scheduleRefresh(true);
  }

  private toast(message: string, kind: 'success' | 'info' | 'error'): void {
    this.toastMessage.set(message);
    this.toastKind.set(kind);
    window.setTimeout(() => this.toastMessage.set(''), 2600);
  }
}
