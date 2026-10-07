/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';

import { M4T3R_PICKUP_FX } from './map-configuration';
import { M4t3rPickupFxService } from './m4t3r-pickup-fx.service';

describe('M4t3rPickupFxService', () => {
  it('spawn un +1 par appel spawnOne', () => {
    const fx = new M4t3rPickupFxService();
    const scene = new THREE.Scene();
    const character = new THREE.Object3D();
    scene.add(character);
    fx.attach(scene);

    fx.spawnOne(character, 'm4t3r-render:0:0');
    fx.spawnOne(character, 'm4t3r-render:1:0');
    const visible = scene.children.filter(
      (child) => child.name.startsWith('m4t3r-pickup-plus-one') && child.visible
    );
    expect(visible.length).toBe(2);

    fx.update(M4T3R_PICKUP_FX.durationMs / 1000);
    expect(
      scene.children.filter(
        (child) => child.name.startsWith('m4t3r-pickup-plus-one') && child.visible
      ).length
    ).toBe(0);
    fx.dispose();
  });

  it('empile les +1 sur des lanes verticales distinctes', () => {
    const fx = new M4t3rPickupFxService();
    const scene = new THREE.Scene();
    const character = new THREE.Object3D();
    character.position.set(0, 0, 0);
    scene.add(character);
    fx.attach(scene);

    fx.spawnOne(character, 'm4t3r-render:0:0');
    fx.spawnOne(character, 'm4t3r-render:1:0');
    const visible = scene.children.filter(
      (child) => child.name.startsWith('m4t3r-pickup-plus-one') && child.visible
    ) as THREE.Sprite[];
    expect(visible.length).toBe(2);
    expect(visible[1]!.position.y).toBeGreaterThan(visible[0]!.position.y);

    fx.dispose();
  });
});
