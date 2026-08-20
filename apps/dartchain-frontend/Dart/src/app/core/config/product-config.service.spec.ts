import { TestBed } from '@angular/core/testing';

import { ProductConfigService } from './product-config.service';

describe('ProductConfigService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('exposes environment product flags with defaults', () => {
    const service = TestBed.inject(ProductConfigService);

    expect(typeof service.commercial).toBe('boolean');
    expect(service.faucetEnabled).toBe(true);
    expect(typeof service.showcaseEnabled).toBe('boolean');
    expect(typeof service.starConquestOverlayEnabled).toBe('boolean');
    expect(typeof service.starConquestKpiDebug).toBe('boolean');
  });
});
