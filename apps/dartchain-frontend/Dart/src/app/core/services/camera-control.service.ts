import { Injectable, inject } from '@angular/core';
import * as THREE from 'three';
import { CharacterNftService } from './character-nft.service';
import { ThreeSceneService } from './three-scene.service';
import { RUNNER_CONFIG } from './runner/runner.config';

/**
 * Caméra 3ᵉ personne : orbite sphérique autour du personnage.
 * Joystick View (bas-droite) → yaw / pitch continus.
 */
@Injectable({ providedIn: 'root' })
export class CameraControlService {
  private readonly threeScene = inject(ThreeSceneService);
  private readonly character = inject(CharacterNftService);

  /** Angle horizontal (radians), illimité. */
  private cameraAngleX = 0;
  /** Angle vertical (radians), clampé. */
  private cameraAngleY = Math.PI / 6;
  private stickX = 0;
  private stickY = 0;

  /** Sensibilité stick → rad/s (plein stick). */
  private readonly yawSpeed = 2.8;
  private readonly pitchSpeed = 2.2;

  private readonly minPitch = 0.08;
  private readonly maxPitch = Math.PI / 2 - 0.12;

  private readonly lookTarget = new THREE.Vector3();
  private readonly desiredPos = new THREE.Vector3();

  /** Yaw caméra (pour déplacement relatif). */
  getYaw(): number {
    return this.cameraAngleX;
  }

  getPitch(): number {
    return this.cameraAngleY;
  }

  setYaw(angle: number): void {
    this.cameraAngleX = angle;
  }

  setPitch(angle: number): void {
    this.cameraAngleY = THREE.MathUtils.clamp(angle, this.minPitch, this.maxPitch);
  }

  updateFromJoystick(vector: { x: number; y: number }): void {
    this.stickX = THREE.MathUtils.clamp(vector.x, -1, 1);
    this.stickY = THREE.MathUtils.clamp(vector.y, -1, 1);
  }

  /** Incrément clavier / debug (rad). */
  nudge(dx: number, dy: number): void {
    this.cameraAngleX += dx;
    this.cameraAngleY = THREE.MathUtils.clamp(
      this.cameraAngleY + dy,
      this.minPitch,
      this.maxPitch
    );
  }

  update(deltaSeconds: number): void {
    const camera = this.threeScene.getCamera();
    const state = this.character.getState();
    if (!camera || !state.mesh || !state.isLoaded) return;

    // Stick View : X = tourner gauche/droite, Y = regarder haut/bas
    this.cameraAngleX -= this.stickX * this.yawSpeed * deltaSeconds;
    this.cameraAngleY = THREE.MathUtils.clamp(
      this.cameraAngleY + this.stickY * this.pitchSpeed * deltaSeconds,
      this.minPitch,
      this.maxPitch
    );

    const charPos = state.mesh.position;
    const dist = RUNNER_CONFIG.camDistance;
    const cosY = Math.cos(this.cameraAngleY);
    const sinY = Math.sin(this.cameraAngleY);
    const sinX = Math.sin(this.cameraAngleX);
    const cosX = Math.cos(this.cameraAngleX);

    // Orbite sphérique derrière / au-dessus du perso
    this.desiredPos.set(
      charPos.x + sinX * cosY * dist,
      charPos.y + sinY * dist + 1.2,
      charPos.z + cosX * cosY * dist
    );

    const follow = 1 - Math.exp(-10 * deltaSeconds);
    camera.position.lerp(this.desiredPos, follow);

    this.lookTarget.set(charPos.x, charPos.y + 1.5, charPos.z);
    camera.lookAt(this.lookTarget);
  }

  resetOrbit(): void {
    this.cameraAngleX = 0;
    this.cameraAngleY = Math.PI / 6;
    this.stickX = 0;
    this.stickY = 0;
  }
}
