/**
 * @vitest-environment jsdom
 */
import '@angular/compiler';
import { Injector } from '@angular/core';
import { describe, expect, it, beforeEach } from 'vitest';
import * as THREE from 'three';

import { MetaverseIntroCameraService } from './metaverse-intro-camera.service';
import { METAVERSE_INTRO_CAMERA } from './metaverse-intro-camera.config';

describe('MetaverseIntroCameraService', () => {
  const endOrbit = {
    yaw: 0,
    pitch: 0.12,
    distance: 6.2,
    lookAhead: 0.35,
    arenaPeek: true,
  };

  let intro: MetaverseIntroCameraService;

  beforeEach(() => {
    const injector = Injector.create({
      providers: [MetaverseIntroCameraService],
    });
    intro = injector.get(MetaverseIntroCameraService);
  });

  it('arme en nadir 90° figé (pas de flash POV)', () => {
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
    camera.position.set(0, 2, 8);

    intro.arm(camera);
    expect(intro.isArmed()).toBe(true);
    expect(intro.veilPhase()).toBe('armed');
    expect(intro.veilOpacity()).toBeLessThan(0.2);

    intro.tickArmed(METAVERSE_INTRO_CAMERA.veilEnterSeconds, camera);
    expect(intro.veilOpacity()).toBeGreaterThan(0.7);
    expect(camera.position.y).toBeCloseTo(METAVERSE_INTRO_CAMERA.startHeight, 5);
    expect(camera.up.z).toBeLessThan(0);
    expect(camera.fov).toBeCloseTo(METAVERSE_INTRO_CAMERA.startFov, 5);
  });

  it('garde le nadir figé pendant le hold puis spirale → POV', () => {
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
    const charPos = new THREE.Vector3(0, 0, 5);

    intro.arm(camera);
    intro.tickArmed(1, camera);
    expect(intro.tryStart(endOrbit)).toBe(true);
    expect(intro.veilPhase()).toBe('holding');

    intro.tick(METAVERSE_INTRO_CAMERA.holdTitleSeconds * 0.5, camera, charPos);
    expect(intro.isActive()).toBe(true);
    expect(camera.position.y).toBeCloseTo(METAVERSE_INTRO_CAMERA.startHeight, 5);
    expect(camera.fov).toBeCloseTo(METAVERSE_INTRO_CAMERA.startFov, 5);
    expect(intro.veilPhase()).toBe('holding');
    expect(intro.veilOpacity()).toBeCloseTo(METAVERSE_INTRO_CAMERA.holdVeilOpacity, 5);

    intro.tick(METAVERSE_INTRO_CAMERA.holdTitleSeconds * 0.6 + 0.05, camera, charPos, endOrbit);
    expect(intro.veilPhase()).toBe('revealing');

    const yBefore = camera.position.y;
    intro.tick(0.08, camera, charPos, endOrbit);
    expect(Math.abs(camera.position.y - yBefore)).toBeLessThan(8);

    let guard = 0;
    while (intro.isActive() && guard++ < 250) {
      intro.tick(0.05, camera, charPos, endOrbit);
    }
    expect(intro.isActive()).toBe(false);
    expect(intro.veilOpacity()).toBe(0);
    expect(intro.veilPhase()).toBe('hidden');
    expect(camera.position.y).toBeLessThan(12);
    expect(camera.up.y).toBeCloseTo(1, 5);
  });
});
