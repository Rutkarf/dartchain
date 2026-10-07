import { TestBed } from '@angular/core/testing';

import { LaunchDrawerService } from './launch-drawer.service';

describe('LaunchDrawerService', () => {
  let service: LaunchDrawerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LaunchDrawerService);
  });

  it('should open and close the drawer', () => {
    expect(service.isOpen()).toBe(false);

    service.open();
    expect(service.isOpen()).toBe(true);

    service.close();
    expect(service.isOpen()).toBe(false);
  });

  it('should emit create requests', () => {
    const requests: unknown[] = [];

    service.onCreate$.subscribe((request) => requests.push(request));
    service.emitCreate({ name: 'Test', symbol: 'TST', targetAmount: 100 });

    expect(requests.length).toBe(1);
  });
});
