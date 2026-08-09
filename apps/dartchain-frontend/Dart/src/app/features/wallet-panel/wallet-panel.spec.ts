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

  it('should render create wallet CTA and status line', () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.wallet-display__create-cta')).toBeTruthy();
    expect(root.querySelector('.wallet-display__create-cta-label')?.textContent).toContain('CRÉER UN WALLET');
    expect(root.querySelector('.wallet-display__status-line')).toBeTruthy();
  });

  it('should show R4V3 cyber balance, CHF below tetris and tetris controls on load', () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.wallet-display__balance-cyber')).toBeTruthy();
    expect(root.querySelector('.wallet-display__balance-cyber-head')).toBeTruthy();
    expect(root.querySelector('.wallet-display__balance-cyber-account')).toBeTruthy();
    expect(root.querySelector('.wallet-display__balance-brand')?.textContent).toContain('R4V3');
    expect(root.querySelector('.wallet-display__balance-divider')).toBeTruthy();
    expect(root.querySelector('.wallet-display__holding-stack-line--lead')).toBeTruthy();
    expect(root.querySelectorAll('.wallet-display__holding-stack-line').length).toBe(4);
    expect(root.querySelector('.wallet-display__holding-stack-line--tail')).toBeTruthy();
    expect(root.querySelector('.wallet-display__balance-chf')).toBeTruthy();
    expect(root.querySelector('.wallet-display__balance-chf-value')).toBeTruthy();
    expect(root.querySelector('.wallet-display__tetris-grid')).toBeTruthy();
    expect(root.querySelector('.wallet-display__tetris-cell--active')).toBeTruthy();
    expect(root.querySelector('.wallet-display__tetris-logo-layer')).toBeTruthy();
    expect(root.querySelector('.wallet-display__tetris-logo-three')).toBeTruthy();
    expect(root.querySelectorAll('.wallet-display__tetris-btn').length).toBe(3);
    expect(root.querySelector('app-wallet-faucet-embed')).toBeTruthy();
    expect(root.querySelector('.wallet-faucet__claim')).toBeTruthy();
  });

  it('should render explorer address on a single row', () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.wallet-display__identity')).toBeFalsy();
    expect(root.querySelector('.wallet-display__explorer-row')).toBeTruthy();
    expect(root.querySelector('.wallet-display__explorer-input')).toBeTruthy();
    expect(root.querySelector('.wallet-display__mini-btn--lookup')).toBeTruthy();
  });
});
