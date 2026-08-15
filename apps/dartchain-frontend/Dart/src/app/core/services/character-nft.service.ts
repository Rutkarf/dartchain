import { Injectable } from '@angular/core';
import { BehaviorSubject, type Observable } from 'rxjs';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

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
  leftForeArm: THREE.Object3D | null;
  rightForeArm: THREE.Object3D | null;
  hips: THREE.Object3D | null;
  /** Pose « bras le long du corps » (plus T-pose). */
  hang: {
    leftArm: THREE.Euler;
    rightArm: THREE.Euler;
    leftLeg: THREE.Euler;
    rightLeg: THREE.Euler;
    leftForeArm: THREE.Euler | null;
    rightForeArm: THREE.Euler | null;
    hips: THREE.Euler | null;
  };
}

const CHARACTER_FBX_PATHS = [
  'assets/characters/CharacterAnon.fbx',
  '/assets/characters/CharacterAnon.fbx',
] as const;

const TARGET_HEIGHT = 4.2; // +50 % vs 2.8
export const FLOOR_Y = 0;
export const CHARACTER_MOVE_SPEED = 1.6;
export const CHARACTER_RADIUS = 0.65;

const WALK_SPEED = 9;
const ARM_SWING = Math.PI / 4;
const LEG_SWING = Math.PI / 6;
/** Abaisse les bras depuis la T-pose Mixamo (perpendiculaires → le long du corps). */
const ARM_HANG_Z = Math.PI * 0.5;
const FOREARM_HANG_X = Math.PI * 0.12;
const IDLE_LERP = 6;

const WALK_NAME_RE = /walk|run|locomotion|move|marche/i;
const IDLE_NAME_RE = /idle|stand|wait|breath|tpose|a-pose|rest/i;

const LEFT_ARM_RE = /LeftArm|leftarm|upperarm_l|UpperArm\.L|Arm_L/i;
const RIGHT_ARM_RE = /RightArm|rightarm|upperarm_r|UpperArm\.R|Arm_R/i;
const LEFT_FOREARM_RE = /LeftForeArm|leftforearm|lowerarm_l|ForeArm\.L/i;
const RIGHT_FOREARM_RE = /RightForeArm|rightforearm|lowerarm_r|ForeArm\.R/i;
const LEFT_LEG_RE = /LeftUpLeg|leftupleg|LeftThigh|thigh_l|UpperLeg\.L|LeftLeg(?!acy)/i;
const RIGHT_LEG_RE = /RightUpLeg|rightupleg|RightThigh|thigh_r|UpperLeg\.R|RightLeg(?!acy)/i;
const HIPS_RE = /Hips|pelvis|Hip/i;

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

