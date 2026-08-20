import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';

import { ProductConfigService } from '../../core/config/product-config.service';
import { PeersDataService } from '../../core/services/peers-data.service';
import { StarConquestProgressService } from '../../core/services/star-conquest-progress.service';
import { StarConquestStateService } from '../../core/services/star-conquest-state.service';
import { StarConquestFacade } from '../../core/services/star-conquest.facade';
import { QuestsPanelService } from '../../features/quests-panel/quests-panel.service';
import type { QuestPersistedState } from '../../features/quests-panel/quests-panel.model';
import { STAR_CONQUEST_PROGRESS_STORAGE_KEY } from './star-conquest-progress';
import { starQuestById } from './star-conquest.mock';
import { StarQuestScannerComponent } from './star-quest-scanner';

describe('StarQuestScannerComponent', () => {
  const emptyState: QuestPersistedState = {
    dayKey: 'test',
    tasks: {},
    missionClaimed: false,
    weeklyClaimed: false,
    totalXp: 0,
    pendingMts: 0,
  };

  let peersInit: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    localStorage.removeItem(STAR_CONQUEST_PROGRESS_STORAGE_KEY);
    peersInit = vi.fn();

    await TestBed.configureTestingModule({
      imports: [StarQuestScannerComponent],
      providers: [
        StarConquestStateService,
        StarConquestProgressService,
        StarConquestFacade,
        {
          provide: QuestsPanelService,
          useValue: {
            state$: new BehaviorSubject(emptyState).asObservable(),
            buildTaskViews: () => [],
          },
        },
        {
          provide: PeersDataService,
          useValue: {
            init: peersInit,
            peers: signal([]),
            statsTotal: signal(null),
          },
        },
        {
          provide: ProductConfigService,
          useValue: {
            starConquestKpiDebug: true,
            starConquestOverlayEnabled: true,
          },
        },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    localStorage.removeItem(STAR_CONQUEST_PROGRESS_STORAGE_KEY);
    TestBed.resetTestingModule();
  });

  it('does not poll peers until the scanner opens', () => {
    TestBed.createComponent(StarQuestScannerComponent).detectChanges();
    expect(peersInit).not.toHaveBeenCalled();
    TestBed.inject(StarConquestStateService).openScanner();
    TestBed.createComponent(StarQuestScannerComponent).detectChanges();
    expect(peersInit).toHaveBeenCalled();
  });

  it('selects a hidden quest through the facade', () => {
    const quest = starQuestById('sc-angular-layout');
    expect(quest).toBeTruthy();
    if (!quest) return;
    const state = TestBed.inject(StarConquestStateService);
    state.setHiddenQuests([quest]);
    state.openScanner();
    const facade = TestBed.inject(StarConquestFacade);
    const selected = vi.fn();
    const sub = facade.select$.subscribe(selected);
    const fixture: ComponentFixture<StarQuestScannerComponent> =
      TestBed.createComponent(StarQuestScannerComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.sc-scanner__kpi')).toBeTruthy();
    const item = fixture.nativeElement.querySelector('.sc-scanner__item') as HTMLButtonElement;
    item.click();
    expect(selected).toHaveBeenCalledWith('sc-angular-layout');
    expect(state.scannerOpen()).toBe(false);
    sub.unsubscribe();
  });

  it('hides the R&D KPI line when debug is off', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [StarQuestScannerComponent],
      providers: [
        StarConquestStateService,
        StarConquestProgressService,
        StarConquestFacade,
        {
          provide: QuestsPanelService,
          useValue: {
            state$: new BehaviorSubject(emptyState).asObservable(),
            buildTaskViews: () => [],
          },
        },
        {
          provide: PeersDataService,
          useValue: {
            init: vi.fn(),
            peers: signal([]),
            statsTotal: signal(null),
          },
        },
        {
          provide: ProductConfigService,
          useValue: { starConquestKpiDebug: false, starConquestOverlayEnabled: true },
        },
      ],
    }).compileComponents();
    TestBed.inject(StarConquestStateService).openScanner();
    const fixture = TestBed.createComponent(StarQuestScannerComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.sc-scanner__kpi')).toBeNull();
  });
});
