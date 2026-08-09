import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';

import { QuestsDataService } from './quests-data.service';
import { QuestsPanelService } from '../../features/quests-panel/quests-panel.service';

describe('QuestsDataService', () => {
  let service: QuestsDataService;
  let questsPanelService: {
    loadCatalogAsync: ReturnType<typeof vi.fn>;
    syncStateAsync: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    questsPanelService = {
      loadCatalogAsync: vi.fn(async () => undefined),
      syncStateAsync: vi.fn(async () => undefined),
    };

    TestBed.configureTestingModule({
      providers: [
        QuestsDataService,
        { provide: QuestsPanelService, useValue: questsPanelService },
      ],
    });

    service = TestBed.inject(QuestsDataService);
  });

  afterEach(() => {
    service.destroy();
  });

  it('should refresh catalog and state', async () => {
    await service.refreshAll(true);
    expect(questsPanelService.loadCatalogAsync).toHaveBeenCalled();
    expect(questsPanelService.syncStateAsync).toHaveBeenCalled();
    expect(service.error()).toBeNull();
  });

  it('should set rate limit error on 429', async () => {
    questsPanelService.loadCatalogAsync.mockRejectedValueOnce(
      new HttpErrorResponse({ status: 429 })
    );

    await service.refreshAll(true);
    expect(service.error()).toBe('rate-limit');
    expect(service.rateLimitedUntil()).toBeGreaterThan(Date.now());
  });

  it('should schedule refresh on external events', async () => {
    service.init();
    window.dispatchEvent(new CustomEvent('dartchain-refresh-dock'));
    await new Promise((resolve) => window.setTimeout(resolve, 600));
    expect(questsPanelService.loadCatalogAsync).toHaveBeenCalled();
    service.destroy();
  });
});
