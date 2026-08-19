import { Injectable, inject } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CharacterNftService } from './character-nft.service';
import { ThreeSceneService } from './three-scene.service';
import { RUNNER_CONFIG } from './runner/runner.config';
import {
  ORBIT_CONFIG,
  THIRD_PERSON_CAMERA_CONFIG,
  VIEUX_PORT_METRO_MIRROR_VIEW,
} from '../map/map-configuration';

/**
 * Caméra 3ᵉ personne : orbite sphérique autour du personnage.
 * Joystick View (bas-droite) → yaw / pitch continus.
 * Framing rapproché Marseille uniquement (le runner conserve camDistance 10).
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

  private readonly runnerMinPitch = -Math.PI / 3;
  private readonly runnerMaxPitch = Math.PI / 2 - 0.12;
  private closeFraming = false;
  private orbitDistance: number = RUNNER_CONFIG.camDistance;
  private lookAhead = 0;
  private validationViewActive = false;
  private wheelBound = false;

  private pinchStart = 0;
  private orbitControls: OrbitControls | null = null;
  private readonly spherical = new THREE.Spherical();
  private readonly offset = new THREE.Vector3();
  private readonly lookTarget = new THREE.Vector3();
  private readonly desiredPos = new THREE.Vector3();
  private readonly raycaster = new THREE.Raycaster();
  private readonly camDir = new THREE.Vector3();
  private readonly onWheel = (event: Event): void => {
    if (event instanceof WheelEvent) {
      this.handleWheel(event);
    }
  };

  private pitchMin(): number {
    return this.closeFraming ? THIRD_PERSON_CAMERA_CONFIG.minPitch : this.runnerMinPitch;
  }

  private pitchMax(): number {
    return this.closeFraming ? THIRD_PERSON_CAMERA_CONFIG.maxPitch : this.runnerMaxPitch;
  }

  /** Yaw caméra (pour déplacement relatif). */
  getYaw(): number {
    return this.cameraAngleX;
  }

  getPitch(): number {
    return this.cameraAngleY;
  }

  getOrbitDistance(): number {
    return this.orbitDistance;
  }

  isCloseFraming(): boolean {
    return this.closeFraming;
  }

  setYaw(angle: number): void {
    this.cameraAngleX = angle;
  }

  setPitch(angle: number): void {
    this.cameraAngleY = THREE.MathUtils.clamp(angle, this.pitchMin(), this.pitchMax());
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
      this.pitchMin(),
      this.pitchMax()
    );
  }

  attachOrbit(camera: THREE.PerspectiveCamera, domElement: HTMLElement): void {
    this.detachOrbit();
    const controls = new OrbitControls(camera, domElement);
    controls.enableDamping = ORBIT_CONFIG.enableDamping;
    controls.dampingFactor = ORBIT_CONFIG.dampingFactor;
    controls.enablePan = ORBIT_CONFIG.enablePan;
    controls.enableZoom = ORBIT_CONFIG.enableZoom;
    controls.enableRotate = ORBIT_CONFIG.enableRotate;
    controls.minDistance = ORBIT_CONFIG.minDistance;
    controls.maxDistance = ORBIT_CONFIG.maxDistance;
    controls.minPolarAngle = ORBIT_CONFIG.minPolarAngle;
    controls.maxPolarAngle = ORBIT_CONFIG.maxPolarAngle;
    controls.zoomSpeed = ORBIT_CONFIG.zoomSpeed;
    controls.rotateSpeed = ORBIT_CONFIG.rotateSpeed;
    controls.screenSpacePanning = false;
    this.orbitControls = controls;
  }

  detachOrbit(): void {
    this.orbitControls?.dispose();
    this.orbitControls = null;
  }

  update(deltaSeconds: number): void {
    this.bindWheel();
    if (this.validationViewActive) {
      this.applyValidationView();
      return;
    }
    const camera = this.threeScene.getCamera();
    const state = this.character.getState();
    if (!camera || !state.mesh || !state.isLoaded) return;

    if (this.closeFraming && this.orbitControls) {
      this.updateOrbitControls(camera, state.mesh.position, deltaSeconds);
      this.applyPeekFraming(camera);
      return;
    }

    this.cameraAngleX -= this.stickX * this.yawSpeed * deltaSeconds;
    this.cameraAngleY = THREE.MathUtils.clamp(
      this.cameraAngleY + this.stickY * this.pitchSpeed * deltaSeconds,
      this.pitchMin(),
      this.pitchMax()
    );

    this.computeDesired(state.mesh.position);
    if (this.closeFraming && !this.orbitControls) {
      this.applyCollision(state.mesh);
    }

    const follow = 1 - Math.exp(-10 * deltaSeconds);
    camera.position.lerp(this.desiredPos, follow);
    camera.position.y = Math.max(0.35, camera.position.y);
    this.applyFov(camera);
    camera.lookAt(this.lookTarget);
    this.applyPeekFraming(camera);
  }

  resetOrbit(
    yaw = 0,
    pitch = Math.PI / 6,
    distance: number = RUNNER_CONFIG.camDistance,
    lookAhead = 0
  ): void {
    this.closeFraming = distance <= THIRD_PERSON_CAMERA_CONFIG.maxDistance + 0.05;
    this.cameraAngleX = yaw;
    this.cameraAngleY = THREE.MathUtils.clamp(pitch, this.pitchMin(), this.pitchMax());
    this.orbitDistance = this.closeFraming
      ? THREE.MathUtils.clamp(
          distance,
          THIRD_PERSON_CAMERA_CONFIG.minDistance,
          THIRD_PERSON_CAMERA_CONFIG.maxDistance
        )
      : Math.max(4, distance);
    this.lookAhead = Math.max(0, lookAhead);
    this.stickX = 0;
    this.stickY = 0;
    this.validationViewActive = false;
    this.snapToOrbit();
    if (this.orbitControls) {
      this.orbitControls.minDistance = this.closeFraming
        ? ORBIT_CONFIG.minDistance
        : 4;
      this.orbitControls.maxDistance = this.closeFraming
        ? ORBIT_CONFIG.maxDistance
        : 24;
      this.orbitControls.minPolarAngle = this.closeFraming
        ? ORBIT_CONFIG.minPolarAngle
        : 0.12;
      this.orbitControls.maxPolarAngle = this.closeFraming
        ? ORBIT_CONFIG.maxPolarAngle
        : Math.PI / 2 - 0.08;
      this.orbitControls.target.copy(this.lookTarget);
      this.orbitControls.update();
    }
  }

  toggleValidationView(): boolean {
    this.validationViewActive = !this.validationViewActive;
    if (this.validationViewActive) {
      this.applyValidationView();
    } else {
      this.snapToOrbit();
    }
    return this.validationViewActive;
  }

  isValidationViewActive(): boolean {
    return this.validationViewActive;
  }

  private updateOrbitControls(
    camera: THREE.PerspectiveCamera,
    charPos: THREE.Vector3,
    deltaSeconds: number
  ): void {
    const controls = this.orbitControls;
    if (!controls) return;
    this.lookTarget.set(charPos.x, ORBIT_CONFIG.targetHeight, charPos.z);
    controls.target.copy(this.lookTarget);
    if (Math.abs(this.stickX) > 0.02 || Math.abs(this.stickY) > 0.02) {
      this.offset.copy(camera.position).sub(controls.target);
      this.spherical.setFromVector3(this.offset);
      this.spherical.theta -= this.stickX * this.yawSpeed * deltaSeconds;
      this.spherical.phi = THREE.MathUtils.clamp(
        this.spherical.phi + this.stickY * this.pitchSpeed * deltaSeconds,
        ORBIT_CONFIG.minPolarAngle,
        ORBIT_CONFIG.maxPolarAngle
      );
      this.offset.setFromSpherical(this.spherical);
      camera.position.copy(controls.target).add(this.offset);
    }
    controls.update();
    camera.position.y = Math.max(0.45, camera.position.y);
    this.cameraAngleX = controls.getAzimuthalAngle();
    this.cameraAngleY = THREE.MathUtils.clamp(
      Math.PI / 2 - controls.getPolarAngle(),
      this.pitchMin(),
      this.pitchMax()
    );
    this.orbitDistance = camera.position.distanceTo(controls.target);
    this.applyFov(camera);
  }

  private applyValidationView(): void {
    const camera = this.threeScene.getCamera();
    if (!camera) return;
    const view = VIEUX_PORT_METRO_MIRROR_VIEW;
    camera.position.set(view.position.x, view.position.y, view.position.z);
    camera.lookAt(view.lookAt.x, view.lookAt.y, view.lookAt.z);
  }

  private snapToOrbit(): void {
    const camera = this.threeScene.getCamera();
    const state = this.character.getState();
    if (!camera) return;
    const charPos = state.mesh?.position ?? new THREE.Vector3(0, 0, 0);
    this.computeDesired(charPos);
    camera.position.copy(this.desiredPos);
    camera.position.y = Math.max(0.35, camera.position.y);
    this.applyFov(camera);
    camera.lookAt(this.lookTarget);
    this.applyPeekFraming(camera);
  }

  private computeDesired(charPos: THREE.Vector3): void {
    const dist = this.closeFraming
      ? THREE.MathUtils.clamp(
          this.orbitDistance,
          THIRD_PERSON_CAMERA_CONFIG.minDistance,
          THIRD_PERSON_CAMERA_CONFIG.maxDistance
        )
      : this.orbitDistance;
    const cosY = Math.cos(this.cameraAngleY);
    const sinY = Math.sin(this.cameraAngleY);
    const sinX = Math.sin(this.cameraAngleX);
    const cosX = Math.cos(this.cameraAngleX);
    const shoulder = this.closeFraming ? THIRD_PERSON_CAMERA_CONFIG.shoulderOffset : 0;
    const lookY = this.closeFraming ? THIRD_PERSON_CAMERA_CONFIG.lookAtHeight : 1.8;
    const camY = this.closeFraming
      ? charPos.y + THIRD_PERSON_CAMERA_CONFIG.height + sinY * dist * 0.28
      : charPos.y + sinY * dist + 1.2;

    this.desiredPos.set(
      charPos.x + sinX * cosY * dist + cosX * shoulder,
      Math.max(0.35, camY),
      charPos.z + cosX * cosY * dist - sinX * shoulder
    );
    this.lookTarget.set(
      charPos.x - sinX * this.lookAhead,
      charPos.y + lookY,
      charPos.z - cosX * this.lookAhead
    );
  }

  /**
   * Décale le frustum pour que le perso tienne dans la bande visible sous l’UI,
   * pieds vers le bas de l’écran.
   */
  private applyPeekFraming(camera: THREE.PerspectiveCamera): void {
    const renderer = this.threeScene.getRenderer();
    if (!renderer) return;
    const width = renderer.domElement.clientWidth;
    const height = renderer.domElement.clientHeight;
    if (width < 8 || height < 8) {
      return;
    }
    if (!this.closeFraming) {
      camera.clearViewOffset();
      camera.updateProjectionMatrix();
      return;
    }
    const peek = this.readVisiblePeekHeight(height);
    const hidden = Math.max(0, height - peek);
    camera.setViewOffset(width, height, 0, -hidden * 0.5, width, height);
    camera.updateProjectionMatrix();
  }

  private readVisiblePeekHeight(canvasHeight: number): number {
    if (typeof document === 'undefined') return canvasHeight;
    const graph = document.querySelector('app-graph, .app-graph-section');
    if (graph) {
      const peek = window.innerHeight - graph.getBoundingClientRect().bottom;
      if (peek > 48) return Math.min(canvasHeight, peek);
    }
    const host = document.querySelector('app-root');
    const raw = host
      ? getComputedStyle(host).getPropertyValue('--floor-peek-height')
      : '';
    const fromCss = Number.parseFloat(raw);
    if (Number.isFinite(fromCss) && fromCss > 48) {
      return Math.min(canvasHeight, fromCss);
    }
    return Math.round(canvasHeight * 0.42);
  }

  private readonly colliderScratch: THREE.Object3D[] = [];

  private applyFov(camera: THREE.PerspectiveCamera): void {
    const target = this.closeFraming ? THIRD_PERSON_CAMERA_CONFIG.fov : 62;
    if (Math.abs(camera.fov - target) < 0.05) return;
    camera.fov = target;
    camera.updateProjectionMatrix();
  }

  private applyCollision(character: THREE.Object3D): void {
    const scene = this.threeScene.getScene();
    const camera = this.threeScene.getCamera();
    if (!scene || !camera) return;
    this.camDir.subVectors(this.desiredPos, this.lookTarget);
    const maxDist = this.camDir.length();
    if (maxDist < 0.05) return;
    this.camDir.multiplyScalar(1 / maxDist);
    this.raycaster.near = 0.08;
    this.raycaster.far = maxDist;
    this.raycaster.camera = camera;
    this.raycaster.set(this.lookTarget, this.camDir);
    this.colliderScratch.length = 0;
    this.collectCameraColliders(scene, character, this.colliderScratch);
    if (this.colliderScratch.length === 0) return;
    let hits: THREE.Intersection[] = [];
    try {
      hits = this.raycaster.intersectObjects(this.colliderScratch, false);
    } catch {
      return;
    }
    for (const hit of hits) {
      if (!hit.object.visible) continue;
      const padded = Math.max(
        THIRD_PERSON_CAMERA_CONFIG.minDistance,
        hit.distance - THIRD_PERSON_CAMERA_CONFIG.collisionPadding
      );
      this.desiredPos.copy(this.lookTarget).addScaledVector(this.camDir, padded);
      this.desiredPos.y = Math.max(0.35, this.desiredPos.y);
      break;
    }
  }

  private collectCameraColliders(
    node: THREE.Object3D,
    character: THREE.Object3D,
    out: THREE.Object3D[]
  ): void {
    if (this.shouldIgnoreCollision(node, character)) {
      return;
    }
    if (
      node instanceof THREE.Mesh &&
      !(node instanceof THREE.InstancedMesh) &&
      !(node instanceof THREE.SkinnedMesh) &&
      !(node instanceof THREE.Sprite) &&
      node.visible &&
      node.geometry &&
      node.matrixWorld
    ) {
      out.push(node);
    }
    const children = node.children;
    for (let i = 0; i < children.length; i++) {
      this.collectCameraColliders(children[i], character, out);
    }
  }

  private shouldIgnoreCollision(object: THREE.Object3D, character: THREE.Object3D): boolean {
    if (object === character) return true;
    if (object instanceof THREE.Sprite || object instanceof THREE.SkinnedMesh) return true;
    if (object instanceof THREE.Points || object instanceof THREE.Line) return true;
    const name = object.name || '';
    return (
      name.startsWith('m4t3r-') ||
      name.startsWith('r4v3-') ||
      name.includes('water') ||
      name.includes('pickup') ||
      name.startsWith('character-nft')
    );
  }

  private bindWheel(): void {
    if (this.wheelBound || typeof window === 'undefined') return;
    const renderer = this.threeScene.getRenderer();
    const target = renderer?.domElement ?? window;
    target.addEventListener('wheel', this.onWheel, { passive: false });
    target.addEventListener('touchstart', this.onTouchStart, { passive: true });
    target.addEventListener('touchmove', this.onTouchMove, { passive: true });
    this.wheelBound = true;
  }

  private readonly onTouchStart = (event: Event): void => {
    if (!(event instanceof TouchEvent) || event.touches.length !== 2) return;
    this.pinchStart = this.pinchDistance(event);
  };

  private readonly onTouchMove = (event: Event): void => {
    if (!this.closeFraming || this.validationViewActive) return;
    if (!(event instanceof TouchEvent) || event.touches.length !== 2) return;
    const dist = this.pinchDistance(event);
    const delta = (this.pinchStart - dist) * 0.02;
    this.pinchStart = dist;
    this.orbitDistance = THREE.MathUtils.clamp(
      this.orbitDistance + delta,
      THIRD_PERSON_CAMERA_CONFIG.minDistance,
      THIRD_PERSON_CAMERA_CONFIG.maxDistance
    );
  };

  private pinchDistance(event: TouchEvent): number {
    const a = event.touches[0];
    const b = event.touches[1];
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  }

  private handleWheel(event: WheelEvent): void {
    if (this.orbitControls) return;
    if (!this.closeFraming || this.validationViewActive) return;
    event.preventDefault();
    this.orbitDistance = THREE.MathUtils.clamp(
      this.orbitDistance + event.deltaY * THIRD_PERSON_CAMERA_CONFIG.wheelZoomSpeed,
      THIRD_PERSON_CAMERA_CONFIG.minDistance,
      THIRD_PERSON_CAMERA_CONFIG.maxDistance
    );
  }
}
