import { Injectable } from '@angular/core';
import { BehaviorSubject, type Observable } from 'rxjs';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import {
  CHARACTER_ASSETS,
  isCharacterFbxPath,
  isCharacterStlPath,
} from './character-assets.config';

/**
 * État runtime du personnage NFT (1 modèle / user).
 */
export interface CharacterState {
  userId: string;
  mesh: THREE.Object3D | null;
  position: THREE.Vector3;
  /** Angle yaw (rotation horizontale autour de Y), radians. */
  rotation: number;
  isLoaded: boolean;
  /** 0 = idle, 1 = walk (blend / poids d’action). */
  walkBlend: number;
}

interface WalkRig {
  root: THREE.Group;
  torso: THREE.Object3D;
  head: THREE.Object3D;
  leftArm: THREE.Object3D;
  rightArm: THREE.Object3D;
  leftLeg: THREE.Object3D;
  rightLeg: THREE.Object3D;
  torsoBaseY: number;
  headBaseY: number;
}

/** Os Mixamo / génériques pour marche procédurale (bras + jambes). */
interface SkeletonWalkBones {
  leftArm: THREE.Object3D;
  rightArm: THREE.Object3D;
  leftLeg: THREE.Object3D;
  rightLeg: THREE.Object3D;
  leftShin: THREE.Object3D | null;
  rightShin: THREE.Object3D | null;
  leftForeArm: THREE.Object3D | null;
  rightForeArm: THREE.Object3D | null;
  hips: THREE.Object3D | null;
  spine: THREE.Object3D | null;
  armSwingAxis: 'x' | 'y' | 'z';
  leftArmSwingSign: number;
  rightArmSwingSign: number;
  leftArmSwingMin: number;
  rightArmSwingMin: number;
  hang: {
    leftArm: THREE.Euler;
    rightArm: THREE.Euler;
    leftLeg: THREE.Euler;
    rightLeg: THREE.Euler;
    leftShin: THREE.Euler | null;
    rightShin: THREE.Euler | null;
    leftForeArm: THREE.Euler | null;
    rightForeArm: THREE.Euler | null;
    hips: THREE.Euler | null;
    spine: THREE.Euler | null;
  };
}

const CHARACTER_FBX_PATHS = CHARACTER_ASSETS.fbx;
const CHARACTER_STL_PATHS = CHARACTER_ASSETS.stl;

const TARGET_HEIGHT = CHARACTER_ASSETS.targetHeight;
export const FLOOR_Y = 0;
export const CHARACTER_MOVE_SPEED = 1.6;
export const CHARACTER_RADIUS = 0.43;

const WALK_SPEED = 6.4;
const STRIDE_METERS = 0.58;
const ARM_SWING = 0.38;
const LEG_SWING = 0.42;
const KNEE_BEND = 0.62;
/** Abaisse les bras depuis la T-pose Mixamo (perpendiculaires → le long du corps). */
const ARM_HANG_Z = Math.PI * 0.5;
/** Légère inclinaison avant max après calibration (axe X Mixamo). */
const ARM_FORWARD_X = 0.28;
const FOREARM_HANG_X = Math.PI * 0.08;
const WADDLE_ROLL = 0.08;
const WADDLE_YAW = 0.06;
const IDLE_LERP = 8;

const WALK_NAME_RE = /walk|run|locomotion|move|marche/i;
const IDLE_NAME_RE = /idle|stand|wait|breath|tpose|a-pose|rest/i;

const LEFT_ARM_RE = /LeftArm|leftarm|upperarm_l|UpperArm\.L|Arm_L/i;
const RIGHT_ARM_RE = /RightArm|rightarm|upperarm_r|UpperArm\.R|Arm_R/i;
const LEFT_FOREARM_RE = /LeftForeArm|leftforearm|lowerarm_l|ForeArm\.L/i;
const RIGHT_FOREARM_RE = /RightForeArm|rightforearm|lowerarm_r|ForeArm\.R/i;
const LEFT_THIGH_RE = /LeftUpLeg|leftupleg|LeftThigh|thigh_l|UpperLeg\.L/i;
const RIGHT_THIGH_RE = /RightUpLeg|rightupleg|RightThigh|thigh_r|UpperLeg\.R/i;
const LEFT_SHIN_RE = /LeftLeg(?!acy)|lowerleg_l|LowerLeg\.L|LeftShin|leftshin/i;
const RIGHT_SHIN_RE = /RightLeg(?!acy)|lowerleg_r|LowerLeg\.R|RightShin|rightshin/i;
const HIPS_RE = /Hips|pelvis|Hip/i;
const SPINE_RE = /Spine(?!1|2|3)|spine(?!1|2|3)/i;

function emptyState(userId = ''): CharacterState {
  return {
    userId,
    mesh: null,
    position: new THREE.Vector3(0, FLOOR_Y, 5),
    rotation: Math.PI,
    isLoaded: false,
    walkBlend: 0,
  };
}

function isShinBone(name: string): boolean {
  if (/UpLeg|Upper|Thigh|Foot|Toe/i.test(name)) return false;
  return LEFT_SHIN_RE.test(name) || RIGHT_SHIN_RE.test(name);
}

function cloneEuler(e: THREE.Euler): THREE.Euler {
  return new THREE.Euler(e.x, e.y, e.z, e.order);
}

function stepCadence(speedMps: number, speedNorm: number): number {
  const base = THREE.MathUtils.clamp(speedMps / STRIDE_METERS, 1.5, 4.4);
  return base * THREE.MathUtils.lerp(0.9, 1.08, speedNorm) * Math.PI * 2;
}

/**
 * CharacterAnon.fbx prioritaire — marche via clips Mixamo OU os procéduraux (bras/jambes).
 */
