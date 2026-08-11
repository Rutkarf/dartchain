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

  it('should render glass balance with full R4V3 amount and CHF', () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.wallet-display__balance-cyber')).toBeTruthy();
    expect(root.querySelector('.wallet-display__balance-cyber-head')).toBeTruthy();
    expect(root.querySelector('.wallet-display__balance-cyber-rail')).toBeTruthy();
    expect(root.querySelector('.wallet-display__balance-glass')).toBeTruthy();
    expect(root.querySelector('.wallet-display__balance-brand')?.textContent).toContain('R4V3');
    expect(root.querySelector('.wallet-display__balance-amount')).toBeTruthy();
    expect(root.querySelector('.wallet-display__balance-divider')).toBeFalsy();
    expect(root.querySelector('.wallet-display__balance-chf')).toBeTruthy();
    expect(root.querySelector('.wallet-display__balance-chf-value')).toBeTruthy();
    expect(root.querySelector('.wallet-display__tetris')).toBeFalsy();
    expect(root.querySelector('app-wallet-faucet-embed')).toBeTruthy();
    expect(root.querySelector('.wallet-faucet__claim')).toBeTruthy();
    expect(root.querySelector('.wallet-display__action-btn--swap')).toBeTruthy();
    expect(root.querySelector('.wallet-display__action-btn--swap')?.textContent).toContain('Swap');
  });

  it('should render explorer address under the faucet', () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.wallet-display__identity')).toBeFalsy();
    expect(root.querySelector('.wallet-display__explorer--under-faucet')).toBeTruthy();
    expect(root.querySelector('.wallet-display__faucet-col .wallet-display__explorer-row')).toBeTruthy();
    expect(root.querySelector('.wallet-display__explorer-input')).toBeTruthy();
    expect(root.querySelector('.wallet-display__mini-btn--lookup')).toBeTruthy();
  });

  it('should render recent lookups panel under explorer', () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.wallet-display__recent')).toBeTruthy();
    expect(root.querySelector('.wallet-display__recent-title')).toBeTruthy();
    expect(root.querySelector('.wallet-display__recent-empty')).toBeTruthy();
  });

  it('should keep keys under the balance column when absent without wallet', () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.wallet-display__keys--under-balance')).toBeFalsy();
    expect(root.querySelector('.wallet-display__faucet-col .wallet-display__keys')).toBeFalsy();
  });
});
