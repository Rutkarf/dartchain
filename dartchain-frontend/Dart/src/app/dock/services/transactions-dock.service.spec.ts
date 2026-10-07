import { TestBed } from '@angular/core/testing';

import { TransactionsDockService } from './transactions-dock.service';

describe('TransactionsDockService', () => {
  let service: TransactionsDockService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TransactionsDockService);
  });

  it('should default to composer sub-tab', () => {
    expect(service.activeSubTab()).toBe('composer');
  });

  it('should switch to mempool and set highlight', () => {
    service.showMempool('tx-123');
    expect(service.activeSubTab()).toBe('mempool');
    expect(service.highlightTransactionId()).toBe('tx-123');
  });

  it('should track pending count', () => {
    service.setPendingCount(4);
    expect(service.pendingCount()).toBe(4);
    service.setPendingCount(-2);
    expect(service.pendingCount()).toBe(0);
  });

  it('should clear highlight when returning to composer', () => {
    service.showMempool('tx-abc');
    service.showComposer();
    expect(service.activeSubTab()).toBe('composer');
    expect(service.highlightTransactionId()).toBeNull();
  });
});
