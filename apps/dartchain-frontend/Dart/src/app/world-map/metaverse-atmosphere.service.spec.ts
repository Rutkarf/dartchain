/**
 * @vitest-environment jsdom
 */
import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';

import { MetaverseAtmosphereService } from './metaverse-atmosphere.service';
import { activeAtmospherePreset } from './metaverse-atmosphere.config';
import { ProductConfigService } from '@core/config/product-config.service';

describe('MetaverseAtmosphereService Phase 0', () => {
  let service: MetaverseAtmosphereService;
  let scene: THREE.Scene;
  let product: ProductConfigService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MetaverseAtmosphereService);
    product = TestBed.inject(ProductConfigService);
  });

  afterEach(() => {
    service?.dispose();
  });

  it('applique fog + lumières unifiées sur la scène', () => {
    scene = new THREE.Scene();
    service.applyToScene(scene, 'medium');
    const preset = activeAtmospherePreset(product.metaverseArenaEnabled);
    expect(scene.fog).toBeTruthy();
    expect(scene.fog).toBeInstanceOf(THREE.FogExp2);
    expect((scene.fog as THREE.FogExp2).color.getHex()).toBe(preset.fogColor);
    const lightNames = scene.children.filter((c) => c instanceof THREE.Light).map((c) => c.name);
    expect(lightNames).toContain('metaverse-key');
    expect(lightNames).toContain('metaverse-ambient');
    expect(scene.getObjectByName('metaverse-sky-dome')).toBeTruthy();
  });

  it('active les ombres spawn en high', () => {
    scene = new THREE.Scene();
    service.applyToScene(scene, 'high');
    const key = scene.getObjectByName('metaverse-key') as THREE.DirectionalLight;
    expect(key.castShadow).toBe(true);
    expect(key.shadow.mapSize.x).toBe(512);
    expect(key.shadow.radius).toBeGreaterThan(1);
  });
});
