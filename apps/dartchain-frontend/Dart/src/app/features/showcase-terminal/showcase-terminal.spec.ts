import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { BlockchainApiService } from '../../core/services/blockchain-api.service';
import { ShowcaseNewsStateService } from '../../core/services/showcase-news-state.service';
import { ShowcaseTerminalComponent } from './showcase-terminal';

describe('ShowcaseTerminalComponent (Phase V)', () => {
  let fixture: ComponentFixture<ShowcaseTerminalComponent>;

  const configure = async (mode: 'reseau' | 'peers' = 'reseau') => {
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
            getPeers: vi.fn(() =>
              of([
                { url: 'https://node-alice.local:3000', status: 'CONNECTED' },
                { url: 'https://validator-42.local:3000', status: 'CONNECTED' },
              ])
            ),
            getStats: vi.fn(() =>
              of({
                totalBlocks: 1,
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
            liveActivity: vi.fn(() => ''),
            feedItems: vi.fn(() => []),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ShowcaseTerminalComponent);
    fixture.componentRef.setInput('mode', mode);
    fixture.componentRef.setInput('expanded', true);
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    await configure('reseau');
  });

  it('should create and render reseau showcase aligned with news layout', async () => {
    expect(fixture.componentInstance).toBeTruthy();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.showcase-terminal-reseau')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.showcase-news__meta-bar')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.showcase-terminal-reseau__led')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.showcase-meta__refresh')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('.showcase-terminal__title')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('.showcase-news__list')).toBeTruthy();
  });

  it('should render peers showcase with hub header and no legacy terminal chrome', async () => {
    fixture.componentRef.setInput('mode', 'peers');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.showcase-terminal-reseau')).toBeTruthy();
    expect(root.querySelector('.showcase-news__meta-bar')).toBeTruthy();
    expect(root.querySelector('.showcase-terminal-reseau__led')).toBeTruthy();
    expect(root.querySelector('.showcase-meta__live-text')?.textContent?.trim()).toBe('2');
    expect(root.querySelector('.showcase-meta__refresh')).toBeFalsy();
    expect(root.querySelector('.showcase-terminal__title')).toBeFalsy();
    expect(root.querySelector('.showcase-terminal__icon-btn')).toBeFalsy();
    expect(root.querySelector('.showcase-news__list')).toBeTruthy();
    expect(root.querySelectorAll('.showcase-news__item').length).toBe(2);
  });
});
