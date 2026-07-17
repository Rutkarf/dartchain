import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WalletPanelComponent } from './wallet-panel';

describe('WalletPanel', () => {
  let component: WalletPanelComponent;
  let fixture: ComponentFixture<WalletPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WalletPanelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WalletPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render wallet toolbar with create, center status and refresh', () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.wallet-display__toolbar')).toBeTruthy();
    expect(root.querySelector('.wallet-display__icon-btn--create')).toBeTruthy();
    expect(root.querySelector('.wallet-display__icon-btn--refresh')).toBeTruthy();
    expect(root.querySelector('.wallet-display__center')).toBeTruthy();
    expect(root.querySelector('.wallet-display__title')).toBeFalsy();
  });

  it('should show R4V3 balance block on load before wallet initialization', () => {
    const root = fixture.nativeElement as HTMLElement;
    const balanceLine = root.querySelector('.wallet-display__balance-line');
    expect(balanceLine).toBeTruthy();
    expect(balanceLine?.textContent).toContain('R4V3');
    expect(balanceLine?.textContent).toContain('m4t3r');
    expect(root.querySelector('.wallet-display__fiat')).toBeTruthy();
    expect(root.querySelector('.wallet-display__metrics')).toBeFalsy();
    expect(root.querySelector('.wallet-display__section-title')).toBeFalsy();
  });

  it('should render explorer address on a single row', () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.wallet-display__explorer-row')).toBeTruthy();
    expect(root.querySelector('.wallet-display__explorer-input')).toBeTruthy();
    expect(root.querySelector('.wallet-display__mini-btn--lookup')).toBeTruthy();
  });
});
