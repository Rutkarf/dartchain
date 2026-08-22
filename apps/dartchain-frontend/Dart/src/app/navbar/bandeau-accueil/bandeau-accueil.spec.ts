import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { BlockchainApiService } from '@blockchain/services/blockchain-api.service';
import { BandeauAccueilComponent } from './bandeau-accueil';

describe('BandeauAccueil', () => {
  let component: BandeauAccueilComponent;
  let fixture: ComponentFixture<BandeauAccueilComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BandeauAccueilComponent],
      providers: [
        {
          provide: BlockchainApiService,
          useValue: {
            getBanner: () =>
              of({
                message1: 'Test',
                lastTransaction: 'tx',
                lastTransactionShort: 'tx',
                userCount: 1,
              }),
            connectLiveUpdates: () => of(),
            getPeerStats: () => of({ active: 1, total: 2 }),
            getHealth: () => of({ ok: true }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BandeauAccueilComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should update offset when dragging horizontally', () => {
    const viewport = fixture.nativeElement.querySelector(
      '.bandeau-accueil__viewport'
    ) as HTMLElement;
    const track = fixture.nativeElement.querySelector(
      '.bandeau-accueil__track'
    ) as HTMLElement;

    expect(viewport).toBeTruthy();
    expect(track).toBeTruthy();

    component.onPointerDown(
      new PointerEvent('pointerdown', { clientX: 100, pointerId: 1, button: 0 })
    );
    component.onPointerMove(
      new PointerEvent('pointermove', { clientX: 40, pointerId: 1 })
    );

    expect(track.style.transform).toContain('translate3d(-60px');
    expect(component.isDragging).toBe(true);

    component.onPointerUp(new PointerEvent('pointerup', { pointerId: 1 }));
    expect(component.isDragging).toBe(false);
  });
});
