import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';

import { QuestsApiService } from '../../core/services/quests-api.service';
import { WalletSessionService } from '../../core/services/wallet-session.service';
import {
  DailyQuestDefinition,
  QuestCatalogResponse,
  QuestMissionDefinition,
  QuestWeeklyDefinition,
} from './quests-catalog.model';
import {
  CURRENT_MISSION,
  DAILY_QUESTS,
  QUESTS_STORAGE_KEY,
  SERVER_HOOKED_QUEST_IDS,
  WEEKLY_REWARD,
} from './quests-panel.constants';
import { QuestPersistedState, QuestTaskState, QuestTaskView, QuestClaimResult, ExploreBlockResult } from './quests-panel.model';

const AUTH_TOKEN_KEY = 'dartchain_auth_token';

@Injectable({ providedIn: 'root' })
export class QuestsPanelService {
  private readonly questsApi = inject(QuestsApiService);
  private readonly walletSession = inject(WalletSessionService);
  private readonly stateSubject = new BehaviorSubject<QuestPersistedState>(this.loadState());

  private catalogDailyQuests: DailyQuestDefinition[] | null = null;
  private catalogMission: QuestMissionDefinition = { ...CURRENT_MISSION };
  private catalogWeekly: QuestWeeklyDefinition = { ...WEEKLY_REWARD };
  private catalogServerHooked = new Set(SERVER_HOOKED_QUEST_IDS);

  readonly state$ = this.stateSubject.asObservable();

  getDailyQuests(): readonly DailyQuestDefinition[] {
    return this.catalogDailyQuests ?? DAILY_QUESTS;
  }

  getCurrentMission(): QuestMissionDefinition {
    return this.catalogMission;
  }

  getWeeklyReward(): QuestWeeklyDefinition {
    return this.catalogWeekly;
  }

  getServerHookedIds(): ReadonlySet<string> {
    return this.catalogServerHooked;
  }

  loadCatalog(): Promise<void> {
    return this.loadCatalogAsync();
  }

  async loadCatalogAsync(): Promise<void> {
    const catalog = await firstValueFrom(this.questsApi.getCatalog());
    this.applyCatalog(catalog);
  }

  async mergeGuestProgressOnLogin(): Promise<void> {
    if (!this.hasAuthToken()) {
      return;
    }

    const guestState = this.readGuestStateSnapshot();
    if (!guestState) {
      await this.syncStateAsync();
      this.walletSession.requestBalanceRefresh();
      return;
    }

    for (const blockIndex of guestState.exploredBlockIndices ?? []) {
      try {
        await firstValueFrom(this.questsApi.exploreBlock(blockIndex));
      } catch {
        // Bloc déjà exploré ou introuvable — le serveur déduplique.
      }
    }

    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(QUESTS_STORAGE_KEY);
    }

