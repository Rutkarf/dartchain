import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { QuestsPanelService } from './quests-panel.service';
import { QUESTS_STORAGE_KEY } from './quests-panel.constants';

describe('QuestsPanelService', () => {
  let service: QuestsPanelService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(QuestsPanelService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('records progress locally for non-server-hooked quests only', async () => {
    await service.recordProgress('explore-blocks', 1);

    const snapshot = service.snapshot();
    expect(snapshot.tasks['explore-blocks']?.progress).toBe(1);
    expect(snapshot.pendingMts).toBe(0);
  });

  it('does not auto-claim server-hooked quests locally', async () => {
    await service.recordProgress('faucet-claim', 1);

    const snapshot = service.snapshot();
    expect(snapshot.tasks['faucet-claim']?.progress).toBe(1);
    expect(snapshot.tasks['faucet-claim']?.claimed).toBe(false);
    expect(snapshot.pendingMts).toBe(0);
  });

  it('reports unauthenticated state without a stored token', () => {
    expect(service.isAuthenticated()).toBe(false);
  });

  it('syncs from server when an auth token is stored', () => {
    localStorage.setItem('dartchain_auth_token', 'offline-token');

    service.syncFromServer();

    const request = httpMock.expectOne('/api/quests/state');
    expect(request.request.headers.get('Authorization')).toBe(
      'Bearer offline-token'
    );
    request.flush({
      weekKey: '2026-W28',
      tasks: {},
      exploredBlockIndices: [],
      claimedWeeklyReward: false,
    });
  });

  it('explores blocks locally and deduplicates indices', async () => {
    const first = await service.exploreBlock(3);
    expect(first.progressed).toBe(true);
    expect(first.progress).toBe(1);

    const duplicate = await service.exploreBlock(3);
    expect(duplicate.duplicate).toBe(true);
    expect(duplicate.progressed).toBe(false);
  });

  it('rejects invalid block indices', async () => {
    const result = await service.exploreBlock(-1);
    expect(result.progressed).toBe(false);
    expect(result.duplicate).toBe(false);
  });

  it('loads catalog from API', async () => {
    const pending = service.loadCatalog();
    const request = httpMock.expectOne('/api/quests/catalog');
    request.flush({
      dailyTasks: [
        {
          id: 'daily-login',
          title: 'Login',
          description: 'Log in',
          target: 1,
          rewardMts: 1,
          rewardXp: 10,
          action: 'login',
          serverHooked: true,
        },
      ],
      mission: {
        id: 'mission',
        title: 'Mission',
        description: 'Desc',
        rewardMts: 5,
        rewardXp: 50,
        progressTarget: 100,
      },
      weekly: { rewardMts: 10, xpBoostPercent: 20 },
      serverHookedTaskIds: ['faucet-claim'],
    });
    await pending;

    expect(service.getDailyQuests()[0]?.id).toBe('daily-login');
    expect(service.getServerHookedIds().has('faucet-claim')).toBe(true);
  });

  it('exposes catalog getters', () => {
    expect(service.getCurrentMission().id).toBe('network-guardian');
    expect(service.getWeeklyReward().rewardMts).toBe(1);
    expect(service.getDailyQuests().length).toBeGreaterThan(0);
  });

  it('rejects server-hooked task claims', async () => {
    const result = await service.claimTask('faucet-claim');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('automatiquement');
  });
});
