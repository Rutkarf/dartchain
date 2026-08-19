import { Injectable, NgZone, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import * as THREE from 'three';
import { GeoCoordinateService } from '../map/geo-coordinate.service';
import { MapConfigService } from '../map/map-config.service';
import { MapLoadingService } from '../map/map-loading.service';
import { METRO_SPAWN_ANCHOR, MOVE_JOYSTICK_CONFIG } from '../map/map-configuration';
import { TokenCellService } from '../map/token-cell.service';
import { M4t3rPickupFxService } from '../map/m4t3r-pickup-fx.service';
import { M4t3rTrailApiService } from '../map/m4t3r-trail-api.service';
import { CharacterNftService } from './character-nft.service';
import { CameraControlService } from './camera-control.service';
import { RunnerWorldService } from './runner/runner-world.service';
import { RunnerStateService } from './runner/runner-state.service';
import { RUNNER_CONFIG } from './runner/runner.config';

/**
 * Contrôle personnage — zéro allocation hot-path, collisions proches.
 */
@Injectable({ providedIn: 'root' })
export class CharacterControlService {
  private readonly character = inject(CharacterNftService);
  private readonly cameraControl = inject(CameraControlService);
  private readonly world = inject(RunnerWorldService);
  private readonly runnerState = inject(RunnerStateService);
  private readonly mapLoading = inject(MapLoadingService);
  private readonly tokenCells = inject(TokenCellService);
  private readonly pickupFx = inject(M4t3rPickupFxService);
  private readonly trailApi = inject(M4t3rTrailApiService);
  private readonly mapConfig = inject(MapConfigService);
  private readonly geo = inject(GeoCoordinateService);
  private readonly zone = inject(NgZone);

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
  private readonly trailPrev = new THREE.Vector3();
  private trailPrevReady = false;
  private trailSyncAge = 0;
  private readonly onKeyDown = (e: KeyboardEvent): void => this.setKey(e, true);
  private readonly onKeyUp = (e: KeyboardEvent): void => this.setKey(e, false);
  private keysBound = false;

  private readonly moveSpeed = 9;

  onMovementJoystickUpdate(vector: { x: number; y: number }): void {
    this.moveX = THREE.MathUtils.clamp(vector.x, -1, 1);
    this.moveY = THREE.MathUtils.clamp(vector.y, -1, 1);
  }

  onCameraJoystickUpdate(vector: { x: number; y: number }): void {
    this.cameraControl.updateFromJoystick({
      x: THREE.MathUtils.clamp(vector.x, -1, 1),
      y: THREE.MathUtils.clamp(vector.y, -1, 1),
    });
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

  resetRunner(): void {
    this.runnerState.reset();
    this.isClimbingMode = false;
    this.climbHeight = 0;
    this.trailPrevReady = false;
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
        state.mesh.position.y = spawn.y;
      } else {
        this.character.setWorldXZ(0, 5);
        state.mesh.position.y = 0;
      }
      this.character.setRotationY(this.getStartCharacterRotationY());
    }
  }

  private getMarseilleSpawnPosition(): THREE.Vector3 {
    const start = this.mapConfig.configuration.startPosition;
    // Prototype terrain plat à y=0 — pieds au sol local (altitude terrain, pas ASL).
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

  update(deltaSeconds: number): void {
    this.bindKeys();
    const state = this.character.getState();
    if (!state.mesh || !state.isLoaded) {
      this.cameraControl.update(deltaSeconds);
      return;
    }

    if (this.isClimbingMode) {
      this.updateClimb(deltaSeconds, state.mesh);
      this.character.updateAnimation(deltaSeconds, 0, this.moveSpeed, true);
      this.cameraControl.update(deltaSeconds);
      return;
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

    if (!marseille) {
      const r = RUNNER_CONFIG.characterRadius;
      nextZ = this.applyStopZone(nextZ);

      if (!this.world.isWalkable(nextX, prevZ, r)) {
        nextX = prevX;
      }
      if (!this.world.isWalkable(nextX, nextZ, r)) {
        nextZ = prevZ;
      }
      if (!this.world.isWalkable(nextX, nextZ, r)) {
        nextX = prevX;
        nextZ = prevZ;
      }

      if (nextZ < RUNNER_CONFIG.ladderStopZ) {
        nextZ = RUNNER_CONFIG.ladderStopZ;
      }
    }

    this.character.setWorldXZ(nextX, nextZ);
    state.mesh.position.y = 0;
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
      this.updateMarseilleTrail(state.mesh, state.userId || 'local', deltaSeconds);
      this.pickupFx.update(deltaSeconds);
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
  }

  private updateMarseilleTrail(mesh: THREE.Object3D, playerId: string, deltaSeconds: number): void {
    if (!this.trailPrevReady) {
      this.trailPrev.copy(mesh.position);
      this.trailPrevReady = true;
      return;
    }
    const trail = this.tokenCells.collectTrail(playerId, this.trailPrev, mesh.position, deltaSeconds);
    this.trailPrev.copy(mesh.position);
    if (trail) {
      this.pickupFx.spawn(mesh, trail.clusterIds.length);
      const submitted = trail;
      this.trailApi.submitTrail(playerId, submitted).subscribe((accepted) => {
        if (!accepted) return;
        if (accepted.collectedCells.length === 0) {
          this.tokenCells.restoreClusters(submitted.clusterIds);
          return;
        }
        this.tokenCells.applyServerHide(accepted.collectedCells, accepted.respawnAt);
      });
    }
    this.trailSyncAge += deltaSeconds;
    if (this.trailSyncAge >= 2) {
      this.trailSyncAge = 0;
      this.trailApi.listHidden().subscribe((payload) => {
        if (payload.cells.length > 0) {
          this.tokenCells.syncHiddenFromServer(payload.cells);
        }
      });
    }
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
    // Ré-entre Angular uniquement pour l’UI prompt (hors boucle frame)
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

  /** Libère les listeners clavier (sortie de scène jeu). */
  unbindKeys(): void {
    if (!this.keysBound || typeof window === 'undefined') return;
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.keysBound = false;
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
