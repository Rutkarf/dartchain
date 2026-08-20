import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';

import { QuestsPanelService } from '../features/quests-panel/quests-panel.service';
import { ParticleBackgroundComponent } from './particle-background';

describe('ParticleBackground', () => {
  let component: ParticleBackgroundComponent;
  let fixture: ComponentFixture<ParticleBackgroundComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ParticleBackgroundComponent],
      providers: [
        {
          provide: QuestsPanelService,
          useValue: {
            state$: new BehaviorSubject({
              dayKey: 'test',
              tasks: {},
              missionClaimed: false,
              weeklyClaimed: false,
              totalXp: 0,
              pendingMts: 0,
            }).asObservable(),
            buildTaskViews: () => [],
          },
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ParticleBackgroundComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