    await this.syncStateAsync();
    this.walletSession.requestBalanceRefresh();
  }

  snapshot(): QuestPersistedState {
    return this.stateSubject.value;
  }

  refresh(): void {
    void this.refreshAll();
  }

  async refreshAll(): Promise<void> {
    await Promise.all([this.loadCatalogAsync(), this.syncStateAsync()]);
  }

  syncFromServer(): void {
    void this.syncStateAsync();
  }

  async syncStateAsync(): Promise<void> {
    if (!this.hasAuthToken()) {
      this.stateSubject.next(this.normalizeForToday(this.loadState()));
      return;
    }

    try {
      const state = await firstValueFrom(this.questsApi.getState());
      this.applyServerState(state);
    } catch (error) {
      this.stateSubject.next(this.normalizeForToday(this.loadState()));
      throw error;
    }
  }

  isAuthenticated(): boolean {
    return this.hasAuthToken();
  }

  recordProgress(taskId: string, increment = 1): Promise<void> {
    if (this.hasAuthToken() && this.getServerHookedIds().has(taskId)) {
      this.syncFromServer();
      return Promise.resolve();
    }

    if (this.hasAuthToken()) {
      return firstValueFrom(this.questsApi.recordProgress(taskId, increment))
        .then((state) => this.applyServerState(state))
        .catch(() => {
          this.recordProgressLocally(taskId, increment);
        });
    }

    this.recordProgressLocally(taskId, increment);
    return Promise.resolve();
  }

  exploreBlock(blockIndex: number): Promise<ExploreBlockResult> {
    const definition = this.getDailyQuests().find((quest) => quest.id === 'explore-blocks');
    const target = definition?.target ?? 5;
    const before = this.snapshot();
    const beforeProgress = before.tasks['explore-blocks']?.progress ?? 0;
    const exploredBefore = before.exploredBlockIndices ?? [];

    if (!Number.isFinite(blockIndex) || blockIndex < 0) {
      return Promise.resolve({
        progressed: false,
        duplicate: false,
        progress: beforeProgress,
        target,
      });
    }

    if (exploredBefore.includes(blockIndex)) {
      return Promise.resolve({
        progressed: false,
        duplicate: true,
        progress: beforeProgress,
        target,
      });
    }

    if (this.hasAuthToken()) {
      return firstValueFrom(this.questsApi.exploreBlock(blockIndex))
        .then((state) => {
          this.applyServerState(state);
          return this.buildExploreResult(blockIndex, beforeProgress, target);
        })
        .catch(() =>
          Promise.resolve({
            progressed: false,
            duplicate: false,
            progress: beforeProgress,
            target,
          })
        );
    }

    const state = this.normalizeForToday(this.snapshot());
    state.exploredBlockIndices = [...exploredBefore, blockIndex];
    this.recordProgressLocally('explore-blocks', 1, state);
    return Promise.resolve(this.buildExploreResult(blockIndex, beforeProgress, target));
  }

  async claimTask(taskId: string): Promise<QuestClaimResult> {
    if (this.getServerHookedIds().has(taskId)) {
      return {
        ok: false,
        error: 'Cette quête est créditée automatiquement par le serveur.',
      };
    }

    if (this.hasAuthToken()) {
      try {
        const state = await firstValueFrom(this.questsApi.claimTask(taskId));
        this.applyServerState(state);
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          error: this.resolveApiError(error, 'Impossible de réclamer la récompense.'),
        };
      }
    }

    return this.claimTaskLocally(taskId)
      ? { ok: true }
      : { ok: false, error: 'Quête non terminée ou déjà réclamée.' };
  }

  async claimMission(): Promise<QuestClaimResult> {
    if (this.hasAuthToken()) {
      try {
        const state = await firstValueFrom(this.questsApi.claimMission());
        this.applyServerState(state);
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          error: this.resolveApiError(error, 'Mission non disponible pour réclamation.'),
        };
      }
    }

    return this.claimMissionLocally()
      ? { ok: true }
      : { ok: false, error: 'Mission non terminée ou déjà réclamée.' };
  }

  async claimWeekly(): Promise<QuestClaimResult> {
    if (this.hasAuthToken()) {
      try {
        const state = await firstValueFrom(this.questsApi.claimWeekly());
        this.applyServerState(state);
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          error: this.resolveApiError(error, 'Récompense hebdomadaire indisponible.'),
        };
      }
    }

    return this.claimWeeklyLocally()
      ? { ok: true }
      : { ok: false, error: 'Toutes les quêtes quotidiennes doivent être réclamées.' };
  }

  missionProgress(state = this.snapshot()): number {
    const dailyQuests = this.getDailyQuests();
    if (!dailyQuests.length) {
      return 0;
    }

    const ratio =
      dailyQuests.reduce((sum, quest) => {
        const task = state.tasks[quest.id] ?? { progress: 0, claimed: false };
        return sum + Math.min(task.progress / quest.target, 1);
      }, 0) / dailyQuests.length;

    return Math.round(ratio * 100);
  }

  buildTaskViews(state = this.snapshot()): QuestTaskView[] {
    return this.getDailyQuests().map((quest) => {
      const task = state.tasks[quest.id] ?? { progress: 0, claimed: false };
      const complete = task.progress >= quest.target;
      const autoHooked = this.getServerHookedIds().has(quest.id);
      const autoClaimed = autoHooked && task.claimed;
      const pendingWallet = autoHooked && complete && !task.claimed;

      return {
        ...quest,
        progress: task.progress,
        complete,
        claimable: complete && !task.claimed && !autoHooked,
        progressLabel: `${Math.min(task.progress, quest.target)}/${quest.target}`,
        autoHooked,
        autoClaimed,
        pendingWallet,
      };
    });
  }

  allDailyClaimed(state = this.snapshot()): boolean {
    return this.getDailyQuests().every((quest) => state.tasks[quest.id]?.claimed === true);
  }

  msUntilDailyReset(): number {
    const now = new Date();
    const next = new Date(now);
    next.setHours(24, 0, 0, 0);
    return Math.max(0, next.getTime() - now.getTime());
  }

  formatResetCountdown(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  private recordProgressLocally(taskId: string, increment = 1, baseState?: QuestPersistedState): void {
    const state = baseState ?? this.normalizeForToday(this.snapshot());
    const definition = this.getDailyQuests().find((quest) => quest.id === taskId);
    if (!definition) {
      return;
    }

    const current = state.tasks[taskId] ?? { progress: 0, claimed: false };
    if (current.claimed) {
      return;
    }

    current.progress = Math.min(definition.target, current.progress + increment);
    state.tasks[taskId] = current;
    this.tryAutoClaimLocally(state, definition, current);
    this.persist(state);
  }

  private tryAutoClaimLocally(
    state: QuestPersistedState,
    definition: DailyQuestDefinition,
    task: QuestTaskState
  ): void {
    if (task.claimed || task.progress < definition.target) {
      return;
    }

    if (this.getServerHookedIds().has(definition.id)) {
      return;
    }

    task.claimed = true;
    state.pendingMts += definition.rewardMts;
    state.totalXp += definition.rewardXp;
  }

  private claimTaskLocally(taskId: string): boolean {
    const state = this.normalizeForToday(this.snapshot());
    const view = this.buildTaskViews(state).find((task) => task.id === taskId);
    if (!view?.claimable) {
      return false;
    }

    const entry = state.tasks[taskId];
    entry.claimed = true;
    state.pendingMts += view.rewardMts;
    state.totalXp += view.rewardXp;
    this.persist(state);
    return true;
  }

  private claimMissionLocally(): boolean {
    const state = this.normalizeForToday(this.snapshot());
    if (state.missionClaimed || this.missionProgress(state) < 100) {
      return false;
    }

    state.missionClaimed = true;
    state.pendingMts += this.getCurrentMission().rewardMts;
    state.totalXp += this.getCurrentMission().rewardXp;
    this.persist(state);
    return true;
  }

  private claimWeeklyLocally(): boolean {
    const state = this.normalizeForToday(this.snapshot());
    if (state.weeklyClaimed || !this.allDailyClaimed(state)) {
      return false;
    }

    state.weeklyClaimed = true;
    state.pendingMts += this.getWeeklyReward().rewardMts;
    this.persist(state);
    return true;
  }

  private applyServerState(state: QuestPersistedState): void {
    const before = this.snapshot();
    const normalized = this.normalizeServerState(state);
    this.stateSubject.next(normalized);
    if (this.shouldRefreshWalletBalance(before, normalized)) {
      this.walletSession.requestBalanceRefresh();
    }
  }

  private shouldRefreshWalletBalance(
    before: QuestPersistedState,
    after: QuestPersistedState
  ): boolean {
    if (after.pendingMts > before.pendingMts) {
      return true;
    }

    if (!before.missionClaimed && after.missionClaimed) {
      return true;
    }

    if (!before.weeklyClaimed && after.weeklyClaimed) {
      return true;
    }

    for (const quest of this.getDailyQuests()) {
      const wasClaimed = before.tasks[quest.id]?.claimed === true;
      const isClaimed = after.tasks[quest.id]?.claimed === true;
      if (!wasClaimed && isClaimed) {
        return true;
      }
    }

    return false;
  }

  private normalizeServerState(state: QuestPersistedState): QuestPersistedState {
    const normalized: QuestPersistedState = {
      dayKey: state.dayKey,
      tasks: { ...state.tasks },
      missionClaimed: state.missionClaimed,
      weeklyClaimed: state.weeklyClaimed,
      totalXp: state.totalXp,
      pendingMts: Number(state.pendingMts ?? 0),
      exploredBlockIndices: [...(state.exploredBlockIndices ?? [])],
    };

    for (const quest of this.getDailyQuests()) {
      normalized.tasks[quest.id] ??= { progress: 0, claimed: false };
    }

    return normalized;
  }

  private normalizeForToday(state: QuestPersistedState): QuestPersistedState {
    const dayKey = this.todayKey();
    if (state.dayKey === dayKey) {
      return state;
    }

    const fresh = this.createDefaultState(dayKey);
    fresh.totalXp = state.totalXp;
    fresh.pendingMts = state.pendingMts;

    if (this.isoWeekKey(state.dayKey) === this.isoWeekKey(dayKey)) {
      fresh.weeklyClaimed = state.weeklyClaimed;
    }

    this.persist(fresh);
    return fresh;
  }

  private isoWeekKey(dayKey: string): string {
    const parsed = Date.parse(`${dayKey}T12:00:00`);
    if (!Number.isFinite(parsed)) {
      return dayKey.slice(0, 7);
    }

    const date = new Date(parsed);
    const day = (date.getUTCDay() + 6) % 7;
    date.setUTCDate(date.getUTCDate() - day + 3);
    const weekYear = date.getUTCFullYear();
    const weekStart = Date.UTC(weekYear, 0, 4);
    const weekNumber = Math.ceil(((date.getTime() - weekStart) / 86_400_000 + 1) / 7);
    return `${weekYear}-W${String(weekNumber).padStart(2, '0')}`;
  }

  private loadState(): QuestPersistedState {
    if (typeof localStorage === 'undefined') {
      return this.createDefaultState(this.todayKey());
    }

    try {
      const raw = localStorage.getItem(QUESTS_STORAGE_KEY);
      if (!raw) {
        return this.createDefaultState(this.todayKey());
      }

      const parsed = JSON.parse(raw) as QuestPersistedState;
      return this.normalizeForToday(parsed);
    } catch {
      return this.createDefaultState(this.todayKey());
    }
  }

  private createDefaultState(dayKey: string): QuestPersistedState {
    const tasks: QuestPersistedState['tasks'] = {};
    for (const quest of this.getDailyQuests()) {
      tasks[quest.id] = { progress: 0, claimed: false };
    }

    return {
      dayKey,
      tasks,
      missionClaimed: false,
      weeklyClaimed: false,
      totalXp: 0,
      pendingMts: 0,
      exploredBlockIndices: [],
    };
  }

  private persist(state: QuestPersistedState): void {
    if (typeof localStorage !== 'undefined' && !this.hasAuthToken()) {
      localStorage.setItem(QUESTS_STORAGE_KEY, JSON.stringify(state));
    }
    this.stateSubject.next(state);
  }

  private hasAuthToken(): boolean {
    return typeof localStorage !== 'undefined' && !!localStorage.getItem(AUTH_TOKEN_KEY);
  }

  private todayKey(): string {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${now.getFullYear()}-${month}-${day}`;
  }

  private buildExploreResult(
    blockIndex: number,
    beforeProgress: number,
    target: number
  ): ExploreBlockResult {
    const after = this.snapshot();
    const afterProgress = after.tasks['explore-blocks']?.progress ?? 0;
    const explored = after.exploredBlockIndices ?? [];

    return {
      progressed: afterProgress > beforeProgress,
      duplicate: explored.includes(blockIndex) && afterProgress === beforeProgress,
      progress: afterProgress,
      target,
    };
  }

  private resolveApiError(error: unknown, fallback: string): string {
    if (error && typeof error === 'object' && 'error' in error) {
      const body = (error as { error?: { message?: string } }).error;
      if (typeof body?.message === 'string' && body.message.trim()) {
        return body.message;
      }
    }

    return fallback;
  }

  private applyCatalog(catalog: QuestCatalogResponse): void {
    this.catalogDailyQuests = catalog.dailyTasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      target: task.target,
      rewardMts: Number(task.rewardMts),
      rewardXp: task.rewardXp,
      action: task.action as DailyQuestDefinition['action'],
    }));
    this.catalogMission = {
      id: catalog.mission.id,
      title: catalog.mission.title,
      description: catalog.mission.description,
      rewardMts: Number(catalog.mission.rewardMts),
      rewardXp: catalog.mission.rewardXp,
      progressTarget: catalog.mission.progressTarget,
    };
    this.catalogWeekly = {
      rewardMts: Number(catalog.weekly.rewardMts),
      xpBoostPercent: catalog.weekly.xpBoostPercent,
    };
    this.catalogServerHooked = new Set(catalog.serverHookedTaskIds);
  }

  private readGuestStateSnapshot(): QuestPersistedState | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    const raw = localStorage.getItem(QUESTS_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as QuestPersistedState;
    } catch {
      return null;
    }
  }
}
