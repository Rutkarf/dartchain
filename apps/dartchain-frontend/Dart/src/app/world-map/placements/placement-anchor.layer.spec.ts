import { NgZone } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import * as THREE from 'three';
import { vi } from 'vitest';

import { ThreeSceneService } from '@metaverse/services/three-scene.service';
import { mapPlacementsResponse } from './placement.mapper';
import { createDevPlacementFixtures } from './placement-fixtures.dev';
import { PlacementAnchorLayer } from './placement-anchor.layer';
import { PlacementFacade } from './placement.facade';

describe('PlacementAnchorLayer', () => {
  it('attache un groupe de hit-volumes distinct du décor', async () => {
    const catalog = mapPlacementsResponse(createDevPlacementFixtures());
    const facade = {
      load: vi.fn().mockResolvedValue({ catalog, fallback: 'fixture-dev', error: null }),
      selectedPlacementId: () => null,
      select: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        PlacementAnchorLayer,
        { provide: PlacementFacade, useValue: facade },
        {
          provide: ThreeSceneService,
          useValue: { getRenderer: () => null, getCamera: () => null },
        },
        { provide: NgZone, useValue: { run: (fn: () => void) => fn() } },
      ],
    });

    const layer = TestBed.inject(PlacementAnchorLayer);
    const scene = new THREE.Scene();
    await layer.attach(scene);

    const group = scene.getObjectByName('metaverse-placement-layer');
    expect(group).toBeTruthy();
    expect(group?.children.length).toBeGreaterThan(0);
    expect(scene.getObjectByName('placement-hit-dev-placement-01')).toBeTruthy();

    layer.dispose();
    expect(scene.getObjectByName('metaverse-placement-layer')).toBeUndefined();
  });
});
