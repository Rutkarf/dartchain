import { TestBed } from '@angular/core/testing';

import {
  DEFAULT_MAP_CONFIGURATION,
  MARSEILLE_BOUNDS,
  MARSEILLE_START_ORIENTATION,
  MARSEILLE_START_POSITION,
  METRO_SPAWN_ANCHOR,
  VIEUX_PORT_METRO_MIRROR_VIEW,
  WORLD_METERS_PER_UNIT,
  WORLD_SCALE,
  WORLD_BACKGROUND_CONFIG,
  QUEST_PARTICLE_MODE,
  ORBIT_CONFIG,
  THIRD_PERSON_CAMERA_CONFIG,
} from './map-configuration';
import { MapConfigService } from './map-config.service';

describe('MapConfigService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('expose la configuration par défaut Marseille', () => {
    const service = TestBed.inject(MapConfigService);
    const config = service.configuration;

    expect(config.enabled).toBe(true);
    expect(config.provider).toBe('marseille-osm-three');
    expect(config.latitudeOrigin).toBe(MARSEILLE_START_POSITION.latitude);
    expect(config.longitudeOrigin).toBe(MARSEILLE_START_POSITION.longitude);
    expect(config.bounds).toEqual(MARSEILLE_BOUNDS);
    expect(config.startPosition).toEqual(MARSEILLE_START_POSITION);
    expect(config.startOrientation).toEqual(MARSEILLE_START_ORIENTATION);
    expect(config.startOrientation.cameraPitch).toBeCloseTo(0.12);
    expect(config.startOrientation.cameraDistance).toBe(6.2);
    expect(config.startOrientation.cameraDistance).toBeLessThan(8);
    expect(config.startOrientation.cameraLookAhead).toBe(0.2);
  });

  it('retourne marseille-osm-three comme provider effectif quand activé', () => {
    const service = TestBed.inject(MapConfigService);
    expect(service.effectiveProvider()).toBe('marseille-osm-three');
    expect(service.isLegacyProvider()).toBe(false);
  });

  it('aligne les valeurs par défaut documentées', () => {
    const service = TestBed.inject(MapConfigService);
    expect(service.configuration).toMatchObject({
      worldScale: DEFAULT_MAP_CONFIGURATION.worldScale,
      tileRadius: DEFAULT_MAP_CONFIGURATION.tileRadius,
      maxVisibleTiles: DEFAULT_MAP_CONFIGURATION.maxVisibleTiles,
      enableBuildings: true,
      enableTerrain: true,
      quality: 'medium',
    });
  });

  it('conserve l échelle 1 mètre = 1 unité Three.js', () => {
    const service = TestBed.inject(MapConfigService);
    expect(WORLD_METERS_PER_UNIT).toBe(1);
    expect(service.configuration.worldScale).toBe(WORLD_METERS_PER_UNIT);
    expect(WORLD_SCALE.metersPerWorldUnit).toBe(1);
    expect(WORLD_SCALE.chunkSizeMeters).toBe(128);
    expect(QUEST_PARTICLE_MODE).toBe('metaverse-starry-sky');
    expect(WORLD_BACKGROUND_CONFIG.fogFar).toBeGreaterThan(WORLD_BACKGROUND_CONFIG.fogNear);
    // Stick VIEW haut → quasi contre-plongée (un peu au-delà de l’horizon).
    expect(ORBIT_CONFIG.maxPolarAngle).toBeGreaterThan(Math.PI / 2);
    expect(ORBIT_CONFIG.maxPolarAngle).toBeLessThan(1.9);
    expect(ORBIT_CONFIG.minPolarAngle).toBeGreaterThan(0.2);
    expect(THIRD_PERSON_CAMERA_CONFIG.minPitch).toBeLessThan(-0.2);
  });

  it('place la station Miroir à côté du miroir, hors chaussée centrale', () => {
    const metroX = METRO_SPAWN_ANCHOR.mirror.x + METRO_SPAWN_ANCHOR.offsetFromMirror.x;
    const metroZ = METRO_SPAWN_ANCHOR.mirror.z + METRO_SPAWN_ANCHOR.offsetFromMirror.z;
    const spawnX = METRO_SPAWN_ANCHOR.mirror.x + METRO_SPAWN_ANCHOR.spawnOffsetFromMirror.x;
    const spawnZ = METRO_SPAWN_ANCHOR.mirror.z + METRO_SPAWN_ANCHOR.spawnOffsetFromMirror.z;

    expect(METRO_SPAWN_ANCHOR.id).toBe('vieux-port-metro-mirror');
    expect(METRO_SPAWN_ANCHOR.stationName).toContain('Vieux-Port');
    expect(Math.abs(metroX)).toBeGreaterThan(12);
    expect(metroZ).toBeLessThan(0);
    expect(Math.hypot(spawnX - metroX, spawnZ - metroZ)).toBeLessThan(16);
    expect(Math.hypot(spawnX, spawnZ)).toBeLessThan(12);
    expect(VIEUX_PORT_METRO_MIRROR_VIEW.id).toBe('VIEUX_PORT_METRO_MIRROR_VIEW');
  });
});
