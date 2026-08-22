/**
 * @vitest-environment jsdom
 */
import * as THREE from 'three';
import { afterEach, describe, expect, it } from 'vitest';

import { MarseilleAtmosphereService } from './marseille-atmosphere.service';
import { activeAtmospherePreset } from './marseille-atmosphere.config';

describe('MarseilleAtmosphereService Phase 0', () => {
  let service: MarseilleAtmosphereService;
  let scene: THREE.Scene;

  afterEach(() => {
    service?.dispose();
  });

  it('applique fog + lumières unifiées sur la scène', () => {
    service = new MarseilleAtmosphereService();
    scene = new THREE.Scene();
    service.applyToScene(scene, 'medium');
    const preset = activeAtmospherePreset();
    expect(scene.fog).toBeTruthy();
    expect(scene.fog).toBeInstanceOf(THREE.FogExp2);
    expect((scene.fog as THREE.FogExp2).color.getHex()).toBe(preset.fogColor);
    const lightNames = scene.children.filter((c) => c instanceof THREE.Light).map((c) => c.name);
    expect(lightNames).toContain('metaverse-key');
    expect(lightNames).toContain('metaverse-ambient');
    expect(scene.getObjectByName('metaverse-spawn-bounce')).toBeTruthy();
    expect(scene.getObjectByName('metaverse-sky-dome')).toBeTruthy();
  });

  it('active les ombres spawn en medium', () => {
    service = new MarseilleAtmosphereService();
    scene = new THREE.Scene();
    service.applyToScene(scene, 'medium');
    const key = scene.getObjectByName('metaverse-key') as THREE.DirectionalLight;
    expect(key.castShadow).toBe(true);
    expect(key.shadow.mapSize.x).toBe(512);
    expect(key.shadow.radius).toBeGreaterThan(1);
    expect(scene.getObjectByName('metaverse-spawn-bounce')).toBeTruthy();
  });
});