@Injectable({ providedIn: 'root' })
export class CharacterNftService {
  private readonly stateSubject = new BehaviorSubject<CharacterState>(emptyState());
  readonly state$: Observable<CharacterState> = this.stateSubject.asObservable();

  private scene: THREE.Scene | null = null;
  private loadToken = 0;
  private visual: THREE.Object3D | null = null;
  private plantY = 0;
  private walkTime = 0;
  private walkRig: WalkRig | null = null;
  private skeletonWalk: SkeletonWalkBones | null = null;

  private mixer: THREE.AnimationMixer | null = null;
  private idleAction: THREE.AnimationAction | null = null;
  private walkAction: THREE.AnimationAction | null = null;
  private animMode: 'idle' | 'walk' = 'idle';
  private useClipAnimation = false;

  getState(): CharacterState {
    return this.stateSubject.value;
  }

  getCharacterMesh(): THREE.Object3D | null {
    return this.stateSubject.value.mesh;
  }

  async loadCharacterForUser(
    userId: string,
    scene: THREE.Scene,
    customAssetPath?: string | null
  ): Promise<void> {
    const current = this.stateSubject.value;
    if (current.isLoaded && current.userId === userId && current.mesh) {
      return;
    }

    this.dispose(scene);
    this.scene = scene;
    const token = ++this.loadToken;

    let visual: THREE.Object3D;
    let clips: THREE.AnimationClip[] = [];
    this.walkRig = null;
    this.skeletonWalk = null;

    // CharacterAnon.fbx → CharacterAnon.stl (jamais le walk-rig procédural)
    try {
      const loaded = await this.loadCharacterAnonVisual(customAssetPath);
      if (token !== this.loadToken) {
        this.disposeObject(loaded.root);
        return;
      }
      clips = loaded.clips;
      if (loaded.kind === 'fbx') {
        this.prepareFbxMaterials(loaded.root);
      } else {
        this.prepareStlMaterial(loaded.root);
      }
      visual = loaded.root;
      console.info(
        `[CharacterNftService] CharacterAnon chargé (${loaded.kind}, ${clips.length} clip(s))`,
        loaded.source
      );
    } catch (err) {
      console.error('[CharacterNftService] Échec chargement CharacterAnon — modèle local requis.', err);
      throw err;
    }

    if (token !== this.loadToken) {
      this.disposeObject(visual);
      return;
    }

    const root = this.wrapPlanted(visual);
    root.name = `character-nft:${userId}`;
    root.frustumCulled = false;
    root.visible = true;
    const spawn = emptyState(userId).position.clone();
    root.position.copy(spawn);
    root.rotation.y = emptyState().rotation;
    scene.add(root);

    // Marche procédurale os prioritaire (pas à pas + bras sync) ; clips en secours.
    this.setupMixer(visual, clips);
    this.skeletonWalk = this.bindSkeletonWalk(visual);
    if (this.skeletonWalk) {
      this.stopClipAnimation();
      console.info('[CharacterNftService] Marche procédurale os (pas à pas) active');
    } else if (this.hasUsableWalkClip(clips)) {
      console.info('[CharacterNftService] Marche via AnimationMixer (clips Mixamo)');
    } else {
      this.stopClipAnimation();
    }

    if (typeof localStorage !== 'undefined' && localStorage.getItem('GAME_DEBUG') === '1') {
      const box = new THREE.Box3().setFromObject(root);
      const size = new THREE.Vector3();
      box.getSize(size);
      console.log('[GAME] CharacterAnon initialized', {
        visible: root.visible,
        position: root.position.toArray(),
        size: size.toArray(),
        children: root.children.length,
        clips: clips.map((c) => c.name),
        skeletonWalk: !!this.skeletonWalk,
      });
    }

    this.stateSubject.next({
      userId,
      mesh: root,
      position: spawn.clone(),
      rotation: root.rotation.y,
      isLoaded: true,
      walkBlend: 0,
    });
  }

  setWorldXZ(x: number, z: number): void {
    const state = this.stateSubject.value;
    if (!state.mesh) return;
    state.mesh.position.x = x;
    state.mesh.position.z = z;
    // Pas d’émission RxJS chaque frame (perf) — position lue via mesh
    state.position.set(x, state.mesh.position.y, z);
  }

  setPose(position: THREE.Vector3, quaternion: THREE.Quaternion): void {
    const state = this.stateSubject.value;
    if (!state.mesh) return;
    state.mesh.position.copy(position);
    state.mesh.quaternion.copy(quaternion);
    const euler = new THREE.Euler().setFromQuaternion(quaternion, 'YXZ');
    this.stateSubject.next({
      ...state,
      position: state.mesh.position.clone(),
      rotation: euler.y,
    });
  }

  setRotationY(angle: number): void {
    const state = this.stateSubject.value;
    if (!state.mesh) return;
    state.mesh.rotation.y = angle;
    // Pas d’émission RxJS chaque frame — rotation lue via mesh
    state.rotation = angle;
  }

