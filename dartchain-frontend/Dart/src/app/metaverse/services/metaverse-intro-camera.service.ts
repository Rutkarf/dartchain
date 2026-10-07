import { Injectable, signal } from '@angular/core';
import * as THREE from 'three';

import {
  METAVERSE_INTRO_CAMERA,
  easeHeroicFantasy,
  easeOutCubic,
  smoothstep,
} from './metaverse-intro-camera.config';

export interface MetaverseIntroEndOrbit {
  yaw: number;
  pitch: number;
  distance: number;
  lookAhead: number;
  arenaPeek: boolean;
}

/** Phase UI — surtout pour le template ; l’intensité est portée par veilOpacity. */
export type MetaverseIntroVeilPhase = 'hidden' | 'armed' | 'holding' | 'revealing';

/**
 * Intro MetaVerseBB — caméra + voile bord uniquement.
 * Le titre METAVERSEBB vit uniquement sur l’ombrière 3D (jamais retouché ici).
 */
@Injectable({ providedIn: 'root' })
export class MetaverseIntroCameraService {
  private active = false;
  private armed = false;
  private elapsed = 0;
  private armElapsed = 0;
  private playedThisSession = false;
  private endOrbit: MetaverseIntroEndOrbit | null = null;
  private baseFov: number | null = null;

  readonly veilPhase = signal<MetaverseIntroVeilPhase>('hidden');
  /** 0–1 piloté chaque frame — voile bord seulement (centre ouvert sur l’ombrière). */
  readonly veilOpacity = signal(0);

  private readonly tmpPos = new THREE.Vector3();
  private readonly tmpLook = new THREE.Vector3();
  private readonly tmpEndPos = new THREE.Vector3();
  private readonly tmpEndLook = new THREE.Vector3();
  private readonly tmpCanopyLook = new THREE.Vector3();
  private readonly tmpMidLook = new THREE.Vector3();
  private readonly tmpUp = new THREE.Vector3();

  isActive(): boolean {
    return this.active;
  }

  isBlockingFollow(): boolean {
    return this.active || this.armed;
  }

  isArmed(): boolean {
    return this.armed;
  }

  hasPlayedThisSession(): boolean {
    return this.playedThisSession;
  }

  arm(camera: THREE.PerspectiveCamera): void {
    if (METAVERSE_INTRO_CAMERA.playOncePerSession && this.playedThisSession) {
      return;
    }
    if (this.active) return;
    const wasArmed = this.armed;
    this.armed = true;
    if (!wasArmed) {
      this.armElapsed = 0;
      this.veilOpacity.set(0);
    }
    this.veilPhase.set('armed');
    this.applyStartFrame(camera);
  }

  tryStart(endOrbit: MetaverseIntroEndOrbit): boolean {
    if (METAVERSE_INTRO_CAMERA.playOncePerSession && this.playedThisSession && !this.armed) {
      return false;
    }
    if (this.active) {
      this.endOrbit = { ...endOrbit };
      return true;
    }
    this.active = true;
    this.armed = false;
    this.elapsed = 0;
    this.endOrbit = { ...endOrbit };
    this.playedThisSession = true;
    this.veilPhase.set('holding');
    return true;
  }

  skip(): void {
    if (!this.active) return;
    if (this.elapsed < METAVERSE_INTRO_CAMERA.skipAfterSeconds) return;
    this.finishVisuals();
    this.active = false;
    this.armed = false;
    this.elapsed = METAVERSE_INTRO_CAMERA.durationSeconds;
  }

  forceEnd(): void {
    this.finishVisuals();
    this.active = false;
    this.armed = false;
    this.elapsed = METAVERSE_INTRO_CAMERA.durationSeconds;
  }

  cancel(): void {
    this.finishVisuals();
    this.active = false;
    this.armed = false;
    this.endOrbit = null;
    this.baseFov = null;
  }

