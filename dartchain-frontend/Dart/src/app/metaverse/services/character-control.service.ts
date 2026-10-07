import { Injectable, inject } from '@angular/core';
import * as THREE from 'three';

import { CameraControlService } from './camera-control.service';
import { FloorCollectRuntime } from '@metaverse/floor-runtime/floor-collect.runtime';
import { FloorMoveRuntime } from '@metaverse/floor-runtime/floor-move.runtime';

/**
 * Façade personnage — MOVE / VIEW / rAF délèguent aux runtimes floor.
 * Ne touche plus Auth, Wallet, tokens ni faucet.
 */
@Injectable({ providedIn: 'root' })
export class CharacterControlService {
  private readonly cameraControl = inject(CameraControlService);
  private readonly move = inject(FloorMoveRuntime);
  private readonly collect = inject(FloorCollectRuntime);

  readonly climbPrompt$ = this.move.climbPrompt$;

  onMovementJoystickUpdate(vector: { x: number; y: number }): void {
    this.move.onMovementJoystickUpdate(vector);
  }

  onCameraJoystickUpdate(vector: { x: number; y: number }): void {
    this.cameraControl.updateFromJoystick({
      x: THREE.MathUtils.clamp(vector.x, -1, 1),
      y: THREE.MathUtils.clamp(vector.y, -1, 1),
    });
  }

  getProgress(): number {
    return this.move.getProgress();
  }

  getLane(): number {
    return this.move.getLane();
  }

  isClimbing(): boolean {
    return this.move.isClimbing();
  }

  resetRunner(): void {
    this.collect.reset();
    this.move.reset();
  }

  update(deltaSeconds: number): void {
    const collectFrame = this.move.update(deltaSeconds);
    if (collectFrame) {
      this.collect.updateGround(
        collectFrame.mesh,
        collectFrame.playerId,
        deltaSeconds,
        collectFrame.velocity
      );
    }
  }

  unbindKeys(): void {
    this.move.unbindKeys();
  }
}
