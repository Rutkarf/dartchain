import { TestBed } from '@angular/core/testing';
import * as THREE from 'three';

import { M4t3rCollectTrailVisualService } from './m4t3r-collect-trail-visual.service';

describe('M4t3rCollectTrailVisualService', () => {
  it('instancie un pool de quads glow et enregistre une collecte', () => {
    const service = TestBed.inject(M4t3rCollectTrailVisualService);
    service.dispose();
    const root = new THREE.Group();
    service.attach(root);

    expect(root.getObjectByName('m4t3r-collect-trail-instanced')).toBeTruthy();
    expect(service.activeQuadCount()).toBe(0);

    service.addCollectSegment(
      { x: 0, y: 0, z: 0 },
      { x: 1.5, y: 0, z: 0 },
      ['m4t3r-cluster:1:0', 'm4t3r-cluster:2:0'],
      0.42
    );
    expect(service.activeQuadCount()).toBeGreaterThan(0);

    service.tickFade();
    service.dispose();
  });
});
