import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';

import { AuthService } from '@auth/services/auth.service';
import { DockNavigationService } from '@dock/services/dock-navigation.service';
import { StarConquestProgressService } from '@star-conquest/services/star-conquest-progress.service';
import { StarConquestStateService } from '@star-conquest/services/star-conquest-state.service';
import { StarConquestFacade } from '@star-conquest/services/star-conquest.facade';
import { QuestsPanelService } from '@quests/quests-panel/quests-panel.service';
import type { QuestPersistedState } from '@quests/quests-panel/quests-panel.model';
import { STAR_CONQUEST_PROGRESS_STORAGE_KEY } from './star-conquest-progress';
import { starQuestById } from './star-conquest.mock';
import { StarQuestPanelComponent } from './star-quest-panel';

describe('StarQuestPanelComponent', () => {
  const emptyState: QuestPersistedState = {
    dayKey: 'test',
    tasks: {},
    missionClaimed: false,
    weeklyClaimed: false,
    totalXp: 0,
    pendingMts: 0,
  };

  let openDrawer: ReturnType<typeof vi.fn>;
  let requestQuestAction: ReturnType<typeof vi.fn>;
  let requestTab: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    localStorage.removeItem(STAR_CONQUEST_PROGRESS_STORAGE_KEY);
    openDrawer = vi.fn();
    requestQuestAction = vi.fn();
    requestTab = vi.fn();

    await TestBed.configureTestingModule({
      imports: [StarQuestPanelComponent],
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
        { provide: AuthService, useValue: { openDrawer } },
        {
          provide: DockNavigationService,
          useValue: { requestTab, requestQuestAction },
        },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    localStorage.removeItem(STAR_CONQUEST_PROGRESS_STORAGE_KEY);
    TestBed.resetTestingModule();
  });

  function openQuest(id: string): ComponentFixture<StarQuestPanelComponent> {
    const state = TestBed.inject(StarConquestStateService);
    const progress = TestBed.inject(StarConquestProgressService);
    progress.resetForTests();
    const quest = starQuestById(id);
    expect(quest).toBeTruthy();
    if (!quest) throw new Error(id);
    state.show(quest, 12, 40);
    const fixture = TestBed.createComponent(StarQuestPanelComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('claims a preview star locally without faucet copy confusion', () => {
    const fixture = openQuest('sc-swap-slippage');
    const cta = fixture.nativeElement.querySelector(
      '.star-quest-panel__claim'
    ) as HTMLButtonElement;
    expect(cta.disabled).toBe(false);
    expect(cta.textContent).toContain('Conquérir');
    // Hint produit (pas de faucet) reste dans le view model — panneau compact ne l’affiche plus
    expect(fixture.componentInstance.view()?.hint).toContain('pas de crédit faucet');
    expect(fixture.nativeElement.querySelector('.star-quest-panel__status')).toBeNull();
    expect(fixture.nativeElement.querySelector('.star-quest-panel__live')).toBeNull();
    cta.click();
    fixture.detectChanges();
    const progress = TestBed.inject(StarConquestProgressService);
    expect(progress.snapshot().claimed['sc-swap-slippage']).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-claim="completed"]')).toBeTruthy();
  });

  it('routes a live star to the Dock action instead of a magic claim', () => {
    const fixture = openQuest('sc-swap-confirm');
    const progress = TestBed.inject(StarConquestProgressService);
    const cta = fixture.nativeElement.querySelector(
      '.star-quest-panel__claim'
    ) as HTMLButtonElement;
    expect(cta.textContent).toContain('Aller au swap');
    cta.click();
    expect(progress.snapshot().claimed['sc-swap-confirm']).toBeFalsy();
    expect(requestQuestAction).toHaveBeenCalledWith('swap');
  });

  it('surfaces a claim error when the star is locked', () => {
    const fixture = openQuest('sc-security-tx');
    const component = fixture.componentInstance;
    expect(component.view()?.ctaEnabled).toBe(false);
    component.claim();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.star-quest-panel__error')?.textContent).toContain(
      'voisin'
    );
  });

  it('notifies the facade on dismiss instead of window events', () => {
    const fixture = openQuest('sc-angular-layout');
    const facade = TestBed.inject(StarConquestFacade);
    const dismissed = vi.fn();
    const sub = facade.dismiss$.subscribe(dismissed);
    fixture.componentInstance.dismiss();
    expect(dismissed).toHaveBeenCalledTimes(1);
    expect(TestBed.inject(StarConquestStateService).panel()).toBeNull();
    sub.unsubscribe();
  });
});