  tick(
    deltaSeconds: number,
    camera: THREE.PerspectiveCamera,
    charPos: THREE.Vector3,
    liveEnd?: MetaverseIntroEndOrbit
  ): boolean {
    if (!this.active) return false;
    if (liveEnd) this.endOrbit = { ...liveEnd };
    if (!this.endOrbit) return false;

    if (this.baseFov == null) {
      this.baseFov = camera.fov;
    }

    const dt = Math.max(0, deltaSeconds);
    this.elapsed += dt;
    const cfg = METAVERSE_INTRO_CAMERA;
    const hold = cfg.holdTitleSeconds;
    const motionDuration = Math.max(0.1, cfg.durationSeconds - hold);
    const rawT =
      this.elapsed <= hold ? 0 : (this.elapsed - hold) / motionDuration;
    const t = easeHeroicFantasy(Math.min(1, rawT));

    this.computeEndPose(charPos, this.endOrbit, this.tmpEndPos, this.tmpEndLook);
    this.tmpCanopyLook.set(cfg.centerX, cfg.lookAtCanopyY, cfg.centerZ);
    this.tmpMidLook.set(
      cfg.centerX,
      THREE.MathUtils.lerp(cfg.lookAtCanopyY, this.tmpEndLook.y, 0.45),
      cfg.centerZ + 5
    );

    // ——— Hold : caméra 90° figée au-dessus de l’ombrière (titre immobile) ———
    if (rawT <= 0) {
      this.applyNadirPose(camera, cfg.startHeight, cfg.startFov);
      this.veilOpacity.set(METAVERSE_INTRO_CAMERA.holdVeilOpacity);
      this.veilPhase.set('holding');
      return true;
    }

    // ——— Spirale : seul mouvement / seul changement après init ———
    this.veilPhase.set('revealing');

    const open = easeOutCubic(smoothstep(0, 0.62, t));
    const angle = cfg.spiralTurns * Math.PI * 2 * t;
    const radius = THREE.MathUtils.lerp(cfg.startRadius, cfg.peakRadius, open);

    const heightEase = easeHeroicFantasy(t);
    const aerial = Math.sin(t * Math.PI) * 2.2;
    const height =
      THREE.MathUtils.lerp(cfg.startHeight, this.tmpEndPos.y, heightEase) +
      aerial * (1 - heightEase);

    this.tmpPos.set(
      cfg.centerX + Math.sin(angle) * radius,
      height,
      cfg.centerZ + Math.cos(angle) * radius
    );

    const toChar = smoothstep(cfg.characterBlendStart, 1, t);
    const toCharSoft = easeHeroicFantasy(toChar);
    this.tmpPos.lerp(this.tmpEndPos, toCharSoft);

    const lookA = smoothstep(0.02, 0.38, t);
    const lookB = smoothstep(0.38, 0.92, t);
    this.tmpLook.lerpVectors(this.tmpCanopyLook, this.tmpMidLook, lookA);
    this.tmpLook.lerp(this.tmpEndLook, lookB);

    camera.position.copy(this.tmpPos);
    camera.position.y = Math.max(0.35, camera.position.y);

    const upBlend = smoothstep(0.05, 0.42, t);
    this.tmpUp.set(0, upBlend, -(1 - upBlend)).normalize();
    camera.up.copy(this.tmpUp);
    camera.lookAt(this.tmpLook);

    camera.fov = THREE.MathUtils.lerp(
      cfg.startFov,
      cfg.endFov,
      smoothstep(0.1, 0.95, t)
    );
    camera.updateProjectionMatrix();

    this.syncVeilDuringSpiral(rawT * motionDuration);

    if (rawT >= 1) {
      this.active = false;
      this.armed = false;
      this.finishVisuals();
      camera.up.set(0, 1, 0);
      camera.position.copy(this.tmpEndPos);
      camera.lookAt(this.tmpEndLook);
      camera.fov = this.baseFov ?? cfg.endFov;
      camera.updateProjectionMatrix();
      return false;
    }
    return true;
  }

  applyStartFrame(camera: THREE.PerspectiveCamera): void {
    const cfg = METAVERSE_INTRO_CAMERA;
    this.baseFov = camera.fov;
    this.applyNadirPose(camera, cfg.startHeight, cfg.startFov);
    if (this.armed && !this.active) {
      this.armElapsed += 1 / 60;
      this.syncVeilDuringArm(this.armElapsed);
    }
  }

  /** Appelé depuis camera update avec vrai delta pendant l’armement. */
  tickArmed(deltaSeconds: number, camera: THREE.PerspectiveCamera): void {
    if (!this.armed || this.active) return;
    this.armElapsed += Math.max(0, deltaSeconds);
    this.applyNadirPose(camera, METAVERSE_INTRO_CAMERA.startHeight, METAVERSE_INTRO_CAMERA.startFov);
    this.syncVeilDuringArm(this.armElapsed);
  }

  private applyNadirPose(
    camera: THREE.PerspectiveCamera,
    y: number,
    fov: number
  ): void {
    const cfg = METAVERSE_INTRO_CAMERA;
    camera.position.set(cfg.centerX, y, cfg.centerZ);
    camera.up.set(0, 0, -1);
    camera.lookAt(cfg.centerX, cfg.lookAtCanopyY, cfg.centerZ);
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }

  private syncVeilDuringArm(armElapsed: number): void {
    const enter = Math.max(0.05, METAVERSE_INTRO_CAMERA.veilEnterSeconds);
    const a = easeOutCubic(Math.min(1, armElapsed / enter));
    this.veilOpacity.set(a * METAVERSE_INTRO_CAMERA.holdVeilOpacity);
    this.veilPhase.set('armed');
  }

  private syncVeilDuringSpiral(spiralElapsed: number): void {
    const reveal = Math.max(0.05, METAVERSE_INTRO_CAMERA.veilRevealSeconds);
    const fade = 1 - easeOutCubic(Math.min(1, spiralElapsed / reveal));
    this.veilOpacity.set(METAVERSE_INTRO_CAMERA.holdVeilOpacity * fade);
    if (fade <= 0.02) {
      this.veilPhase.set('hidden');
      this.veilOpacity.set(0);
    } else {
      this.veilPhase.set('revealing');
    }
  }

  private finishVisuals(): void {
    this.veilPhase.set('hidden');
    this.veilOpacity.set(0);
  }

  private computeEndPose(
    charPos: THREE.Vector3,
    orbit: MetaverseIntroEndOrbit,
    outPos: THREE.Vector3,
    outLook: THREE.Vector3
  ): void {
    const dist = orbit.distance;
    const cosY = Math.cos(orbit.pitch);
    const sinY = Math.sin(orbit.pitch);
    const sinX = Math.sin(orbit.yaw);
    const cosX = Math.cos(orbit.yaw);
    const shoulder = 0.28;
    const lookY = orbit.arenaPeek ? 1.05 : 2.1;
    const camY = orbit.arenaPeek
      ? charPos.y + 1.85 + sinY * dist * 0.42
      : charPos.y + 2.35 + sinY * dist * 0.28;

    outPos.set(
      charPos.x + sinX * cosY * dist + cosX * shoulder,
      Math.max(0.35, camY),
      charPos.z + cosX * cosY * dist - sinX * shoulder
    );
    outLook.set(
      charPos.x - sinX * orbit.lookAhead,
      charPos.y + lookY,
      charPos.z - cosX * orbit.lookAhead
    );
  }
}