  /**
   * Animation liée à la vitesse horizontale réelle (u/s).
   * @param speed vitesse courante
   * @param maxSpeed vitesse max référence
   * @param climbing mode échelle
   */
  updateAnimation(
    deltaSeconds: number,
    speed: number,
    maxSpeed = 9,
    climbing = false
  ): void {
    const state = this.stateSubject.value;
    const moving = !climbing && speed > 0.12;
    const target = moving ? 1 : 0;
    const blend = THREE.MathUtils.damp(state.walkBlend, target, 10, deltaSeconds);
    if (Math.abs(blend - state.walkBlend) > 0.001) {
      state.walkBlend = blend;
    }

    const norm = THREE.MathUtils.clamp(speed / Math.max(maxSpeed, 0.01), 0, 1);
    const climbNorm = climbing ? 0.85 : norm;

    // 1) Os Mixamo — pas à pas synchronisé à la vitesse
    if (this.skeletonWalk) {
      this.updateSkeletonWalk(deltaSeconds, moving || climbing, climbNorm, speed);
      return;
    }

    // 2) Clips FBX / Mixamo
    if (this.useClipAnimation && this.mixer) {
      this.syncClipActions(moving);
      if (this.walkAction && moving) {
        this.walkAction.setEffectiveTimeScale(
          THREE.MathUtils.lerp(0.7, 1.35, norm)
        );
      }
      this.mixer.update(deltaSeconds);
      return;
    }

    // 3) Walk-rig procédural (fallback sans FBX)
    if (this.walkRig) {
      this.updateWalkRig(deltaSeconds, moving || climbing, climbNorm);
      return;
    }

    // 4) STL — pieds collés au sol, pas de bob vertical
    if (!this.visual) return;
    this.visual.position.y = this.plantY;
    if (moving) {
      this.walkTime += deltaSeconds * stepCadence(speed, norm);
    }
  }

  dispose(scene?: THREE.Scene): void {
    this.loadToken++;
    const state = this.stateSubject.value;
    const targetScene = scene ?? this.scene;
    if (state.mesh) {
      targetScene?.remove(state.mesh);
      this.disposeObject(state.mesh);
    }
    this.stopClipAnimation();
    this.visual = null;
    this.walkRig = null;
    this.skeletonWalk = null;
    this.scene = null;
    this.walkTime = 0;
    this.stateSubject.next(emptyState());
  }

  private stopClipAnimation(): void {
    this.mixer?.stopAllAction();
    this.mixer = null;
    this.idleAction = null;
    this.walkAction = null;
    this.useClipAnimation = false;
    this.animMode = 'idle';
  }

  /**
   * Relie Left/Right Arm + UpLeg (Mixamo) pour une marche procédurale lisible.
   */
  private bindSkeletonWalk(root: THREE.Object3D): SkeletonWalkBones | null {
    const found = {
      leftArm: null as THREE.Object3D | null,
      rightArm: null as THREE.Object3D | null,
      leftLeg: null as THREE.Object3D | null,
      rightLeg: null as THREE.Object3D | null,
      leftShin: null as THREE.Object3D | null,
      rightShin: null as THREE.Object3D | null,
      leftForeArm: null as THREE.Object3D | null,
      rightForeArm: null as THREE.Object3D | null,
      hips: null as THREE.Object3D | null,
      spine: null as THREE.Object3D | null,
    };

    const boneList: THREE.Object3D[] = [];
    root.traverse((obj) => {
      const isBone = (obj as THREE.Bone).isBone === true;
      if (!isBone && obj.type !== 'Bone') return;
      boneList.push(obj);
      const n = obj.name || '';
      if (!found.leftArm && LEFT_ARM_RE.test(n) && !/Fore|Hand|Roll|Twist/i.test(n)) {
        found.leftArm = obj;
      }
      if (!found.rightArm && RIGHT_ARM_RE.test(n) && !/Fore|Hand|Roll|Twist/i.test(n)) {
        found.rightArm = obj;
      }
      if (!found.leftForeArm && LEFT_FOREARM_RE.test(n) && !/Roll|Twist/i.test(n)) {
        found.leftForeArm = obj;
      }
      if (!found.rightForeArm && RIGHT_FOREARM_RE.test(n) && !/Roll|Twist/i.test(n)) {
        found.rightForeArm = obj;
      }
      if (!found.leftLeg && LEFT_THIGH_RE.test(n)) {
        found.leftLeg = obj;
      }
      if (!found.rightLeg && RIGHT_THIGH_RE.test(n)) {
        found.rightLeg = obj;
      }
      if (!found.leftShin && isShinBone(n) && /left/i.test(n)) {
        found.leftShin = obj;
      }
      if (!found.rightShin && isShinBone(n) && /right/i.test(n)) {
        found.rightShin = obj;
      }
      if (!found.hips && HIPS_RE.test(n) && !/Spine/i.test(n)) {
        found.hips = obj;
      }
      if (!found.spine && SPINE_RE.test(n) && !/Shoulder|Chest|Head/i.test(n)) {
        found.spine = obj;
      }
    });

    if (!found.leftArm || !found.rightArm || !found.leftLeg || !found.rightLeg) {
      for (const obj of boneList) {
        const n = obj.name || '';
        if (!found.leftArm && /left.*arm/i.test(n) && !/fore|hand/i.test(n)) {
          found.leftArm = obj;
        }
        if (!found.rightArm && /right.*arm/i.test(n) && !/fore|hand/i.test(n)) {
          found.rightArm = obj;
        }
        if (!found.leftLeg && /left.*(up.?leg|thigh)/i.test(n)) found.leftLeg = obj;
        if (!found.rightLeg && /right.*(up.?leg|thigh)/i.test(n)) found.rightLeg = obj;
      }
    }

    if (!found.leftArm || !found.rightArm || !found.leftLeg || !found.rightLeg) {
      console.warn(
        '[CharacterNftService] Os marche incomplets — clips/bob fallback.',
        {
          leftArm: found.leftArm?.name ?? null,
          rightArm: found.rightArm?.name ?? null,
          leftLeg: found.leftLeg?.name ?? null,
          rightLeg: found.rightLeg?.name ?? null,
          bones: boneList.map((b) => b.name).slice(0, 50),
        }
      );
      return null;
    }

    const armL = found.leftArm;
    const armR = found.rightArm;
    const legL = found.leftLeg;
    const legR = found.rightLeg;
    const shinL = found.leftShin;
    const shinR = found.rightShin;
    const foreL = found.leftForeArm;
    const foreR = found.rightForeArm;
    const hipsBone = found.hips;
    const spineBone = found.spine;

    // Pose bras : sur les côtés ou devant — jamais derrière le torse.
    const leftPose = this.calibrateArmRestPose(armL, root, hipsBone ?? root, true);
    const rightPose = this.calibrateArmRestPose(armR, root, hipsBone ?? root, false);
    if (foreL) foreL.rotation.x += FOREARM_HANG_X;
    if (foreR) foreR.rotation.x += FOREARM_HANG_X;

    const hangL = leftPose.hang;
    const hangR = rightPose.hang;
    const hangForeL = foreL ? cloneEuler(foreL.rotation) : null;
    const hangForeR = foreR ? cloneEuler(foreR.rotation) : null;

    console.info('[CharacterNftService] Os marche liés (cuisses + genoux + bras)', {
      leftArm: armL.name,
      rightArm: armR.name,
      leftForeArm: foreL?.name ?? null,
      rightForeArm: foreR?.name ?? null,
      leftLeg: legL.name,
      rightLeg: legR.name,
      leftShin: shinL?.name ?? null,
      rightShin: shinR?.name ?? null,
      hips: hipsBone?.name ?? null,
      spine: spineBone?.name ?? null,
      armSwingAxis: 'x',
    });

    return {
      leftArm: armL,
      rightArm: armR,
      leftLeg: legL,
      rightLeg: legR,
      leftShin: shinL,
      rightShin: shinR,
      leftForeArm: foreL,
      rightForeArm: foreR,
      hips: hipsBone,
      spine: spineBone,
      armSwingAxis: 'x',
      leftArmSwingSign: leftPose.swingSign,
      rightArmSwingSign: rightPose.swingSign,
      leftArmSwingMin: leftPose.swingMin,
      rightArmSwingMin: rightPose.swingMin,
      hang: {
        leftArm: hangL,
        rightArm: hangR,
        leftLeg: cloneEuler(legL.rotation),
        rightLeg: cloneEuler(legR.rotation),
        leftShin: shinL ? cloneEuler(shinL.rotation) : null,
        rightShin: shinR ? cloneEuler(shinR.rotation) : null,
        leftForeArm: hangForeL,
        rightForeArm: hangForeR,
        hips: hipsBone ? cloneEuler(hipsBone.rotation) : null,
        spine: spineBone ? cloneEuler(spineBone.rotation) : null,
      },
    };
  }

