import { TestBed } from '@angular/core/testing';
import * as THREE from 'three';
import { vi } from 'vitest';

import { MapConfigService } from './map-config.service';
import { MapLoadingService } from './map-loading.service';
import { LegacyFloorMapProvider } from './legacy-floor-map.provider';
import { MarseilleMapProvider } from './marseille-map.provider';
import type { MapProvider } from './map-provider.interface';

function createMockProvider(id: MapProvider['id']): MapProvider {
  return {
    id,
    initialize: vi.fn().mockResolvedValue(undefined),
    update: vi.fn(),
    getSurfaceHeight: vi.fn().mockResolvedValue(0),
    getSurfaceProvider: vi.fn().mockReturnValue({
      getSurfaceHeight: vi.fn().mockResolvedValue(0),
      isWalkable: vi.fn().mockReturnValue(true),
    }),
    dispose: vi.fn(),
  };
}

describe('MapLoadingService', () => {
  let service: MapLoadingService;
  let legacy: MapProvider;
  let marseille: MapProvider;
  let config: MapConfigService;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();

  beforeEach(() => {
    legacy = createMockProvider('legacy-floor');
    marseille = createMockProvider('marseille-osm-three');

    TestBed.configureTestingModule({
      providers: [
        MapLoadingService,
        {
          provide: LegacyFloorMapProvider,
          useValue: legacy,
        },
        {
          provide: MarseilleMapProvider,
          useValue: marseille,
        },
      ],
    });

    service = TestBed.inject(MapLoadingService);
    config = TestBed.inject(MapConfigService);
  });

  it('charge legacy-floor directement quand provider legacy', async () => {
    vi.spyOn(config, 'effectiveProvider').mockReturnValue('legacy-floor');

    await service.initialize(scene, camera);

    expect(legacy.initialize).toHaveBeenCalledWith(scene, camera);
    expect(marseille.initialize).not.toHaveBeenCalled();
    expect(service.getState()).toEqual({
      activeProviderId: 'legacy-floor',
      fallbackActive: false,
      lastError: null,
    });
  });

  it('tente marseille puis bascule sur legacy en cas d échec', async () => {
    vi.spyOn(config, 'effectiveProvider').mockReturnValue('marseille-osm-three');
    vi.mocked(marseille.initialize).mockRejectedValueOnce(new Error('OSM indisponible'));

    await service.initialize(scene, camera);

    expect(marseille.initialize).toHaveBeenCalledWith(scene, camera);
    expect(legacy.initialize).toHaveBeenCalledWith(scene, camera);
    expect(service.getState()).toEqual({
      activeProviderId: 'legacy-floor',
      fallbackActive: true,
      lastError: 'OSM indisponible',
    });
  });

  it('active marseille sans fallback si init réussit', async () => {
    vi.spyOn(config, 'effectiveProvider').mockReturnValue('marseille-osm-three');

    await service.initialize(scene, camera);

    expect(marseille.initialize).toHaveBeenCalledWith(scene, camera);
    expect(legacy.initialize).not.toHaveBeenCalled();
    expect(service.getState().fallbackActive).toBe(false);
    expect(service.getState().activeProviderId).toBe('marseille-osm-three');
  });

  it('dispose le provider actif', async () => {
    vi.spyOn(config, 'effectiveProvider').mockReturnValue('legacy-floor');
    await service.initialize(scene, camera);

    service.dispose();

    expect(legacy.dispose).toHaveBeenCalled();
    expect(service.getActiveProvider()).toBeNull();
    expect(service.getState().fallbackActive).toBe(false);
  });
});
