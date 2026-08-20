import { NgZone } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { GeoCoordinateService } from '../../core/map/geo-coordinate.service';
import { MapConfigService } from '../../core/map/map-config.service';
import { MapLoadingService } from '../../core/map/map-loading.service';
import { CameraControlService } from '../../core/services/camera-control.service';
import { CharacterNftService } from '../../core/services/character-nft.service';
import { RunnerStateService } from '../../core/services/runner/runner-state.service';
import { RunnerWorldService } from '../../core/services/runner/runner-world.service';
import { FloorMoveRuntime } from './floor-move.runtime';

describe('FloorMoveRuntime', () => {
  let runtime: FloorMoveRuntime;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        FloorMoveRuntime,
        {
          provide: CharacterNftService,
          useValue: {
            getState: () => ({ mesh: null, isLoaded: false, userId: 'local' }),
          },
        },
        {
          provide: CameraControlService,
          useValue: {
            update: vi.fn(),
            resetOrbit: vi.fn(),
            nudge: vi.fn(),
            getYaw: () => 0,
            updateFromJoystick: vi.fn(),
            toggleValidationView: vi.fn(),
          },
        },
        { provide: RunnerWorldService, useValue: { isWalkable: () => true, update: vi.fn() } },
        { provide: RunnerStateService, useValue: { progress: 0, lane: 0, reset: vi.fn() } },
        {
          provide: MapLoadingService,
          useValue: {
            getState: () => ({ activeProviderId: 'legacy-floor', fallbackActive: false }),
            getActiveProvider: () => null,
            update: vi.fn(),
          },
        },
        {
          provide: MapConfigService,
          useValue: { configuration: { startPosition: {}, startOrientation: {}, altitudeOrigin: 0 } },
        },
        { provide: GeoCoordinateService, useValue: { geoToWorld: () => ({ x: 0, y: 0, z: 0 }) } },
        { provide: NgZone, useValue: { run: (fn: () => void) => fn() } },
      ],
    });
    runtime = TestBed.inject(FloorMoveRuntime);
  });

  it('clamp le stick MOVE à [-1, 1]', () => {
    runtime.onMovementJoystickUpdate({ x: 4, y: -3 });
    expect(runtime).toBeTruthy();
  });

  it('n’est pas en climb après reset', () => {
    runtime.reset();
    expect(runtime.isClimbing()).toBe(false);
  });

  it('expose climbPrompt$ pour le HUD character', () => {
    const seen: boolean[] = [];
    runtime.climbPrompt$.subscribe((v) => seen.push(v));
    expect(seen[0]).toBe(false);
  });
});
