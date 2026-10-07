import { TestBed } from '@angular/core/testing';

import { DockNavigationService } from './dock-navigation.service';
import { TransactionsDockService } from './transactions-dock.service';

describe('DockNavigationService', () => {
  let service: DockNavigationService;
  let transactionsDock: TransactionsDockService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DockNavigationService);
    transactionsDock = TestBed.inject(TransactionsDockService);
  });

  it('should map pending overlay to transactions + mempool', () => {
    service.requestBlockchainPanel('pending');
    expect(transactionsDock.activeSubTab()).toBe('mempool');
    expect(DockNavigationService.overlayToBottomTab('pending')).toBe('transactions');
  });

  it('should map composer overlay to transactions + composer', () => {
    service.requestBlockchainPanel('composer');
    expect(transactionsDock.activeSubTab()).toBe('composer');
    expect(DockNavigationService.overlayToBottomTab('composer')).toBe('transactions');
  });

  it('should normalize legacy pending tab requests', async () => {
    const tabPromise = new Promise<string>((resolve) => {
      service.tabRequest$.subscribe((tab) => resolve(tab));
    });

    service.requestTab('pending');
    const tab = await tabPromise;

    expect(tab).toBe('transactions');
    expect(transactionsDock.activeSubTab()).toBe('mempool');
  });
});