  private updateSkeletonWalk(
    dt: number,
    isWalking: boolean,
    speedNorm = 1,
    speedMps = 0
  ): void {
    const sk = this.skeletonWalk;
    if (!sk) return;

    const armSwing = ARM_SWING * THREE.MathUtils.lerp(0.7, 1, speedNorm);
    const legSwing = LEG_SWING * THREE.MathUtils.lerp(0.65, 1, speedNorm);
    const knee = KNEE_BEND * THREE.MathUtils.lerp(0.55, 1, speedNorm);
    const elbow = 0.32 * speedNorm;
    const waddle = THREE.MathUtils.lerp(0.45, 1, speedNorm);

    if (this.visual) {
      this.visual.position.y = this.plantY;
    }

    if (isWalking) {
      this.walkTime += dt * stepCadence(Math.max(speedMps, 0.4), speedNorm);
      const phase = Math.sin(this.walkTime);
      const opposite = -phase;
      const leftStrike = Math.pow(Math.max(0, phase), 1.35);
      const rightStrike = Math.pow(Math.max(0, -phase), 1.35);
      const contact = leftStrike + rightStrike;

      this.applyArmSwing(
        sk.leftArm,
        sk.hang.leftArm,
        opposite,
        armSwing,
        sk.leftArmSwingSign,
        sk.leftArmSwingMin
      );
      this.applyArmSwing(
        sk.rightArm,
        sk.hang.rightArm,
        phase,
        armSwing,
        sk.rightArmSwingSign,
        sk.rightArmSwingMin
      );

      if (sk.leftForeArm && sk.hang.leftForeArm) {
        sk.leftForeArm.rotation.set(
          sk.hang.leftForeArm.x + leftStrike * elbow,
          sk.hang.leftForeArm.y,
          sk.hang.leftForeArm.z,
          sk.hang.leftForeArm.order
        );
      }
      if (sk.rightForeArm && sk.hang.rightForeArm) {
        sk.rightForeArm.rotation.set(
          sk.hang.rightForeArm.x + rightStrike * elbow,
          sk.hang.rightForeArm.y,
          sk.hang.rightForeArm.z,
          sk.hang.rightForeArm.order
        );
      }

      sk.leftLeg.rotation.x = sk.hang.leftLeg.x + phase * legSwing;
      sk.rightLeg.rotation.x = sk.hang.rightLeg.x + opposite * legSwing;
      sk.leftLeg.rotation.z = sk.hang.leftLeg.z + leftStrike * 0.05 * waddle;
      sk.rightLeg.rotation.z = sk.hang.rightLeg.z + rightStrike * 0.05 * waddle;

      if (sk.leftShin && sk.hang.leftShin) {
        sk.leftShin.rotation.x = sk.hang.leftShin.x + leftStrike * knee;
      }
      if (sk.rightShin && sk.hang.rightShin) {
        sk.rightShin.rotation.x = sk.hang.rightShin.x + rightStrike * knee;
      }

      if (sk.hips && sk.hang.hips) {
        sk.hips.rotation.set(
          sk.hang.hips.x + contact * 0.025 * waddle,
          sk.hang.hips.y + phase * WADDLE_YAW * waddle,
          sk.hang.hips.z + phase * WADDLE_ROLL * waddle,
          sk.hang.hips.order
        );
      }
      if (sk.spine && sk.hang.spine) {
        sk.spine.rotation.set(
          sk.hang.spine.x - contact * 0.015 * waddle,
          sk.hang.spine.y - phase * WADDLE_YAW * 0.5 * waddle,
          sk.hang.spine.z - phase * WADDLE_ROLL * 0.4 * waddle,
          sk.hang.spine.order
        );
      }
    } else {
      const k = Math.min(1, IDLE_LERP * dt);
      this.walkTime += dt * 1.2;
      const idleSway = Math.sin(this.walkTime) * 0.02;
      this.lerpEuler(sk.leftArm.rotation, sk.hang.leftArm, k);
      this.lerpEuler(sk.rightArm.rotation, sk.hang.rightArm, k);
      if (sk.leftForeArm && sk.hang.leftForeArm) {
        this.lerpEuler(sk.leftForeArm.rotation, sk.hang.leftForeArm, k);
      }
      if (sk.rightForeArm && sk.hang.rightForeArm) {
        this.lerpEuler(sk.rightForeArm.rotation, sk.hang.rightForeArm, k);
      }
      sk.leftLeg.rotation.x += (sk.hang.leftLeg.x - sk.leftLeg.rotation.x) * k;
      sk.rightLeg.rotation.x += (sk.hang.rightLeg.x - sk.rightLeg.rotation.x) * k;
      sk.leftLeg.rotation.z += (sk.hang.leftLeg.z - sk.leftLeg.rotation.z) * k;
      sk.rightLeg.rotation.z += (sk.hang.rightLeg.z - sk.rightLeg.rotation.z) * k;
      if (sk.leftShin && sk.hang.leftShin) {
        this.lerpEuler(sk.leftShin.rotation, sk.hang.leftShin, k);
      }
      if (sk.rightShin && sk.hang.rightShin) {
        this.lerpEuler(sk.rightShin.rotation, sk.hang.rightShin, k);
      }
      if (sk.hips && sk.hang.hips) {
        sk.hips.rotation.x += (sk.hang.hips.x - sk.hips.rotation.x) * k;
        sk.hips.rotation.y += (sk.hang.hips.y - sk.hips.rotation.y) * k;
        sk.hips.rotation.z += (sk.hang.hips.z + idleSway - sk.hips.rotation.z) * k;
      }
      if (sk.spine && sk.hang.spine) {
        this.lerpEuler(sk.spine.rotation, sk.hang.spine, k);
      }
    }
  }

