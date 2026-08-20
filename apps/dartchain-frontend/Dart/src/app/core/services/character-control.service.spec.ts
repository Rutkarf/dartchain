import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { CameraControlService } from './camera-control.service';
import { CharacterControlService } from './character-control.service';
import { FloorCollectRuntime } from '../../three-floor/floor-runtime/floor-collect.runtime';
import { FloorMoveRuntime } from '../../three-floor/floor-runtime/floor-move.runtime';

describe('CharacterControlService façade', () => {
  let control: CharacterControlService;
  let onMovementJoystickUpdate: ReturnType<typeof vi.fn>;
  let update: ReturnType<typeof vi.fn>;
  let reset: ReturnType<typeof vi.fn>;
  let collectReset: ReturnType<typeof vi.fn>;
  let updateGround: ReturnType<typeof vi.fn>;
  let updateFromJoystick: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onMovementJoystickUpdate = vi.fn();
    update = vi.fn().mockReturnValue(null);
    reset = vi.fn();
    collectReset = vi.fn();
    updateGround = vi.fn();
    updateFromJoystick = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        CharacterControlService,
        {
          provide: FloorMoveRuntime,
          useValue: {
            climbPrompt$: of(false),
            onMovementJoystickUpdate,
            update,
            reset,
            getProgress: () => 0,
            getLane: () => 0,
            isClimbing: () => false,
            unbindKeys: vi.fn(),
          },
        },
        {
          provide: FloorCollectRuntime,
          useValue: { reset: collectReset, updateGround },
        },
        { provide: CameraControlService, useValue: { updateFromJoystick } },
      ],
    });
    control = TestBed.inject(CharacterControlService);
  });

  it('délègue MOVE au runtime et VIEW à la caméra', () => {
    control.onMovementJoystickUpdate({ x: 0.5, y: -0.2 });
    control.onCameraJoystickUpdate({ x: 2, y: -2 });
    expect(onMovementJoystickUpdate).toHaveBeenCalledWith({ x: 0.5, y: -0.2 });
    expect(updateFromJoystick).toHaveBeenCalledWith({ x: 1, y: -1 });
  });

  it('reset collect puis move (trail + spawn)', () => {
    control.resetRunner();
    expect(collectReset).toHaveBeenCalled();
    expect(reset).toHaveBeenCalled();
  });

  it('n’appelle collect que si le move runtime rend un frame Marseille', () => {
    control.update(0.016);
    expect(updateGround).not.toHaveBeenCalled();
    update.mockReturnValue({
      mesh: {},
      playerId: 'p1',
      velocity: { x: 0, y: 0, z: 0 },
    });
    control.update(0.016);
    expect(updateGround).toHaveBeenCalledTimes(1);
  });
});
