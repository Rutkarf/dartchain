import { describe, expect, it } from 'vitest';
import * as THREE from 'three';

import {
  buildStreamingDistrictHaze,
  streamingHazeRingRadius,
  updateStreamingDistrictHaze,
} from './streaming-district-haze.util';
import { VIEUX_PORT_CORE_BUILDING_RADIUS } from './geo-reference.config';

describe('streaming-district-haze Phase 12', () => {
  it('forme un anneau autour du cœur geo', () => {
    expect(streamingHazeRingRadius()).toBe(VIEUX_PORT_CORE_BUILDING_RADIUS + 72);
    const built = buildStreamingDistrictHaze();
    expect(built.panels.length).toBe(10);
    expect(built.group.name).toBe('metaverse-streaming-district-haze');
  });

  it('module l’opacité selon la position joueur', () => {
    const built = buildStreamingDistrictHaze();
    updateStreamingDistrictHaze(built.panels, 0, 0);
    const nearCore = (built.panels[0].material as THREE.MeshBasicMaterial).opacity;

    updateStreamingDistrictHaze(built.panels, 500, 0);
    const farCore = (built.panels[0].material as THREE.MeshBasicMaterial).opacity;
    expect(farCore).toBeGreaterThan(nearCore);
  });
});
