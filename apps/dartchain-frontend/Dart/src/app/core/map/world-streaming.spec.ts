import { TestBed } from '@angular/core/testing';
import * as THREE from 'three';

import {
  MARSEILLE_DISTRICTS,
  MIRROR_SECOND_BUILDING_ID,
  M4T3R_PICKUP_FX,
  R4V3_GROUND_FIELD,
  SCENE_COPY,
  TRAIL_CONFIG,
  WORLD_SCALE,
} from './map-configuration';
import { clusterId } from './m4t3r-trail.util';
import { M4t3rPickupFxService } from './m4t3r-pickup-fx.service';
import { TokenCellService } from './token-cell.service';
import { tokenCellId } from './token-cell.types';
import {
  chunkIdFromGrid,
  deterministicChunkSeed,
  worldToChunkGrid,
} from './world-chunk.types';

describe('World streaming and R4V3 cells', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('conserve des IDs de chunks et de cellules deterministes', () => {
    expect(chunkIdFromGrid(2, -3)).toBe('chunk:2:-3');
    expect(tokenCellId(4, 8)).toBe('r4v3:4:8');
    expect(deterministicChunkSeed(2, -3)).toBe(deterministicChunkSeed(2, -3));
    expect(deterministicChunkSeed(2, -3)).not.toBe(deterministicChunkSeed(2, -4));
    expect(worldToChunkGrid(130, WORLD_SCALE.chunkSizeMeters)).toBe(1);
  });

  it('etale un tapis de jetons R4V3 fixe autour du joueur', () => {
    const service = TestBed.inject(TokenCellService);
    const root = new THREE.Group();
    service.attach(root);
    const origin = new THREE.Vector3(-6.2, 0, -2.4);
    const count = service.update(origin);
    expect(count).toBeGreaterThan(400);
    expect(root.getObjectByName('r4v3-token-instances')).toBeTruthy();
    const again = service.update(origin);
    expect(again).toBe(count);
    service.dispose();
  });

  it('refuse une double collecte locale sans attribuer de token', () => {
    const service = TestBed.inject(TokenCellService);
    const player = new THREE.Vector3(8, 0, 8);
    const first = service.requestCollect('player-a', player);
    expect(first).not.toBeNull();
    expect(first?.cellId.startsWith('m4t3r-cluster:')).toBe(true);
    const second = service.requestCollect('player-a', player);
    expect(second).toBeNull();
    expect(WORLD_SCALE.tokenMaxVisibleInstances).toBe(4096);
    expect(WORLD_SCALE.tokenCellSizeMeters).toBe(1.25);
    expect(WORLD_SCALE.tokenVisibleRadiusMeters).toBe(64);
    expect(WORLD_SCALE.maxLoadedChunks).toBe(24);
    expect(R4V3_GROUND_FIELD.visibleRadius).toBe(64);
    expect(MARSEILLE_DISTRICTS['le-panier'].estimated).toBe(true);
    expect(MARSEILLE_DISTRICTS['le-panier'].latitude).toBeCloseTo(43.2988, 4);
    expect(MARSEILLE_DISTRICTS.joliette.estimated).toBe(true);
    expect(MARSEILLE_DISTRICTS.joliette.latitude).toBeCloseTo(43.3018, 4);
    expect(TRAIL_CONFIG.respawnDelayMs).toBe(30_000);
    expect(clusterId(32, 32)).toBe('m4t3r-cluster:32:32');
    expect(tokenCellId(4, 8)).toBe('r4v3:4:8');
  });

  it('remplace les textes de scene et identifie le batiment R4V3', () => {
    expect(SCENE_COPY.canopyTitle).toBe('MetaVerseBB');
    expect(SCENE_COPY.roadMarking).toBe('Hack The Planet x)');
    expect(SCENE_COPY.r4v3).toBe('R4V3');
    expect(SCENE_COPY.m4t3rPickup).toBe('+1');
    expect(MIRROR_SECOND_BUILDING_ID).toBe('mirror-adjacent-building-02');
  });

  it('fait evaperer le +1 M4T3R au-dessus de la tete sans crediter de token', () => {
    const fx = TestBed.inject(M4t3rPickupFxService);
    const scene = new THREE.Scene();
    const character = new THREE.Object3D();
    character.position.set(2, 0, 4);
    scene.add(character);
    fx.attach(scene);
    fx.spawn(character, 3);
    const sprite = scene.children.find((child) => child.name.startsWith('m4t3r-pickup-plus-one'));
    expect(sprite).toBeTruthy();
    expect(sprite?.visible).toBe(true);
    expect((sprite?.position.y ?? 0)).toBeGreaterThan(character.position.y);
    expect(sprite instanceof THREE.Sprite ? sprite.scale.x : 0).toBeGreaterThan(2);
    const plusOnes = scene.children.filter((child) => child.name.startsWith('m4t3r-pickup-plus-one') && child.visible);
    expect(plusOnes.length).toBe(3);
    fx.update(M4T3R_PICKUP_FX.durationMs / 1000);
    expect(sprite?.visible).toBe(false);
    fx.dispose();
  });
});
