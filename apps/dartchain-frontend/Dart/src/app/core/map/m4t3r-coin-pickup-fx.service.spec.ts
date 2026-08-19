/**
 * @vitest-environment jsdom
 */
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';

import { M4T3R_COIN_PICKUP_FX } from './map-configuration';
import { M4t3rCoinPickupFxService } from './m4t3r-coin-pickup-fx.service';

describe('M4t3rCoinPickupFxService', () => {
  it('anime une pièce 3D au ramassage puis la retire', () => {
    const fx = new M4t3rCoinPickupFxService();
    const scene = new THREE.Scene();
    fx.attach(scene);

    fx.spawnAt('m4t3r-render:0:0', 0.625, 0, 0.625);
    const coin = scene.children.find((child) => child.name === 'm4t3r-coin-pickup-0');
    expect(coin).toBeTruthy();
    expect(coin?.visible).toBe(true);
    const startY = coin?.position.y ?? 0;

    fx.update(M4T3R_COIN_PICKUP_FX.durationMs / 2000);
    expect(coin?.position.y ?? 0).toBeGreaterThan(startY);

    fx.update(M4T3R_COIN_PICKUP_FX.durationMs / 2000 + 0.02);
    expect(coin?.visible).toBe(false);
    fx.dispose();
  });
});