  /**
   * Calibre la pose au repos : bras le long du corps ou légèrement devant.
   */
  private calibrateArmRestPose(
    arm: THREE.Object3D,
    root: THREE.Object3D,
    reference: THREE.Object3D,
    isLeft: boolean
  ): { hang: THREE.Euler; swingSign: number; swingMin: number } {
    const base = cloneEuler(arm.rotation);
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    root.updateMatrixWorld(true);
    root.getWorldDirection(forward);
    right.crossVectors(new THREE.Vector3(0, 1, 0), forward).normalize();

    let bestRot = base.clone();
    let bestScore = Number.NEGATIVE_INFINITY;
    let bestSwingSign = -1;

    const zCandidates = isLeft ? [1, -1] : [-1, 1];
    const fromTpose = this.isArmExtendedHorizontal(arm, reference);

    for (const zSign of zCandidates) {
      for (let xAdj = -1.05; xAdj <= 0.55; xAdj += 0.07) {
        arm.rotation.copy(base);
        if (fromTpose) {
          arm.rotation.z += zSign * ARM_HANG_Z;
        }
        arm.rotation.x += xAdj;
        arm.updateMatrixWorld(true);
        const score = this.scoreArmPoseWorld(arm, reference, forward, right);
        if (score > bestScore) {
          bestScore = score;
          bestRot = cloneEuler(arm.rotation);
          bestSwingSign = xAdj >= 0 ? -1 : 1;
        }
      }
    }

    arm.rotation.copy(bestRot);
    arm.updateMatrixWorld(true);
    return {
      hang: bestRot,
      swingSign: bestSwingSign,
      swingMin: bestRot.x - 0.06,
    };
  }

  private applyArmSwing(
    arm: THREE.Object3D,
    hang: THREE.Euler,
    phase: number,
    amplitude: number,
    sign: number,
    minX: number
  ): void {
    const delta = phase * amplitude * sign;
    const x = THREE.MathUtils.clamp(hang.x + delta, minX, hang.x + ARM_FORWARD_X + 0.18);
    arm.rotation.set(x, hang.y, hang.z, hang.order);
  }

  private scoreArmPoseWorld(
    arm: THREE.Object3D,
    reference: THREE.Object3D,
    forward: THREE.Vector3,
    right: THREE.Vector3
  ): number {
    const shoulder = new THREE.Vector3();
    const tip = new THREE.Vector3();
    arm.getWorldPosition(shoulder);
    this.readArmTip(arm, tip);
    const rel = tip.clone().sub(shoulder);
    const fwd = rel.dot(forward);
    const side = Math.abs(rel.dot(right));
    const down = shoulder.y - tip.y;

    if (fwd < -0.04) return -800 + fwd;
    if (down < 0.04) return -300;

    return down * 2.2 + side * 1.4 + Math.min(Math.max(fwd, 0), 0.3) * 1.1;
  }