function cloneEuler(e: THREE.Euler): THREE.Euler {
  return new THREE.Euler(e.x, e.y, e.z, e.order);
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

  async loadCharacterForUser(userId: string, scene: THREE.Scene): Promise<void> {
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

    // TOUJOURS CharacterAnon.fbx si possible
    try {
      const fbx = await this.loadFbxModel();
      if (token !== this.loadToken) {
        this.disposeObject(fbx);
        return;
      }
      clips = fbx.animations ?? [];
      this.prepareFbxMaterials(fbx);
      visual = fbx;
      console.info(
        `[CharacterNftService] CharacterAnon.fbx chargé (${clips.length} clip(s))`,
        clips.map((c) => c.name || '(unnamed)')
      );
    } catch (err) {
      console.warn('[CharacterNftService] FBX indisponible — walk-rig.', err);
      this.walkRig = this.createWalkRig();
      visual = this.walkRig.root;
      clips = [];
    }

    if (token !== this.loadToken) {
      this.disposeObject(visual);
      return;
    }

    const root = this.wrapPlanted(visual);
    root.name = `character-nft:${userId}`;
    const spawn = emptyState(userId).position.clone();
    root.position.copy(spawn);
    root.rotation.y = emptyState().rotation;
    scene.add(root);

    // Marche procédurale sur os Mixamo (garanti bras/jambes) + clips si utiles
    this.skeletonWalk = this.bindSkeletonWalk(visual);
    this.setupMixer(visual, clips);

    // Si os trouvés : priorité procédurale (clips souvent Take 001 figé / non fiable)
    if (this.skeletonWalk) {
      this.stopClipAnimation();
      console.info('[CharacterNftService] Marche procédurale os (bras/jambes) active');
    } else if (this.useClipAnimation) {
      console.info('[CharacterNftService] Marche via AnimationMixer (clips)');
    } else if (this.walkRig) {
      console.info('[CharacterNftService] Marche via walk-rig procédural');
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

    // 1) Os Mixamo du CharacterAnon.fbx — bras / jambes visibles
    if (this.skeletonWalk) {
      this.updateSkeletonWalk(deltaSeconds, moving || climbing, climbNorm);
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

    // 4) Bob simple
    if (!this.visual) return;
    if (moving) this.walkTime += deltaSeconds * WALK_SPEED * (0.65 + norm * 0.5);
    const bob = Math.sin(this.walkTime) * 0.04 * blend;
    this.visual.position.y = this.plantY + bob;
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
      leftForeArm: null as THREE.Object3D | null,
      rightForeArm: null as THREE.Object3D | null,
      hips: null as THREE.Object3D | null,
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
      if (!found.leftLeg && LEFT_LEG_RE.test(n) && !/Foot|Toe|Roll|Twist|Calf|Lower/i.test(n)) {
        found.leftLeg = obj;
      }
      if (
        !found.rightLeg &&
        RIGHT_LEG_RE.test(n) &&
        !/Foot|Toe|Roll|Twist|Calf|Lower/i.test(n)
      ) {
        found.rightLeg = obj;
      }
      if (!found.hips && HIPS_RE.test(n) && !/Spine/i.test(n)) {
        found.hips = obj;
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
    const foreL = found.leftForeArm;
    const foreR = found.rightForeArm;
    const hipsBone = found.hips;

    // Bind = souvent T-pose : on construit une pose « bras baissés » + swing
    const hangL = cloneEuler(armL.rotation);
    const hangR = cloneEuler(armR.rotation);
    const hangSign = this.detectArmHangSign(armL, armR, hipsBone);
    hangL.z += hangSign.left * ARM_HANG_Z;
    hangR.z += hangSign.right * ARM_HANG_Z;

    const hangForeL = foreL ? cloneEuler(foreL.rotation) : null;
    if (hangForeL) hangForeL.x += FOREARM_HANG_X;
    const hangForeR = foreR ? cloneEuler(foreR.rotation) : null;
    if (hangForeR) hangForeR.x += FOREARM_HANG_X;

    // Applique tout de suite la pose baissée (plus de T-pose visible)
    armL.rotation.copy(hangL);
    armR.rotation.copy(hangR);
    if (foreL && hangForeL) foreL.rotation.copy(hangForeL);
    if (foreR && hangForeR) foreR.rotation.copy(hangForeR);

    console.info('[CharacterNftService] Os marche liés (bras baissés)', {
      leftArm: armL.name,
      rightArm: armR.name,
      leftForeArm: foreL?.name ?? null,
      rightForeArm: foreR?.name ?? null,
      leftLeg: legL.name,
      rightLeg: legR.name,
      hips: hipsBone?.name ?? null,
    });

    return {
      leftArm: armL,
      rightArm: armR,
      leftLeg: legL,
      rightLeg: legR,
      leftForeArm: foreL,
      rightForeArm: foreR,
      hips: hipsBone,
      hang: {
        leftArm: hangL,
        rightArm: hangR,
        leftLeg: cloneEuler(legL.rotation),
        rightLeg: cloneEuler(legR.rotation),
        leftForeArm: hangForeL,
        rightForeArm: hangForeR,
        hips: hipsBone ? cloneEuler(hipsBone.rotation) : null,
      },
    };
  }

  private updateSkeletonWalk(dt: number, isWalking: boolean, speedNorm = 1): void {
    const sk = this.skeletonWalk;
    if (!sk) return;

    const armSwing = ARM_SWING * THREE.MathUtils.lerp(0.5, 1, speedNorm);
    const legSwing = LEG_SWING * THREE.MathUtils.lerp(0.45, 1, speedNorm);
    const elbow = 0.35 * speedNorm;

    if (isWalking) {
      this.walkTime += dt * WALK_SPEED * THREE.MathUtils.lerp(0.7, 1.25, speedNorm);
      const phase = Math.sin(this.walkTime);
      const opposite = -phase;

      // Bras le long du corps (Z fixe) + balancement avant/arrière (X)
      sk.leftArm.rotation.set(
        sk.hang.leftArm.x + phase * armSwing,
        sk.hang.leftArm.y,
        sk.hang.leftArm.z,
        sk.hang.leftArm.order
      );
      sk.rightArm.rotation.set(
        sk.hang.rightArm.x + opposite * armSwing,
        sk.hang.rightArm.y,
        sk.hang.rightArm.z,
        sk.hang.rightArm.order
      );

      if (sk.leftForeArm && sk.hang.leftForeArm) {
        sk.leftForeArm.rotation.set(
          sk.hang.leftForeArm.x + Math.max(0, -phase) * elbow,
          sk.hang.leftForeArm.y,
          sk.hang.leftForeArm.z,
          sk.hang.leftForeArm.order
        );
      }
      if (sk.rightForeArm && sk.hang.rightForeArm) {
        sk.rightForeArm.rotation.set(
          sk.hang.rightForeArm.x + Math.max(0, phase) * elbow,
          sk.hang.rightForeArm.y,
          sk.hang.rightForeArm.z,
          sk.hang.rightForeArm.order
        );
      }

      sk.leftLeg.rotation.x = sk.hang.leftLeg.x + opposite * legSwing;
      sk.rightLeg.rotation.x = sk.hang.rightLeg.x + phase * legSwing;

      if (sk.hips && sk.hang.hips) {
        sk.hips.rotation.y = sk.hang.hips.y + phase * 0.06 * speedNorm;
      }
    } else {
      const k = Math.min(1, IDLE_LERP * dt);
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
      if (sk.hips && sk.hang.hips) {
        sk.hips.rotation.y += (sk.hang.hips.y - sk.hips.rotation.y) * k;
      }
    }
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

    const armSwing = ARM_SWING * speedNorm;
    const legSwing = LEG_SWING * speedNorm;

    if (isWalking) {
      this.walkTime += dt * WALK_SPEED * THREE.MathUtils.lerp(0.65, 1.15, speedNorm);
      const phase = Math.sin(this.walkTime);
      const opposite = -phase;
      rig.leftArm.rotation.x = phase * armSwing;
      rig.rightArm.rotation.x = opposite * armSwing;
      rig.leftLeg.rotation.x = opposite * legSwing;
      rig.rightLeg.rotation.x = phase * legSwing;

      const bodyBob = Math.abs(Math.sin(this.walkTime * 2)) * 0.025 * speedNorm;
      rig.torso.position.y = rig.torsoBaseY + bodyBob;
      rig.head.position.y = rig.headBaseY;
      rig.torso.rotation.y = phase * 0.08 * speedNorm;
    } else {
      const k = Math.min(1, IDLE_LERP * dt);
      rig.leftArm.rotation.x += (0 - rig.leftArm.rotation.x) * k;
      rig.rightArm.rotation.x += (0 - rig.rightArm.rotation.x) * k;
      rig.leftLeg.rotation.x += (0 - rig.leftLeg.rotation.x) * k;
      rig.rightLeg.rotation.x += (0 - rig.rightLeg.rotation.x) * k;
      rig.torso.position.y += (rig.torsoBaseY - rig.torso.position.y) * k;
      rig.torso.rotation.y += (0 - rig.torso.rotation.y) * k;
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
    const leftArmMesh = new THREE.Mesh(armGeo, bodyMat);
    leftArmMesh.position.y = -0.35;
    leftArm.add(leftArmMesh);
    torso.add(leftArm);

    const rightArm = new THREE.Group();
    rightArm.position.set(0.55, 0.45, 0);
    rightArm.rotation.z = THREE.MathUtils.degToRad(-4);
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

  private async loadFbxModel(): Promise<THREE.Group> {
    const loader = new FBXLoader();
    let lastError: unknown;
    for (const path of CHARACTER_FBX_PATHS) {
      try {
        return await new Promise<THREE.Group>((resolve, reject) => {
          loader.load(path, resolve, undefined, reject);
        });
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError ?? new Error('CharacterAnon.fbx introuvable');
  }

  private fbxBodyMat: THREE.MeshLambertMaterial | null = null;

  private prepareFbxMaterials(root: THREE.Object3D): void {
    // Un seul Lambert partagé = même blanc/fuchsia, shader bien plus léger que Standard
    if (!this.fbxBodyMat) {
      this.fbxBodyMat = new THREE.MeshLambertMaterial({
        color: 0xffffff,
        emissive: 0xff2d9a,
        emissiveIntensity: 0.55,
        side: THREE.FrontSide,
        transparent: false,
        opacity: 1,
        depthWrite: true,
        depthTest: true,
      });
      this.fbxBodyMat.userData['shared'] = true;
    }

    root.visible = true;
    root.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.visible = true;
        child.castShadow = false;
        child.receiveShadow = false;
        child.frustumCulled = true;
        const old = child.material;
        child.material = this.fbxBodyMat!;
        // Dispose anciens mats FBX (lourds / textures) — pas le shared
        const oldMats = Array.isArray(old) ? old : old ? [old] : [];
        for (const m of oldMats) {
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
    });
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
    this.plantY = -scaled.min.y;
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
