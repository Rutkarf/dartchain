import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PendingTransactionsComponent } from './pending-transactions';

describe('PendingTransactions', () => {
  let component: PendingTransactionsComponent;
  let fixture: ComponentFixture<PendingTransactionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PendingTransactionsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PendingTransactionsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