  private isArmExtendedHorizontal(arm: THREE.Object3D, reference: THREE.Object3D): boolean {
    const origin = new THREE.Vector3();
    reference.getWorldPosition(origin);
    const tip = new THREE.Vector3();
    this.readArmTip(arm, tip);
    const horiz = Math.hypot(tip.x - origin.x, tip.z - origin.z);
    const drop = origin.y - tip.y;
    return horiz > drop * 1.35;
  }

  /**
   * T-pose Mixamo : bras étendus latéralement — sinon ne pas forcer le hang Z.
   */
  private needsArmHang(
    leftArm: THREE.Object3D,
    rightArm: THREE.Object3D,
    reference: THREE.Object3D
  ): boolean {
    const origin = new THREE.Vector3();
    reference.getWorldPosition(origin);
    const tipL = new THREE.Vector3();
    const tipR = new THREE.Vector3();
    this.readArmTip(leftArm, tipL);
    this.readArmTip(rightArm, tipR);
    const horizL = Math.hypot(tipL.x - origin.x, tipL.z - origin.z);
    const horizR = Math.hypot(tipR.x - origin.x, tipR.z - origin.z);
    const dropL = origin.y - tipL.y;
    const dropR = origin.y - tipR.y;
    return horizL > dropL * 1.35 || horizR > dropR * 1.35;
  }

  private hasUsableWalkClip(clips: THREE.AnimationClip[]): boolean {
    if (!this.useClipAnimation || !this.walkAction) return false;
    const walkClip =
      this.pickClip(clips, WALK_NAME_RE) ??
      clips.find((c) => !IDLE_NAME_RE.test(c.name || '')) ??
      clips[0] ??
      null;
    if (!walkClip) return false;
    return walkClip.duration >= 0.75 && walkClip.tracks.length >= 10;
  }

  private readArmTip(arm: THREE.Object3D, target: THREE.Vector3): THREE.Vector3 {
    const child = arm.children.find((node) => (node as THREE.Bone).isBone) ?? arm.children[0];
    if (child) {
      child.getWorldPosition(target);
      return target;
    }
    return target.setFromMatrixPosition(arm.matrixWorld);
  }

  private lerpEuler(current: THREE.Euler, target: THREE.Euler, k: number): void {
    current.x += (target.x - current.x) * k;
    current.y += (target.y - current.y) * k;
    current.z += (target.z - current.z) * k;
  }

  /**
   * Choisit le signe Z qui abaisse les bras (évite de les lever au-dessus de la T-pose).
   */
  private detectArmHangSign(
    leftArm: THREE.Object3D,
    rightArm: THREE.Object3D,
    hips: THREE.Object3D | null
  ): { left: number; right: number } {
    const pick = (arm: THREE.Object3D, prefer: number): number => {
      const baseZ = arm.rotation.z;
      const yAt = (dz: number): number => {
        arm.rotation.z = baseZ + dz;
        arm.updateMatrixWorld(true);
        const tip = new THREE.Vector3();
        // Enfant distal ou offset local le long de l’os
        if (arm.children.length > 0) {
          arm.children[0].getWorldPosition(tip);
        } else {
          tip.setFromMatrixPosition(arm.matrixWorld);
        }
        arm.rotation.z = baseZ;
        arm.updateMatrixWorld(true);
        return tip.y;
      };
      const yDown = yAt(prefer * ARM_HANG_Z);
      const yUp = yAt(-prefer * ARM_HANG_Z);
      // Le bon signe = bras plus bas (Y monde plus petit)
      return yDown <= yUp ? prefer : -prefer;
    };

    void hips;
    return {
      left: pick(leftArm, 1),
      right: pick(rightArm, -1),
    };
  }

  private updateWalkRig(dt: number, isWalking: boolean, speedNorm = 1): void {
    const rig = this.walkRig;
    if (!rig) return;

    const armSwing = ARM_SWING * THREE.MathUtils.lerp(0.7, 1, speedNorm);
    const legSwing = LEG_SWING * THREE.MathUtils.lerp(0.55, 1, speedNorm);

    if (isWalking) {
      this.walkTime += dt * WALK_SPEED * THREE.MathUtils.lerp(0.7, 1.15, speedNorm);
      const phase = Math.sin(this.walkTime);
      const opposite = -phase;
      const bounce = Math.abs(Math.sin(this.walkTime * 2));
      rig.leftArm.rotation.x = 0.7 + phase * armSwing;
      rig.rightArm.rotation.x = 0.7 + opposite * armSwing;
      rig.leftLeg.rotation.x = opposite * legSwing;
      rig.rightLeg.rotation.x = phase * legSwing;

      rig.torso.position.y = rig.torsoBaseY + bounce * 0.06 * speedNorm;
      rig.head.position.y = rig.headBaseY;
      rig.torso.rotation.y = phase * WADDLE_YAW * speedNorm;
      rig.torso.rotation.z = phase * WADDLE_ROLL * speedNorm;
    } else {
      const k = Math.min(1, IDLE_LERP * dt);
      rig.leftArm.rotation.x += (0.7 - rig.leftArm.rotation.x) * k;
      rig.rightArm.rotation.x += (0.7 - rig.rightArm.rotation.x) * k;
      rig.leftLeg.rotation.x += (0 - rig.leftLeg.rotation.x) * k;
      rig.rightLeg.rotation.x += (0 - rig.rightLeg.rotation.x) * k;
      rig.torso.position.y += (rig.torsoBaseY - rig.torso.position.y) * k;
      rig.torso.rotation.y += (0 - rig.torso.rotation.y) * k;
      rig.torso.rotation.z += (0 - rig.torso.rotation.z) * k;
    }
  }

