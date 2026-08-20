import { Injectable, NgZone, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import * as THREE from 'three';

import { GeoCoordinateService } from '../../core/map/geo-coordinate.service';
import { MapConfigService } from '../../core/map/map-config.service';
import { MapLoadingService } from '../../core/map/map-loading.service';
import { METRO_SPAWN_ANCHOR, MOVE_JOYSTICK_CONFIG } from '../../core/map/map-configuration';
import { CHARACTER_ASSETS } from '../../core/services/character-assets.config';
import { CameraControlService } from '../../core/services/camera-control.service';
import { CharacterNftService } from '../../core/services/character-nft.service';
import { RUNNER_CONFIG } from '../../core/services/runner/runner.config';
import { RunnerStateService } from '../../core/services/runner/runner-state.service';
import { RunnerWorldService } from '../../core/services/runner/runner-world.service';

export interface FloorMoveCollectFrame {
  mesh: THREE.Object3D;
  playerId: string;
  velocity: THREE.Vector3;
}

/**
 * Intention MOVE, clavier, collisions, climb, spawn.
 * Joysticks et CharacterControl délèguent ici ; collect tokens est hors de ce runtime.
 */
@Injectable({ providedIn: 'root' })
export class FloorMoveRuntime {
  private readonly character = inject(CharacterNftService);
  private readonly cameraControl = inject(CameraControlService);
  private readonly world = inject(RunnerWorldService);
  private readonly runnerState = inject(RunnerStateService);
  private readonly mapLoading = inject(MapLoadingService);
  private readonly mapConfig = inject(MapConfigService);
  private readonly geo = inject(GeoCoordinateService);
  private readonly zone = inject(NgZone);

  private readonly footClearanceMeters = CHARACTER_ASSETS.footClearanceMeters;

  private moveX = 0;
  private moveY = 0;
  private lastSpeed = 0;
  private isClimbingMode = false;
  private climbHeight = 0;
  private lastClimbPrompt = false;

  private readonly climbPromptSubject = new BehaviorSubject(false);
  readonly climbPrompt$ = this.climbPromptSubject.asObservable();

  private readonly keys = {
    w: false,
    a: false,
    s: false,
    d: false,
    e: false,
    camL: false,
    camR: false,
    camU: false,
    camD: false,
  };

  private readonly velocity = new THREE.Vector3();
  private readonly onKeyDown = (e: KeyboardEvent): void => this.setKey(e, true);
  private readonly onKeyUp = (e: KeyboardEvent): void => this.setKey(e, false);
  private keysBound = false;

  private readonly moveSpeed = 9;

  onMovementJoystickUpdate(vector: { x: number; y: number }): void {
    this.moveX = THREE.MathUtils.clamp(vector.x, -1, 1);
    this.moveY = THREE.MathUtils.clamp(vector.y, -1, 1);
  }

  getProgress(): number {
    return this.runnerState.progress;
  }

  getLane(): number {
    return this.runnerState.lane;
  }

  isClimbing(): boolean {
    return this.isClimbingMode;
  }

  reset(): void {
    this.runnerState.reset();
    this.isClimbingMode = false;
    this.climbHeight = 0;
    this.setClimbPrompt(false);
    this.bindKeys();
    this.cameraControl.resetOrbit(
      this.getStartCameraYaw(),
      this.getStartCameraPitch(),
      this.getStartCameraDistance(),
      this.getStartCameraLookAhead()
    );
    const state = this.character.getState();
    if (state.mesh && state.isLoaded) {
      if (this.isMarseilleMode()) {
        const spawn = this.getMarseilleSpawnPosition();
        this.character.setWorldXZ(spawn.x, spawn.z);
        const groundY = this.getGroundYAt(spawn.x, spawn.z);
        state.mesh.position.y = groundY + this.footClearanceMeters;
      } else {
        this.character.setWorldXZ(0, 5);
        state.mesh.position.y = 0;
      }
      this.character.setRotationY(this.getStartCharacterRotationY());
    }
  }

  /**
   * Avance le perso. Si Marseille + mesh au sol, retourne le frame collect.
   */
  update(deltaSeconds: number): FloorMoveCollectFrame | null {
    this.bindKeys();
    const state = this.character.getState();
    if (!state.mesh || !state.isLoaded) {
      this.cameraControl.update(deltaSeconds);
      return null;
    }

    if (this.isClimbingMode) {
      this.updateClimb(deltaSeconds, state.mesh);
      this.character.updateAnimation(deltaSeconds, 0, this.moveSpeed, true);
      this.cameraControl.update(deltaSeconds);
      return null;
    }

    const camStep = 2.2 * deltaSeconds;
    if (this.keys.camL) this.cameraControl.nudge(camStep, 0);
    if (this.keys.camR) this.cameraControl.nudge(-camStep, 0);
    if (this.keys.camU) this.cameraControl.nudge(0, camStep);
    if (this.keys.camD) this.cameraControl.nudge(0, -camStep);

    const dead = MOVE_JOYSTICK_CONFIG.deadZone;
    const jx = Math.abs(this.moveX) < dead ? 0 : this.moveX;
    const jy = Math.abs(this.moveY) < dead ? 0 : this.moveY;

    let localX = jx;
    let localZ = jy;
    if (this.keys.w) localZ += 1;
    if (this.keys.s) localZ -= 1;
    if (this.keys.a) localX -= 1;
    if (this.keys.d) localX += 1;

    this.velocity.set(0, 0, 0);
    let gaitSpeed = this.moveSpeed;
    const joyMag = Math.hypot(jx, jy);
    if (joyMag >= MOVE_JOYSTICK_CONFIG.walkRing) {
      gaitSpeed = this.moveSpeed * MOVE_JOYSTICK_CONFIG.runMultiplier;
    }
    if (Math.abs(localX) > 1e-4 || Math.abs(localZ) > 1e-4) {
      const yaw = this.cameraControl.getYaw();
      const sinY = Math.sin(yaw);
      const cosY = Math.cos(yaw);
      const forwardX = -sinY;
      const forwardZ = -cosY;
      const rightX = cosY;
      const rightZ = -sinY;

      this.velocity.x = rightX * localX + forwardX * localZ;
      this.velocity.z = rightZ * localX + forwardZ * localZ;
      this.velocity.normalize().multiplyScalar(gaitSpeed * deltaSeconds);
    }

    this.lastSpeed = this.velocity.length() > 1e-8 ? gaitSpeed : 0;

    const prevX = state.mesh.position.x;
    const prevZ = state.mesh.position.z;
    let nextX = prevX + this.velocity.x;
    let nextZ = prevZ + this.velocity.z;
    const marseille = this.isMarseilleMode();
    const walkRadius = RUNNER_CONFIG.characterRadius;

    if (marseille) {
      const clamped = this.clampWalkableMarseille(prevX, prevZ, nextX, nextZ, walkRadius);
      nextX = clamped.x;
      nextZ = clamped.z;
    } else {
      nextZ = this.applyStopZone(nextZ);

      if (!this.world.isWalkable(nextX, prevZ, walkRadius)) {
        nextX = prevX;
      }
      if (!this.world.isWalkable(nextX, nextZ, walkRadius)) {
        nextZ = prevZ;
      }
      if (!this.world.isWalkable(nextX, nextZ, walkRadius)) {
        nextX = prevX;
        nextZ = prevZ;
      }

      if (nextZ < RUNNER_CONFIG.ladderStopZ) {
        nextZ = RUNNER_CONFIG.ladderStopZ;
      }
    }

    this.character.setWorldXZ(nextX, nextZ);
    if (this.isMarseilleMode()) {
      const groundY = this.getGroundYAt(nextX, nextZ);
      state.mesh.position.y = groundY + this.footClearanceMeters;
    } else {
      state.mesh.position.y = 0;
    }
    state.mesh.visible = true;

    if (this.velocity.lengthSq() > 1e-8) {
      this.character.setRotationY(Math.atan2(this.velocity.x, this.velocity.z));
    }

    if (!marseille) {
      this.checkLadderInteraction(nextX, nextZ);
      this.runnerState.progress = Math.max(0, -nextZ);
      this.world.update(this.runnerState.progress);
    } else {
      this.mapLoading.update(state.mesh.position);
    }

    this.character.updateAnimation(
      deltaSeconds,
      this.lastSpeed,
      this.lastSpeed > this.moveSpeed * 1.5
        ? this.moveSpeed * MOVE_JOYSTICK_CONFIG.runMultiplier
        : this.moveSpeed,
      this.isClimbingMode
    );
    this.cameraControl.update(deltaSeconds);

    if (!marseille) return null;
    return {
      mesh: state.mesh,
      playerId: state.userId || 'local',
      velocity: this.velocity,
    };
  }

  unbindKeys(): void {
    if (!this.keysBound || typeof window === 'undefined') return;
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.keysBound = false;
  }

  getGroundYAt(x: number, z: number): number {
    const provider = this.mapLoading.getActiveProvider();
    const surface = provider?.getSurfaceProvider();
    const sync = surface?.getSurfaceHeightSync;
    if (sync) {
      const y = sync(x, z);
      if (typeof y === 'number') return y;
    }
    return 0;
  }

  private getMarseilleSpawnPosition(): THREE.Vector3 {
    const start = this.mapConfig.configuration.startPosition;
    const world = this.geo.geoToWorld(
      start.latitude,
      start.longitude,
      this.mapConfig.configuration.altitudeOrigin
    );
    world.x += METRO_SPAWN_ANCHOR.spawnOffsetFromMirror.x;
    world.z += METRO_SPAWN_ANCHOR.spawnOffsetFromMirror.z;
    return world;
  }

  private isMarseilleMode(): boolean {
    const state = this.mapLoading.getState();
    return state.activeProviderId === 'marseille-osm-three' && !state.fallbackActive;
  }

  private getStartCharacterRotationY(): number {
    if (this.isMarseilleMode()) {
      return this.mapConfig.configuration.startOrientation.characterRotationY;
    }
    return Math.PI;
  }

  private getStartCameraYaw(): number {
    if (this.isMarseilleMode()) {
      return this.mapConfig.configuration.startOrientation.cameraYaw;
    }
    return 0;
  }

  private getStartCameraPitch(): number {
    if (this.isMarseilleMode()) {
      return this.mapConfig.configuration.startOrientation.cameraPitch;
    }
    return Math.PI / 6;
  }

  private getStartCameraDistance(): number {
    if (this.isMarseilleMode()) {
      return this.mapConfig.configuration.startOrientation.cameraDistance;
    }
    return RUNNER_CONFIG.camDistance;
  }

  private getStartCameraLookAhead(): number {
    if (this.isMarseilleMode()) {
      return this.mapConfig.configuration.startOrientation.cameraLookAhead;
    }
    return 0;
  }

  private clampWalkableMarseille(
    prevX: number,
    prevZ: number,
    nextX: number,
    nextZ: number,
    radius: number
  ): { x: number; z: number } {
    const surface = this.mapLoading.getActiveProvider()?.getSurfaceProvider();
    if (!surface) return { x: nextX, z: nextZ };

    let x = nextX;
    let z = nextZ;
    if (!surface.isWalkable(x, prevZ, radius)) x = prevX;
    if (!surface.isWalkable(x, z, radius)) z = prevZ;
    if (!surface.isWalkable(x, z, radius)) {
      x = prevX;
      z = prevZ;
    }
    return { x, z };
  }

  private applyStopZone(nextZ: number): number {
    const stop = RUNNER_CONFIG.ladderStopZ;
    if (nextZ < stop) return stop;
    return nextZ;
  }

  private checkLadderInteraction(x: number, z: number): void {
    const nearX = Math.abs(x) < RUNNER_CONFIG.ladderInteractionRadiusX;
    const nearZ =
      Math.abs(z - RUNNER_CONFIG.ladderInteractionZ) <
      RUNNER_CONFIG.ladderInteractionRadiusZ;
    const pastStop = z <= RUNNER_CONFIG.ladderStopZ + 0.15;
    const canInteract = nearX && nearZ && pastStop;

    this.setClimbPrompt(canInteract);

    if (canInteract && this.keys.e) {
      this.startClimbing();
    }
  }

  private setClimbPrompt(value: boolean): void {
    if (value === this.lastClimbPrompt) return;
    this.lastClimbPrompt = value;
    this.zone.run(() => this.climbPromptSubject.next(value));
  }

  private startClimbing(): void {
    if (this.isClimbingMode) return;
    this.isClimbingMode = true;
    this.climbHeight = 0;
    this.setClimbPrompt(false);
    const state = this.character.getState();
    if (state.mesh) {
      state.mesh.position.x = 0;
      state.mesh.position.z = RUNNER_CONFIG.ladderZ + 0.35;
      this.character.setRotationY(Math.PI);
    }
  }

  private updateClimb(dt: number, mesh: THREE.Object3D): void {
    this.climbHeight += RUNNER_CONFIG.climbSpeed * dt;
    mesh.position.y = this.climbHeight;
    mesh.position.x = 0;
    mesh.position.z = RUNNER_CONFIG.ladderZ + 0.35;

    if (this.climbHeight >= RUNNER_CONFIG.climbMaxHeight) {
      this.isClimbingMode = false;
      mesh.position.set(0, 0, RUNNER_CONFIG.ladderStopZ);
      this.climbHeight = 0;
    }
  }

  private bindKeys(): void {
    if (this.keysBound || typeof window === 'undefined') return;
    window.addEventListener('keydown', this.onKeyDown, { passive: true });
    window.addEventListener('keyup', this.onKeyUp, { passive: true });
    this.keysBound = true;
  }

  private setKey(e: KeyboardEvent, down: boolean): void {
    const key = e.key.toLowerCase();
    if (key === 'w') this.keys.w = down;
    if (key === 's') this.keys.s = down;
    if (key === 'a') this.keys.a = down;
    if (key === 'd') this.keys.d = down;
    if (key === 'e') this.keys.e = down;
    if (key === 'v' && down && !e.repeat && this.isMarseilleMode()) {
      this.cameraControl.toggleValidationView();
    }
    if (key === 'arrowleft') this.keys.camL = down;
    if (key === 'arrowright') this.keys.camR = down;
    if (key === 'arrowup') this.keys.camU = down;
    if (key === 'arrowdown') this.keys.camD = down;
  }
}
