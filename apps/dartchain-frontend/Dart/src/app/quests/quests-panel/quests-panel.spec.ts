import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { signal } from '@angular/core';

import { LocaleService } from '../../core/i18n/locale.service';
import { QuestsDataService } from '../../core/services/quests-data.service';
import { AuthService } from '../../core/services/auth.service';
import { DockNavigationService } from '../../core/services/dock-navigation.service';
import { WalletSessionService } from '../../core/services/wallet-session.service';
import { QuestsPanelComponent } from './quests-panel';
import { QuestsPanelService } from './quests-panel.service';
import { QuestPersistedState } from './quests-panel.model';

describe('QuestsPanel', () => {
  let fixture: ComponentFixture<QuestsPanelComponent>;
  let dockNav: { requestTab: ReturnType<typeof vi.fn>; requestQuestAction: ReturnType<typeof vi.fn> };

  const baseState: QuestPersistedState = {
    dayKey: '2026-W28',
    tasks: {},
    exploredBlockIndices: [],
    missionClaimed: false,
    weeklyClaimed: false,
    totalXp: 120,
    pendingMts: 1.5,
  };

  function createQuestsServiceMock(authenticated: boolean): QuestsPanelService {
    const state$ = new BehaviorSubject(baseState);
    return {
      state$: state$.asObservable(),
      snapshot: () => state$.value,
      refresh: vi.fn(),
      buildTaskViews: vi.fn(() => [
        {
          id: 'daily-login',
          title: 'Daily Login',
          description: 'Log in',
          target: 1,
          progress: 0,
          progressLabel: '0/1',
          complete: false,
          claimable: false,
          autoClaimed: false,
          pendingWallet: false,
          autoHooked: false,
          rewardMts: 1,
          action: 'login',
        },
        {
          id: 'faucet-claim',
          title: 'Faucet Claim',
          description: 'Claim faucet',
          target: 1,
          progress: 1,
          progressLabel: '1/1',
          complete: true,
          claimable: false,
          autoClaimed: false,
          pendingWallet: true,
          autoHooked: false,
          rewardMts: 1,
          action: 'faucet',
        },
      ]),
      missionProgress: vi.fn(() => 40),
      allDailyClaimed: vi.fn(() => false),
      formatResetCountdown: vi.fn(() => '11:59:59'),
      msUntilDailyReset: vi.fn(() => 60_000),
      isAuthenticated: vi.fn(() => authenticated),
      getCurrentMission: vi.fn(() => ({
        id: 'network-guardian',
        title: 'Network Guardian',
        description: 'Maintain network integrity by completing daily and weekly tasks.',
        rewardMts: 1,
        rewardXp: 150,
        progressTarget: 100,
      })),
      getWeeklyReward: vi.fn(() => ({ rewardMts: 1, xpBoostPercent: 20 })),
      claimWeekly: vi.fn(async () => ({ ok: false, error: 'locked' })),
    } as unknown as QuestsPanelService;
  }

  const questsDataMock = {
    init: vi.fn(),
    destroy: vi.fn(),
    scheduleRefresh: vi.fn(),
    refreshAll: vi.fn(async () => undefined),
    loading: signal(false),
    error: signal<string | null>(null),
    rateLimitCountdownLabel: vi.fn(() => null),
  };

  async function setup(authenticated = false): Promise<void> {
    dockNav = {
      requestTab: vi.fn(),
      requestQuestAction: vi.fn(),
    };

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [QuestsPanelComponent],
      providers: [
        LocaleService,
        { provide: QuestsPanelService, useValue: createQuestsServiceMock(authenticated) },
        { provide: QuestsDataService, useValue: questsDataMock },
        {
          provide: AuthService,
          useValue: { openDrawer: vi.fn(), isAuthenticated: vi.fn(() => authenticated) },
        },
        { provide: DockNavigationService, useValue: dockNav },
        { provide: WalletSessionService, useValue: { requestBalanceRefresh: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(QuestsPanelComponent);
    fixture.detectChanges();
  }

  it('should create', async () => {
    await setup();
    expect(fixture.componentInstance).toBeTruthy();
    expect(questsDataMock.init).toHaveBeenCalled();
  });

  it('renders compact header with Network Guardian, countdown and refresh', async () => {
    await setup();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.quests-panel__title')).toBeNull();
    expect(element.querySelector('.quests-panel__guardian')?.textContent).toContain('Network Guardian');
    expect(element.querySelector('.quests-panel__guardian-rank')?.textContent).toContain('Rôle actif');
    expect(element.querySelector('.quests-panel__guardian-line')).toBeTruthy();
    expect(element.querySelector('.quests-panel__countdown-value')?.textContent).toContain('11:59:59');
    expect(element.querySelector('.quests-panel__section-title')).toBeNull();
    expect(element.querySelector('.quests-panel__stat-stack')).toBeNull();
    expect(element.querySelector('.quests-panel__refresh')).toBeFalsy();
    expect(element.querySelector('.quests-panel.ds-surface')).toBeTruthy();
  });

  it('does not render auto badge in header', async () => {
    await setup(true);
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.quests-panel__auto')).toBeNull();
  });

  it('opens wallet dock when pending wallet button is clicked', async () => {
    await setup(true);
    const walletBtn = fixture.nativeElement.querySelector(
      '.quests-panel__btn--wallet'
    ) as HTMLButtonElement;
    expect(walletBtn).toBeTruthy();
    walletBtn.click();
    fixture.detectChanges();
    expect(dockNav.requestTab).toHaveBeenCalledWith('wallet');
  });

  it('shows login label on login quest go button', async () => {
    await setup();
    const loginBtn = fixture.nativeElement.querySelector(
      '.quests-panel__btn--go.is-login'
    ) as HTMLButtonElement;
    expect(loginBtn?.textContent).toContain('Connexion');
  });

  it('renders compact progress strip and disabled weekly button when locked', async () => {
    await setup();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.quests-panel__progress-inline')).toBeTruthy();
    expect(element.querySelector('.quests-panel__refresh')).toBeFalsy();
    const weeklyBtn = element.querySelector('.quests-panel__weekly-btn') as HTMLButtonElement;
    expect(weeklyBtn.disabled).toBe(true);
    expect(element.querySelector('.quests-panel__list')).toBeTruthy();
  });
});
