import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { TransactionsDockComponent } from './transactions-dock';
import { TransactionsDockService } from '../../core/services/transactions-dock.service';

describe('TransactionsDockComponent', () => {
  let component: TransactionsDockComponent;
  let fixture: ComponentFixture<TransactionsDockComponent>;
  let dock: TransactionsDockService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransactionsDockComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(TransactionsDockComponent);
    component = fixture.componentInstance;
    dock = TestBed.inject(TransactionsDockService);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render composer and mempool together', () => {
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('app-block-composer')).toBeTruthy();
    expect(root.querySelector('app-pending-transactions')).toBeTruthy();
    expect(root.querySelector('.transactions-dock__subnav')).toBeFalsy();
  });

  it('should show mempool count in header summary', () => {
    dock.setPendingCount(3);
    fixture.detectChanges();
    expect(component['mempoolSummary']()).toContain('3');
  });
});
