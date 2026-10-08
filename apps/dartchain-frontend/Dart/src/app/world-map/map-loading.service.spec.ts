import { TestBed } from '@angular/core/testing';
import * as THREE from 'three';
import { vi } from 'vitest';

import { MapConfigService } from './map-config.service';
import { MapLoadingService } from './map-loading.service';
import { LegacyFloorMapProvider } from './legacy-floor-map.provider';
import { MetaverseMapProvider } from './metaverse-map.provider';
import { PlacementAnchorLayer } from './placements/placement-anchor.layer';
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
  let metaverse: MapProvider;
  let config: MapConfigService;
  let placementLayer: {
    attach: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    dispose: ReturnType<typeof vi.fn>;
  };

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();

  beforeEach(() => {
    legacy = createMockProvider('legacy-floor');
    metaverse = createMockProvider('metaverse-osm-three');
    placementLayer = {
      attach: vi.fn().mockResolvedValue(undefined),
      update: vi.fn(),
      dispose: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        MapLoadingService,
        {
          provide: LegacyFloorMapProvider,
          useValue: legacy,
        },
        {
          provide: MetaverseMapProvider,
          useValue: metaverse,
        },
        {
          provide: PlacementAnchorLayer,
          useValue: placementLayer,
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
    expect(metaverse.initialize).not.toHaveBeenCalled();
    expect(service.getState()).toEqual({
      activeProviderId: 'legacy-floor',
      fallbackActive: false,
      lastError: null,
    });
    expect(placementLayer.attach).not.toHaveBeenCalled();
  });

  it('tente metaverse puis bascule sur legacy en cas d échec', async () => {
    vi.spyOn(config, 'effectiveProvider').mockReturnValue('metaverse-osm-three');
    vi.mocked(metaverse.initialize).mockRejectedValueOnce(new Error('OSM indisponible'));

    await service.initialize(scene, camera);

    expect(metaverse.initialize).toHaveBeenCalledWith(scene, camera);
    expect(legacy.initialize).toHaveBeenCalledWith(scene, camera);
    expect(service.getState()).toEqual({
      activeProviderId: 'legacy-floor',
      fallbackActive: true,
      lastError: 'OSM indisponible',
    });
    expect(placementLayer.attach).not.toHaveBeenCalled();
  });

  it('active metaverse sans fallback si init réussit', async () => {
    vi.spyOn(config, 'effectiveProvider').mockReturnValue('metaverse-osm-three');

    await service.initialize(scene, camera);

    expect(metaverse.initialize).toHaveBeenCalledWith(scene, camera);
    expect(legacy.initialize).not.toHaveBeenCalled();
    expect(service.getState().fallbackActive).toBe(false);
    expect(service.getState().activeProviderId).toBe('metaverse-osm-three');
    expect(placementLayer.attach).toHaveBeenCalledWith(scene);
  });

  it('dispose le provider actif', async () => {
    vi.spyOn(config, 'effectiveProvider').mockReturnValue('legacy-floor');
    await service.initialize(scene, camera);

    service.dispose();

    expect(legacy.dispose).toHaveBeenCalled();
    expect(placementLayer.dispose).toHaveBeenCalled();
    expect(service.getActiveProvider()).toBeNull();
    expect(service.getState().fallbackActive).toBe(false);
  });
});