  /**
   * Perso articulé : torso, head, bras/jambes sur pivots épaule/hanche.
   */
  private createWalkRig(): WalkRig {
    const root = new THREE.Group();
    root.name = 'walk-rig';

    const bodyMat = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      emissive: 0xff2d9a,
      emissiveIntensity: 0.55,
    });
    const headMat = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      emissive: 0xff66b3,
      emissiveIntensity: 0.5,
    });

    const torsoBaseY = 1.5;
    const torso = new THREE.Group();
    torso.position.y = torsoBaseY;
    const torsoMesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.4, 1.0, 4, 8),
      bodyMat
    );
    torso.add(torsoMesh);

    const headBaseY = 0.95;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 10), headMat);
    head.position.y = headBaseY;
    torso.add(head);

    const armGeo = new THREE.CylinderGeometry(0.12, 0.1, 0.7, 8);
    const leftArm = new THREE.Group();
    leftArm.position.set(-0.55, 0.45, 0);
    leftArm.rotation.z = THREE.MathUtils.degToRad(4);
    leftArm.rotation.x = 0.7;
    const leftArmMesh = new THREE.Mesh(armGeo, bodyMat);
    leftArmMesh.position.y = -0.35;
    leftArm.add(leftArmMesh);
    torso.add(leftArm);

    const rightArm = new THREE.Group();
    rightArm.position.set(0.55, 0.45, 0);
    rightArm.rotation.z = THREE.MathUtils.degToRad(-4);
    rightArm.rotation.x = 0.7;
    const rightArmMesh = new THREE.Mesh(armGeo, bodyMat);
    rightArmMesh.position.y = -0.35;
    rightArm.add(rightArmMesh);
    torso.add(rightArm);

    const legGeo = new THREE.CylinderGeometry(0.14, 0.12, 0.85, 8);
    const leftLeg = new THREE.Group();
    leftLeg.position.set(-0.25, -0.55, 0);
    const leftLegMesh = new THREE.Mesh(legGeo, bodyMat);
    leftLegMesh.position.y = -0.4;
    leftLeg.add(leftLegMesh);
    torso.add(leftLeg);

    const rightLeg = new THREE.Group();
    rightLeg.position.set(0.25, -0.55, 0);
    const rightLegMesh = new THREE.Mesh(legGeo, bodyMat);
    rightLegMesh.position.y = -0.4;
    rightLeg.add(rightLegMesh);
    torso.add(rightLeg);

    root.add(torso);

    return {
      root,
      torso,
      head,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      torsoBaseY,
      headBaseY,
    };
  }

  private setupMixer(model: THREE.Object3D, clips: THREE.AnimationClip[]): void {
    this.mixer = null;
    this.idleAction = null;
    this.walkAction = null;
    this.useClipAnimation = false;
    this.animMode = 'idle';

    if (!clips.length) {
      console.info('[CharacterNftService] FBX sans clips — bob procédural');
      return;
    }

    this.mixer = new THREE.AnimationMixer(model);
    // Walk : nom match OU premier clip (Mixamo souvent « mixamo.com »)
    const walkClip =
      this.pickClip(clips, WALK_NAME_RE) ??
      clips.find((c) => !IDLE_NAME_RE.test(c.name || '')) ??
      clips[0];
    const idleClip =
      this.pickClip(clips, IDLE_NAME_RE) ??
      (clips.length > 1 ? clips.find((c) => c !== walkClip) ?? null : null);

    this.walkAction = this.mixer.clipAction(walkClip);
    this.walkAction.enabled = true;
    this.walkAction.setLoop(THREE.LoopRepeat, Infinity);
    this.walkAction.clampWhenFinished = false;

    if (idleClip && idleClip !== walkClip) {
      this.idleAction = this.mixer.clipAction(idleClip);
      this.idleAction.enabled = true;
      this.idleAction.setLoop(THREE.LoopRepeat, Infinity);
      this.idleAction.play();
      this.idleAction.setEffectiveWeight(1);
      this.walkAction.play();
      this.walkAction.setEffectiveWeight(0);
    } else {
      this.walkAction.play();
      this.walkAction.paused = true;
      this.walkAction.time = 0;
      this.idleAction = null;
    }

    this.useClipAnimation = true;
    console.info(
      '[CharacterNftService] mixer walk=',
      walkClip.name || '(unnamed)',
      'idle=',
      idleClip?.name ?? 'none'
    );
  }

  private syncClipActions(moving: boolean): void {
    const next: 'idle' | 'walk' = moving ? 'walk' : 'idle';
    if (next === this.animMode) return;
    this.animMode = next;
    const fade = 0.25;

    if (this.idleAction && this.walkAction) {
      if (next === 'walk') {
        this.walkAction.reset().play();
        this.idleAction.crossFadeTo(this.walkAction, fade, false);
      } else {
        this.idleAction.reset().play();
        this.walkAction.crossFadeTo(this.idleAction, fade, false);
      }
      return;
    }

    if (this.walkAction) {
      if (next === 'walk') {
        this.walkAction.paused = false;
        this.walkAction.setEffectiveTimeScale(1);
        this.walkAction.setEffectiveWeight(1);
      } else {
        this.walkAction.paused = true;
        this.walkAction.time = 0;
      }
    }
  }

  private pickClip(
    clips: THREE.AnimationClip[],
    re: RegExp
  ): THREE.AnimationClip | null {
    return clips.find((c) => re.test(c.name || '')) ?? null;
  }

  private async loadCharacterAnonVisual(customAssetPath?: string | null): Promise<{
    root: THREE.Object3D;
    clips: THREE.AnimationClip[];
    kind: 'fbx' | 'stl';
    source: string;
  }> {
    if (customAssetPath) {
      if (isCharacterFbxPath(customAssetPath)) {
        const fbx = await this.loadFbxFromPath(customAssetPath);
        return { root: fbx, clips: fbx.animations ?? [], kind: 'fbx', source: customAssetPath };
      }
      if (isCharacterStlPath(customAssetPath)) {
        const stl = await this.loadStlFromPath(customAssetPath);
        return { root: stl, clips: [], kind: 'stl', source: customAssetPath };
      }
    }

    try {
      const fbx = await this.loadFbxModel();
      return { root: fbx, clips: fbx.animations ?? [], kind: 'fbx', source: CHARACTER_FBX_PATHS[0] };
    } catch (fbxErr) {
      console.warn('[CharacterNftService] FBX CharacterAnon indisponible, essai STL.', fbxErr);
    }

    try {
      const stl = await this.loadStlModel(CHARACTER_STL_PATHS);
      return { root: stl, clips: [], kind: 'stl', source: CHARACTER_STL_PATHS[0] };
    } catch (stlErr) {
      console.warn('[CharacterNftService] STL CharacterAnon indisponible, essai fallback.', stlErr);
    }

    const fallback = await this.loadStlModel(CHARACTER_ASSETS.fallbackStl);
    return { root: fallback, clips: [], kind: 'stl', source: CHARACTER_ASSETS.fallbackStl[0] };
  }

  private async loadFbxFromPath(path: string): Promise<THREE.Group> {
    const loader = new FBXLoader();
    return await new Promise<THREE.Group>((resolve, reject) => {
      loader.load(path, resolve, undefined, reject);
    });
  }

  private async loadFbxModel(): Promise<THREE.Group> {
    return this.loadFromPaths(CHARACTER_FBX_PATHS, (path) => this.loadFbxFromPath(path));
  }

  private async loadStlModel(paths: readonly string[]): Promise<THREE.Group> {
    return this.loadFromPaths(paths, (path) => this.loadStlFromPath(path));
  }

  private async loadStlFromPath(path: string): Promise<THREE.Group> {
    const loader = new STLLoader();
    const geometry = await new Promise<THREE.BufferGeometry>((resolve, reject) => {
      loader.load(path, resolve, undefined, reject);
    });
    geometry.computeVertexNormals();
    const group = new THREE.Group();
    group.name = 'CharacterAnon-stl';
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());
    mesh.name = 'CharacterAnon-stl-mesh';
    group.add(mesh);
    return group;
  }

  private async loadFromPaths<T>(
    paths: readonly string[],
    loadOne: (path: string) => Promise<T>
  ): Promise<T> {
    let lastError: unknown;
    for (const path of paths) {
      try {
        return await loadOne(path);
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError ?? new Error('Asset personnage introuvable');
  }

  private prepareStlMaterial(root: THREE.Object3D): void {
    const material = this.getCharacterBodyMaterial();
    root.visible = true;
    root.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.visible = true;
        child.castShadow = false;
        child.receiveShadow = false;
        child.frustumCulled = false;
        const old = child.material;
        child.material = material;
        this.disposeMaterial(old);
      }
    });
  }

  private fbxBodyMat: THREE.MeshStandardMaterial | null = null;

  private prepareFbxMaterials(root: THREE.Object3D): void {
    const material = this.getCharacterBodyMaterial();
    root.visible = true;
    root.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.visible = true;
        child.castShadow = false;
        child.receiveShadow = false;
        child.frustumCulled = false;
        const old = child.material;
        child.material = material;
        this.disposeMaterial(old);
      }
    });
  }

  private getCharacterBodyMaterial(): THREE.MeshStandardMaterial {
    if (!this.fbxBodyMat) {
      this.fbxBodyMat = new THREE.MeshStandardMaterial({
        color: 0xf0ebe3,
        roughness: 0.68,
        metalness: 0.08,
        emissive: new THREE.Color(0x1a1428),
        emissiveIntensity: 0.14,
        side: THREE.FrontSide,
      });
      this.fbxBodyMat.userData['shared'] = true;
    }
    return this.fbxBodyMat;
  }

  private disposeMaterial(material: THREE.Material | THREE.Material[]): void {
    const mats = Array.isArray(material) ? material : [material];
    for (const m of mats) {
      if (!m || m === this.fbxBodyMat || m.userData?.['shared']) continue;
      if ('map' in m) {
        const textured = m as THREE.MeshStandardMaterial;
        textured.map?.dispose();
        textured.normalMap?.dispose();
        textured.emissiveMap?.dispose();
      }
      m.dispose();
    }
  }

  private wrapPlanted(visual: THREE.Object3D): THREE.Group {
    const root = new THREE.Group();
    visual.position.set(0, 0, 0);
    visual.rotation.set(0, 0, 0);
    visual.scale.set(1, 1, 1);
    visual.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(visual);
    const height = Math.max(1e-4, box.max.y - box.min.y);
    visual.scale.setScalar(TARGET_HEIGHT / height);
    visual.updateMatrixWorld(true);

    const scaled = new THREE.Box3().setFromObject(visual);
    this.plantY = -scaled.min.y + CHARACTER_ASSETS.plantLiftMeters;
    visual.position.set(0, this.plantY, 0);

    console.info('[CharacterNftService] planted height', {
      target: TARGET_HEIGHT,
      plantY: this.plantY,
      scaledHeight: scaled.max.y - scaled.min.y,
      walkRig: !!this.walkRig,
    });

    this.visual = visual;
    root.add(visual);
    return root;
  }

  private disposeObject(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const geo = child.geometry;
        if (geo && !geo.userData?.['shared']) geo.dispose();
        const mats = Array.isArray(child.material)
          ? child.material
          : child.material
            ? [child.material]
            : [];
        for (const m of mats) {
          if (!m || m.userData?.['shared'] || m === this.fbxBodyMat) continue;
          m.dispose();
        }
      }
    });
  }
}
