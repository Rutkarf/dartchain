import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { BlockchainApiService } from '../../core/services/blockchain-api.service';
import { ShowcaseNewsStateService } from '../../core/services/showcase-news-state.service';
import { ShowcaseTerminalComponent } from './showcase-terminal';

describe('ShowcaseTerminalComponent (Phase V)', () => {
  let fixture: ComponentFixture<ShowcaseTerminalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShowcaseTerminalComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: BlockchainApiService,
          useValue: {
            getBlocks: vi.fn(() =>
              of([
                {
                  index: 0,
                  hash: 'genesis',
                  previousHash: '0',
                  timestamp: 0,
                  transactions: [],
                },
              ])
            ),
            getPeers: vi.fn(() => of([])),
            getStats: vi.fn(() =>
              of({
                blocks: 1,
                pendingTransactions: 0,
                difficulty: 4,
              })
            ),
          },
        },
        {
          provide: ShowcaseNewsStateService,
          useValue: {
            items: vi.fn(() => []),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ShowcaseTerminalComponent);
    fixture.componentRef.setInput('mode', 'reseau');
    fixture.componentRef.setInput('expanded', true);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create and load terminal rows for reseau mode', async () => {
    expect(fixture.componentInstance).toBeTruthy();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.showcase-terminal')).toBeTruthy();
  });
});
