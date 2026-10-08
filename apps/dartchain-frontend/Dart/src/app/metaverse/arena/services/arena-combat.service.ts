import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import * as THREE from 'three';

import { CharacterNftService } from '@metaverse/services/character-nft.service';
import { CameraControlService } from '@metaverse/services/camera-control.service';
import { ThreeSceneService } from '@metaverse/services/three-scene.service';
import { ProductConfigService } from '@core/config/product-config.service';

import { DEFAULT_ARENA_BALANCE_CONFIG } from '../models/game-balance.config';
import { ArenaSessionService } from './arena-session.service';
import { ArenaEconomyMockService } from './arena-economy.mock.service';
import { ArenaFxService } from './arena-fx.service';
import { ArenaAudioService } from './arena-audio.service';
import { ArenaMetaService } from './arena-meta.service';
import { ArenaTelemetryService } from './arena-telemetry.service';
import { ArenaTransportHybridService } from './arena-transport.hybrid.service';
import {
  createArcadeBlasterGroup,
  disposeArcadeBlaster,
} from '../weapons/arcade-blaster.factory';
import {
  isInsideMirrorSpawnSafeZone,
  MIRROR_SPAWN_SAFE_ZONE,
} from '@world-map/map-configuration';

const BOT_DAMAGE = 14;
const LOCK_CONE_DOT = 0.22;
/** Fuchsia local player — lisible vs bots / peers atténués. */
const ARENA_LOCAL_FUCHSIA = 0x8a95a5;
const ARENA_LOCAL_FUCHSIA_EMISSIVE = 0x7b0d1e;
const ARENA_LOCAL_BODY = 0xede7d9;
const ARENA_LOCAL_BODY_EMISSIVE = 0x0d0630;

interface BotAi {
  strafeDir: number;
  strafeT: number;
  nextFireAt: number;
  coverBias: number;
  home: { x: number; z: number };
}

/**
 * Combat Éliminer pour gagner — FX punchy, lock-on, bots IA, loot streak.
 */
@Injectable({ providedIn: 'root' })
export class ArenaCombatService implements OnDestroy {
  private readonly product = inject(ProductConfigService);
  private readonly session = inject(ArenaSessionService);
  private readonly economy = inject(ArenaEconomyMockService);
  private readonly threeScene = inject(ThreeSceneService);
  private readonly characterNft = inject(CharacterNftService);
  private readonly cameraControl = inject(CameraControlService);
  private readonly fx = inject(ArenaFxService);
  private readonly audio = inject(ArenaAudioService);
  private readonly meta = inject(ArenaMetaService);
  private readonly telemetry = inject(ArenaTelemetryService);
  private readonly transport = inject(ArenaTransportHybridService);

  private blaster: THREE.Group | null = null;
  private botRoots = new Map<string, THREE.Group>();
  private botAi = new Map<string, BotAi>();
  private powerMeshes = new Map<string, THREE.Mesh>();
  private lastFireMs = 0;
  private lastModeEpoch = -1;
  private keyHandler?: (event: KeyboardEvent) => void;
  private canvasTapHandler?: (event: PointerEvent) => void;
  private visibilityHandler?: () => void;
  private lastTapMs = 0;
  private powerSeeded = false;
  private blasterRecoil = 0;
  private botAnimT = 0;
  private fpsAccum = 0;
  private fpsFrames = 0;
  private shadowsDimmed = false;
  private characterTinted = false;
  private safeZoneRing: THREE.Object3D | null = null;
  private readonly dancePadMats: THREE.MeshBasicMaterial[] = [];
  private dancePadBeatT = 0;
  private readonly tmpFrom = new THREE.Vector3();
  private readonly tmpTo = new THREE.Vector3();
  private readonly tmpFwd = new THREE.Vector3();

  private readonly hitFlashSignal = signal(false);
  private readonly lastShotSignal = signal<'miss' | 'hit' | 'kill' | null>(null);
  private readonly lockedTargetSignal = signal<string | null>(null);
  private readonly minimapDotsSignal = signal<
    Array<{ id: string; nx: number; nz: number; self?: boolean; power?: boolean; peer?: boolean }>
  >([]);

  readonly hitFlash = this.hitFlashSignal.asReadonly();
  readonly lastShot = this.lastShotSignal.asReadonly();
  readonly lockedTarget = this.lockedTargetSignal.asReadonly();
  readonly minimapDots = this.minimapDotsSignal.asReadonly();
  readonly screenFlash = this.fx.screenFlash;

  ngOnDestroy(): void {
    this.teardown();
  }

  ensureAttached(): void {
    if (!this.product.metaverseArenaEnabled) return;

    const scene = this.threeScene.getScene();
    // Cercle SPAWN visible dès l’intro (nadir) — pas seulement en phase playing.
    if (scene) {
      this.ensureSafeZoneRing(scene);
    }

    if (this.session.phase() !== 'playing') {
      this.cameraControl.setArenaPeekMode(false);
      this.clearBotsVisual();
      this.clearPowerMeshes();
      this.fx.dispose();
      this.powerSeeded = false;
      this.restoreShadows();
      this.restoreLocalCharacterTint();
      return;
    }

    if (!scene) return;

    this.fx.attach(scene);
    this.cameraControl.setArenaPeekMode(true);
    this.dimShadowsForCombat();
    this.bindKeys();
    this.bindCanvasDoubleTap();
    this.bindVisibilityPause();

    if (!this.blaster) {
      this.blaster = createArcadeBlasterGroup();
      this.blaster.position.set(0.28, 1.05, 0.35);
      const root = this.characterNft.getCharacterMesh();
      if (root) root.add(this.blaster);
      else scene.add(this.blaster);
    }
    this.applyBlasterSkin();
    this.applyLocalCharacterTint();

    const player = this.characterNft.getCharacterMesh();
    if (player && !this.powerSeeded) {
      this.meta.seedPowerUps({ x: player.position.x, z: player.position.z });
      this.telemetry.resetSession();
      this.powerSeeded = true;
    }

    this.syncBotMeshes(scene);
    this.syncPowerMeshes(scene);
  }

  update(deltaSeconds: number): void {
    if (!this.product.metaverseArenaEnabled) return;

    // Intro + idle : garder le plateau SAFE animé et complet.
    const sceneEarly = this.threeScene.getScene();
    if (sceneEarly) {
      this.ensureSafeZoneRing(sceneEarly);
      this.animateDancePad(deltaSeconds);
    }

    if (this.session.phase() !== 'playing') return;
    if (this.meta.paused()) return;
    if (this.meta.isFrozen()) {
      this.fx.update(deltaSeconds);
      return;
    }

    this.ensureAttached();
    this.syncModeRebuild();
    this.publishPoseThrottled();
    this.botAnimT += deltaSeconds;
    this.animateBots(deltaSeconds);
    this.fx.update(deltaSeconds);
    this.updateAimLock();
    this.updateMinimap();
    this.tickBotFire();
    this.tickPowerPickup();
    this.applyBlasterSkin();
    this.applyLocalCharacterTint();
    this.tickBlasterRecoil(deltaSeconds);
    this.tickFps(deltaSeconds);

    const player = this.characterNft.getCharacterMesh();
    if (player) {
      this.meta.maybeRespawnPowerUp({ x: player.position.x, z: player.position.z });
    }

    if (
      this.meta.killCamUntil() > 0 &&
      performance.now() > this.meta.killCamUntil()
    ) {
      this.meta.clearKillCam();
    }
  }

  private lastPosePublishMs = 0;

  private syncModeRebuild(): void {
    const epoch = this.meta.modeEpoch();
    if (epoch === this.lastModeEpoch) return;
    this.lastModeEpoch = epoch;
    this.transport.rebuildBotsForMode(this.meta.mode());
    this.clearBotsVisual();
    this.botAi.clear();
  }

  private publishPoseThrottled(): void {
    const now = performance.now();
    if (now - this.lastPosePublishMs < 100) return;
    this.lastPosePublishMs = now;
    const mesh = this.characterNft.getCharacterMesh();
    if (!mesh) return;
    this.session.publishLocalPose(
      { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z },
      mesh.rotation.y
    );
  }

  tryFire(): void {
    if (this.meta.paused() || this.meta.isFrozen()) return;
    if (this.session.phase() !== 'playing') return;
    if (!this.meta.ageOk()) return;
    const local = this.session.localPlayer();
    if (!local || local.status !== 'alive') return;

    const now = performance.now();
    if (now - this.lastFireMs < DEFAULT_ARENA_BALANCE_CONFIG.fireCooldownMs) {
      return;
    }
    this.lastFireMs = now;
    this.blasterRecoil = 1;
    this.cameraControl.applyCombatKick(
      (Math.random() - 0.5) * 0.04,
      -0.025 - Math.random() * 0.015
    );

    const muzzle = this.getMuzzleWorld();
    const victimId = this.resolveFireTarget(true);
    this.audio.play('fire');

    if (!victimId) {
      const cam = this.threeScene.getCamera();
      const dir = this.tmpFwd;
      if (cam) cam.getWorldDirection(dir);
      else dir.set(0, 0, -1);
      this.tmpTo.copy(muzzle).addScaledVector(dir, 9);
      this.fx.spawnMuzzle(muzzle);
      this.fx.spawnBeam(muzzle, this.tmpTo, false);
      this.pulseHitFlash(false);
      this.lastShotSignal.set('miss');
      this.telemetry.recordShot('miss');
      return;
    }

    const victim = this.economy.getState(victimId);
    const botMesh = this.botRoots.get(victimId);
    if (!victim || victim.status !== 'alive' || !botMesh) {
      this.lastShotSignal.set('miss');
      this.telemetry.recordShot('miss');
      return;
    }

    this.tmpTo.set(botMesh.position.x, 1.25, botMesh.position.z);
    this.fx.spawnMuzzle(muzzle);
    this.fx.spawnBeam(muzzle, this.tmpTo, true);
    this.fx.spawnHitSparks(this.tmpTo);
    this.softAimAt(botMesh.position);

    const dmg = DEFAULT_ARENA_BALANCE_CONFIG.hitscanDamage;
    const nextHealth = Math.max(0, victim.health - dmg);
    this.economy.upsert({ ...victim, health: nextHealth });
    this.pulseHitFlash(true);
    this.flashBot(victimId, nextHealth <= 0);

    if (nextHealth <= 0) {
      this.lastShotSignal.set('kill');
      this.audio.play('kill');
      this.fx.spawnKillBurst(this.tmpTo);
      this.telemetry.recordShot('kill');
      void this.session.reportElimination(victimId).then((result) => {
        if (result?.accepted && result.lootAmount > 0) {
          this.audio.play('earn');
        }
        this.session.refreshLocalFromEconomy();
        if (this.meta.mode() === 'horde') {
          this.meta.bumpWave();
        }
      });
    } else {
      this.lastShotSignal.set('hit');
      this.audio.play('hit');
      this.telemetry.recordShot('hit');
    }
  }

  private softAimAt(target: THREE.Vector3): void {
    const player = this.characterNft.getCharacterMesh();
    if (!player) return;
    this.cameraControl.softAimYawToward(
      target.x - player.position.x,
      target.z - player.position.z,
      0.22
    );
  }

  private resolveFireTarget(hard: boolean): string | null {
    const camera = this.threeScene.getCamera();
    const player = this.characterNft.getCharacterMesh();
    const targets = [...this.botRoots.entries()].filter(([, g]) => g.visible);

    if (camera && targets.length) {
      const origin = this.tmpFrom;
      camera.getWorldPosition(origin);
      const direction = this.tmpFwd;
      camera.getWorldDirection(direction);
      const ray = new THREE.Raycaster(origin, direction.normalize(), 0.2, 90);
      const meshes: THREE.Object3D[] = [];
      for (const [, g] of targets) g.traverse((o) => meshes.push(o));
      const hits = ray.intersectObjects(meshes, false);
      if (hits.length) {
        for (const [id, g] of targets) {
          let cur: THREE.Object3D | null = hits[0].object;
          while (cur) {
            if (cur === g) return id;
            cur = cur.parent;
          }
        }
      }
    }

    const originPos = player
      ? player.position.clone()
      : new THREE.Vector3(0, 0, 5);
    const forward = this.tmpFwd.set(0, 0, -1);
    if (player) {
      forward.applyQuaternion(player.quaternion);
      forward.y = 0;
      forward.normalize();
    } else if (camera) {
      camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
    }

    let bestCone: { id: string; score: number } | null = null;
    let bestNear: { id: string; dist: number } | null = null;

    for (const [id, g] of targets) {
      const to = new THREE.Vector3().subVectors(g.position, originPos);
      to.y = 0;
      const dist = to.length();
      if (dist < 0.4 || dist > 24) continue;
      to.normalize();
      const dot = forward.dot(to);
      if (dot > LOCK_CONE_DOT) {
        const score = dot * 10 - dist * 0.04;
        if (!bestCone || score > bestCone.score) bestCone = { id, score };
      }
      if (!bestNear || dist < bestNear.dist) bestNear = { id, dist };
    }

    if (bestCone) return bestCone.id;
    if (hard) return bestNear?.id ?? null;
    return bestNear && bestNear.dist < 16 ? bestNear.id : null;
  }

  private updateAimLock(): void {
    const id = this.resolveFireTarget(false);
    this.lockedTargetSignal.set(id);
    for (const [botId, root] of this.botRoots) {
      const locked = botId === id;
      root.traverse((obj) => {
        if (
          obj instanceof THREE.Mesh &&
          obj.material instanceof THREE.MeshStandardMaterial
        ) {
          // Base atténuée ; lock = léger boost seulement.
          obj.material.emissiveIntensity = locked ? 0.55 : 0.22;
        }
        if (
          obj instanceof THREE.Mesh &&
          obj.material instanceof THREE.MeshBasicMaterial &&
          obj.geometry.type === 'RingGeometry'
        ) {
          obj.material.color.setHex(locked ? 0x7b0d1e : 0x7b0d1e);
          obj.material.opacity = locked ? 0.55 : 0.35;
        }
      });
    }
  }

  /** Mesh peer WS — bleu atténué, distinct du fuchsia local. */
  private createPeerVisual(label: string): THREE.Group {
    const root = new THREE.Group();
    root.name = `arena-peer-${label}`;

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x18314f,
      emissive: 0x0d0630,
      emissiveIntensity: 0.22,
      roughness: 0.7,
      metalness: 0.12,
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: 0x8a95a5,
      emissive: 0x0d0630,
      emissiveIntensity: 0.28,
      roughness: 0.55,
    });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.1, 0.45), bodyMat);
    body.position.y = 0.85;
    root.add(body);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.4, 0.4), bodyMat);
    head.position.y = 1.6;
    root.add(head);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.08), accentMat);
    visor.position.set(0, 1.62, 0.22);
    root.add(visor);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.72, 24),
      new THREE.MeshBasicMaterial({
        color: 0x18314f,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.04;
    root.add(ring);

    root.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.castShadow = false;
        obj.receiveShadow = false;
      }
    });
    return root;
  }

  private getMuzzleWorld(): THREE.Vector3 {
    if (this.blaster) {
      this.tmpFrom.set(0, 0.06, -0.48);
      this.blaster.localToWorld(this.tmpFrom);
      return this.tmpFrom.clone();
    }
    const cam = this.threeScene.getCamera();
    if (cam) {
      cam.getWorldPosition(this.tmpFrom);
      return this.tmpFrom.clone();
    }
    return new THREE.Vector3(0, 1.2, 5);
  }

  private tickBotFire(): void {
    const now = performance.now();
    const local = this.session.localPlayer();
    const player = this.characterNft.getCharacterMesh();
    if (!local || local.status !== 'alive' || !player) return;
    if (local.spawnShieldUntil && Date.parse(local.spawnShieldUntil) > Date.now()) {
      return;
    }
    // Zone SPAWN SAFE ombrière — pas de dégâts / tirs bots.
    if (isInsideMirrorSpawnSafeZone(player.position.x, player.position.z)) {
      return;
    }

    const mode = this.meta.mode();
    const wave = this.meta.wave();

    for (const [botId, botRoot] of this.botRoots) {
      if (!botRoot.visible || !botId.startsWith('bot-')) continue;
      let ai = this.botAi.get(botId);
      if (!ai) {
        ai = this.createAi(botRoot.position.x, botRoot.position.z, mode, wave);
        this.botAi.set(botId, ai);
      }
      if (now < ai.nextFireAt) continue;

      const dist = botRoot.position.distanceTo(player.position);
      if (dist > 16) {
        ai.nextFireAt = now + 600 + Math.random() * 400;
        continue;
      }

      const baseInterval =
        mode === 'horde'
          ? 1100 - Math.min(400, wave * 40)
          : mode === 'duel-bots'
            ? 1600
            : 1750;
      ai.nextFireAt = now + baseInterval + Math.random() * 500;

      this.tmpFrom.set(botRoot.position.x, 1.3, botRoot.position.z);
      this.tmpTo.set(player.position.x, 1.2, player.position.z);
      this.fx.spawnBeam(this.tmpFrom, this.tmpTo, true);
      this.fx.spawnHitSparks(this.tmpTo);
      this.audio.play('hurt');
      this.cameraControl.applyCombatKick((Math.random() - 0.5) * 0.06, 0.02);

      const nextHp = Math.max(0, local.health - BOT_DAMAGE);
      this.economy.upsert({ ...local, health: nextHp });
      this.session.refreshLocalFromEconomy();
      this.pulseHitFlash(true);

      if (nextHp <= 0) {
        const bot = this.economy.getState(botId);
        this.meta.registerDeath(local.displayName);
        this.telemetry.recordDeath();
        this.session.markLocalEliminated(bot?.displayName ?? 'Bot', 0);
        break;
      }
    }
  }

  private createAi(
    x: number,
    z: number,
    mode: string,
    wave: number
  ): BotAi {
    const home = this.pointOutsideSpawnSafe(x, z);
    return {
      strafeDir: Math.random() > 0.5 ? 1 : -1,
      strafeT: Math.random() * Math.PI * 2,
      nextFireAt:
        performance.now() +
        (mode === 'horde' ? 700 : 1200) +
        Math.random() * 800 -
        Math.min(300, wave * 20),
      coverBias: 0.4 + Math.random() * 0.5,
      home,
    };
  }

  private tickPowerPickup(): void {
    const player = this.characterNft.getCharacterMesh();
    if (!player) return;
    const picked = this.meta.tryPickup(player.position.x, player.position.z);
    if (!picked) return;
    this.audio.play('power');
    const local = this.session.localPlayer();
    if (!local) return;
    if (picked.kind === 'shield') {
      this.economy.upsert({
        ...local,
        spawnShieldUntil: new Date(Date.now() + 3500).toISOString(),
      });
      this.session.refreshLocalFromEconomy();
    }
  }

  private tickBlasterRecoil(dt: number): void {
    if (!this.blaster || this.blasterRecoil <= 0) return;
    this.blasterRecoil = Math.max(0, this.blasterRecoil - dt * 9);
    const kick = this.blasterRecoil * 0.14;
    this.blaster.position.z = 0.35 + kick;
    this.blaster.rotation.x = -kick * 0.9;
  }

  private tickFps(dt: number): void {
    this.fpsAccum += dt;
    this.fpsFrames += 1;
    if (this.fpsAccum >= 1) {
      this.telemetry.setFps(this.fpsFrames / this.fpsAccum);
      this.fpsAccum = 0;
      this.fpsFrames = 0;
    }
  }

  private updateMinimap(): void {
    const player = this.characterNft.getCharacterMesh();
    if (!player) {
      this.minimapDotsSignal.set([]);
      return;
    }
    const scale = 12;
    const dots: Array<{
      id: string;
      nx: number;
      nz: number;
      self?: boolean;
      power?: boolean;
      peer?: boolean;
    }> = [{ id: 'self', nx: 0.5, nz: 0.72, self: true }];
    for (const [id, root] of this.botRoots) {
      if (!root.visible) continue;
      const dx = (root.position.x - player.position.x) / scale;
      const dz = (root.position.z - player.position.z) / scale;
      dots.push({
        id,
        nx: THREE.MathUtils.clamp(0.5 + dx * 0.45, 0.08, 0.92),
        nz: THREE.MathUtils.clamp(0.72 + dz * 0.45, 0.08, 0.92),
        peer: !id.startsWith('bot-'),
      });
    }
    for (const pu of this.meta.powerUps()) {
      const dx = (pu.x - player.position.x) / scale;
      const dz = (pu.z - player.position.z) / scale;
      dots.push({
        id: pu.id,
        nx: THREE.MathUtils.clamp(0.5 + dx * 0.45, 0.08, 0.92),
        nz: THREE.MathUtils.clamp(0.72 + dz * 0.45, 0.08, 0.92),
        power: true,
      });
    }
    this.minimapDotsSignal.set(dots);
  }

  teardown(): void {
    if (this.keyHandler) {
      window.removeEventListener('keydown', this.keyHandler);
      this.keyHandler = undefined;
    }
    this.unbindCanvasDoubleTap();
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = undefined;
    }
    this.cameraControl.setArenaPeekMode(false);
    this.restoreShadows();
    this.restoreLocalCharacterTint();
    disposeArcadeBlaster(this.blaster);
    this.blaster?.removeFromParent();
    this.blaster = null;
    this.clearBotsVisual();
    this.clearPowerMeshes();
    this.clearSafeZoneRing();
    this.fx.dispose();
    this.powerSeeded = false;
  }

  private bindKeys(): void {
    if (this.keyHandler) return;
    this.keyHandler = (event: KeyboardEvent) => {
      if (event.code === 'Space' || event.code === 'KeyF') {
        if (event.repeat) return;
        const tag = (event.target as HTMLElement | null)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        event.preventDefault();
        this.tryFire();
      }
      if (event.code === 'KeyP' && !event.repeat) {
        this.meta.setPaused(!this.meta.paused());
      }
      if (event.code === 'KeyM' && !event.repeat) {
        this.audio.toggleMute();
      }
    };
    window.addEventListener('keydown', this.keyHandler);
  }

  private bindCanvasDoubleTap(): void {
    if (this.canvasTapHandler) return;
    const canvas = this.threeScene.getRenderer()?.domElement;
    if (!canvas) return;
    this.canvasTapHandler = () => {
      if (this.session.phase() !== 'playing') return;
      const now = performance.now();
      if (now - this.lastTapMs < 320) {
        this.tryFire();
        this.lastTapMs = 0;
      } else {
        this.lastTapMs = now;
      }
    };
    canvas.addEventListener('pointerdown', this.canvasTapHandler);
  }

  private unbindCanvasDoubleTap(): void {
    const canvas = this.threeScene.getRenderer()?.domElement;
    if (canvas && this.canvasTapHandler) {
      canvas.removeEventListener('pointerdown', this.canvasTapHandler);
    }
    this.canvasTapHandler = undefined;
  }

  private bindVisibilityPause(): void {
    if (this.visibilityHandler) return;
    this.visibilityHandler = () => {
      if (document.hidden) this.meta.setPaused(true);
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  private dimShadowsForCombat(): void {
    if (this.shadowsDimmed) return;
    const renderer = this.threeScene.getRenderer();
    if (renderer) {
      renderer.shadowMap.enabled = false;
      this.shadowsDimmed = true;
    }
  }

  private restoreShadows(): void {
    if (!this.shadowsDimmed) return;
    const renderer = this.threeScene.getRenderer();
    if (renderer) renderer.shadowMap.enabled = false;
    this.shadowsDimmed = false;
  }

  private applyBlasterSkin(): void {
    if (!this.blaster) return;
    const skin = this.meta.skin();
    // Accents blaster un cran plus doux que le fuchsia corps.
    const accent =
      skin === 'r4v3' ? 0x7b0d1e : skin === 'pxd' ? 0x09814a : 0x7b0d1e;
    const emissive =
      skin === 'r4v3' ? 0x7b0d1e : skin === 'pxd' ? 0x18314f : 0x7b0d1e;
    this.blaster.traverse((obj) => {
      if (
        obj instanceof THREE.Mesh &&
        obj.material instanceof THREE.MeshStandardMaterial &&
        obj.material.emissiveIntensity > 0.2
      ) {
        obj.material.color.setHex(accent);
        obj.material.emissive.setHex(emissive);
        obj.material.emissiveIntensity = 0.4;
      }
    });
  }

  /** Corps local en fuchsia fort ; restauré hors phase playing. */
  private applyLocalCharacterTint(): void {
    const mesh = this.characterNft.getCharacterMesh();
    if (!mesh) return;
    mesh.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      if (this.blaster && this.isUnder(obj, this.blaster)) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const mat of mats) {
        if (!(mat instanceof THREE.MeshStandardMaterial)) continue;
        mat.color.setHex(ARENA_LOCAL_FUCHSIA);
        mat.emissive.setHex(ARENA_LOCAL_FUCHSIA_EMISSIVE);
        mat.emissiveIntensity = 0.72;
        mat.roughness = 0.42;
        mat.metalness = 0.14;
      }
    });
    this.characterTinted = true;
  }

  private restoreLocalCharacterTint(): void {
    if (!this.characterTinted) return;
    const mesh = this.characterNft.getCharacterMesh();
    mesh?.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      if (this.blaster && this.isUnder(obj, this.blaster)) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const mat of mats) {
        if (!(mat instanceof THREE.MeshStandardMaterial)) continue;
        mat.color.setHex(ARENA_LOCAL_BODY);
        mat.emissive.setHex(ARENA_LOCAL_BODY_EMISSIVE);
        mat.emissiveIntensity = 0.14;
        mat.roughness = 0.68;
        mat.metalness = 0.08;
      }
    });
    this.characterTinted = false;
  }

  private isUnder(obj: THREE.Object3D, ancestor: THREE.Object3D): boolean {
    let p: THREE.Object3D | null = obj;
    while (p) {
      if (p === ancestor) return true;
      p = p.parent;
    }
    return false;
  }

  /** Pousse un point hors de la zone safe miroir (vers −Z si besoin). */
  private pointOutsideSpawnSafe(x: number, z: number): { x: number; z: number } {
    if (!isInsideMirrorSpawnSafeZone(x, z)) return { x, z };
    const cx = MIRROR_SPAWN_SAFE_ZONE.centerX;
    const cz = MIRROR_SPAWN_SAFE_ZONE.centerZ;
    let dx = x - cx;
    let dz = z - cz;
    const len = Math.hypot(dx, dz);
    const edge = MIRROR_SPAWN_SAFE_ZONE.radiusMeters + 1.5;
    if (len < 0.05) {
      // Défaut : vers Canebière (−Z).
      return { x: cx, z: cz - edge };
    }
    const s = edge / len;
    return { x: cx + dx * s, z: cz + dz * s };
  }

  private ensureSafeZoneRing(scene: THREE.Scene): void {
    if (this.safeZoneRing) return;
    const r = MIRROR_SPAWN_SAFE_ZONE.radiusMeters;
    const fillColor = MIRROR_SPAWN_SAFE_ZONE.fillColor;
    const ringColor = MIRROR_SPAWN_SAFE_ZONE.ringColor;
    const accent = MIRROR_SPAWN_SAFE_ZONE.accentColor;
    const padDim = MIRROR_SPAWN_SAFE_ZONE.padDimColor;

    const group = new THREE.Group();
    group.name = 'arena-mirror-safe-zone';

    const flat = (mesh: THREE.Mesh, y: number): void => {
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = y;
      mesh.renderOrder = 6;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.depthWrite = false;
      mat.depthTest = true;
      mat.polygonOffset = true;
      mat.polygonOffsetFactor = -2;
      mat.polygonOffsetUnits = -2;
    };

    // Dallage PCB holographique — disque complet (lisible depuis intro nadir).
    const pcbTex = this.createHoloPcbFloorTexture();
    const pcb = new THREE.Mesh(
      new THREE.CircleGeometry(r - 0.05, 96),
      new THREE.MeshBasicMaterial({
        map: pcbTex,
        color: 0xede7d9,
        transparent: true,
        opacity: 0.88,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    flat(pcb, 0.07);
    group.add(pcb);

    // Teinte fuchsia SAFE sous le PCB.
    const fill = new THREE.Mesh(
      new THREE.CircleGeometry(r - 0.02, 96),
      new THREE.MeshBasicMaterial({
        color: fillColor,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    flat(fill, 0.055);
    group.add(fill);

    // Pads dance animés — remplissage jusqu’au bord (pas de trou).
    this.dancePadMats.length = 0;
    const padGeo = new THREE.PlaneGeometry(1.55, 1.55);
    const cols = 9;
    const step = (r * 1.72) / cols;
    const r2 = (r - 0.35) * (r - 0.35);
    for (let iz = 0; iz < cols; iz++) {
      for (let ix = 0; ix < cols; ix++) {
        const x = (ix - (cols - 1) / 2) * step;
        const z = (iz - (cols - 1) / 2) * step;
        if (x * x + z * z > r2) continue;
        const mat = new THREE.MeshBasicMaterial({
          color: padDim,
          transparent: true,
          opacity: 0.2,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const pad = new THREE.Mesh(padGeo, mat);
        flat(pad, 0.085);
        pad.position.x = x;
        pad.position.z = z;
        group.add(pad);
        this.dancePadMats.push(mat);
      }
    }

    // Anneau extérieur CONTINU — bien visible depuis l’intro (segments élevés).
    const outer = new THREE.Mesh(
      new THREE.RingGeometry(r - 0.55, r + 0.08, 128),
      new THREE.MeshBasicMaterial({
        color: ringColor,
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    flat(outer, 0.1);
    group.add(outer);

    // Halo externe pour éviter les “parties manquantes” en plongée.
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(r + 0.08, r + 0.55, 128),
      new THREE.MeshBasicMaterial({
        color: accent,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    flat(halo, 0.095);
    group.add(halo);

    const inner = new THREE.Mesh(
      new THREE.RingGeometry(r - 1.15, r - 0.7, 96),
      new THREE.MeshBasicMaterial({
        color: accent,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    flat(inner, 0.09);
    group.add(inner);

    group.position.set(
      MIRROR_SPAWN_SAFE_ZONE.centerX,
      0,
      MIRROR_SPAWN_SAFE_ZONE.centerZ
    );
    group.userData['sharedPadGeo'] = padGeo;
    scene.add(group);
    this.safeZoneRing = group;
  }

  /** Sol spawn — PCB holographique fuchsia / cyan (circuit dance floor). */
  private createHoloPcbFloorTexture(): THREE.CanvasTexture {
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0a1220';
      ctx.fillRect(0, 0, size, size);

      // Traces PCB.
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let i = 0; i < 48; i++) {
        const y = 24 + i * 20;
        ctx.strokeStyle =
          i % 3 === 0
            ? 'rgba(123, 13, 30, 0.55)'
            : i % 3 === 1
              ? 'rgba(139, 157, 173, 0.35)'
              : 'rgba(123, 13, 30, 0.4)';
        ctx.lineWidth = i % 5 === 0 ? 3.5 : 1.6;
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x <= size; x += 32) {
          const bump = ((i * 17 + x * 3) % 24) - 12;
          ctx.lineTo(x, y + bump);
        }
        ctx.stroke();
      }
      for (let i = 0; i < 40; i++) {
        const x = 30 + i * 25;
        ctx.strokeStyle =
          i % 2 === 0 ? 'rgba(123, 13, 30, 0.45)' : 'rgba(139, 157, 173, 0.28)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + ((i * 13) % 40) - 20, size);
        ctx.stroke();
      }

      // Pads / vias holographiques.
      for (let row = 0; row < 16; row++) {
        for (let col = 0; col < 16; col++) {
          if ((row + col) % 2 !== 0) continue;
          const cx = 32 + col * 64;
          const cy = 32 + row * 64;
          ctx.fillStyle = 'rgba(123, 13, 30, 0.22)';
          ctx.fillRect(cx - 18, cy - 18, 36, 36);
          ctx.strokeStyle = 'rgba(237, 231, 217, 0.7)';
          ctx.lineWidth = 2;
          ctx.strokeRect(cx - 18, cy - 18, 36, 36);
          ctx.beginPath();
          ctx.fillStyle = 'rgba(139, 157, 173, 0.65)';
          ctx.arc(cx, cy, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Flèches dance pad.
      const drawArrow = (cx: number, cy: number, rot: number): void => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);
        ctx.fillStyle = 'rgba(123, 13, 30, 0.85)';
        ctx.beginPath();
        ctx.moveTo(0, -40);
        ctx.lineTo(28, 14);
        ctx.lineTo(10, 14);
        ctx.lineTo(10, 40);
        ctx.lineTo(-10, 40);
        ctx.lineTo(-10, 14);
        ctx.lineTo(-28, 14);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      };
      drawArrow(512, 280, 0);
      drawArrow(512, 744, Math.PI);
      drawArrow(280, 512, -Math.PI / 2);
      drawArrow(744, 512, Math.PI / 2);

      // Masque circulaire soft.
      const mask = ctx.createRadialGradient(512, 512, 120, 512, 512, 500);
      mask.addColorStop(0, 'rgba(10, 18, 32,0)');
      mask.addColorStop(0.82, 'rgba(10, 18, 32,0)');
      mask.addColorStop(1, 'rgba(10, 18, 32,0.55)');
      ctx.fillStyle = mask;
      ctx.fillRect(0, 0, size, size);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    return tex;
  }

  /** Beat dance-pad — cases qui s’allument en combo (arcade). */
  private animateDancePad(deltaSeconds: number): void {
    if (!this.dancePadMats.length) return;
    this.dancePadBeatT += deltaSeconds;
    const bpm = 128;
    const beat = this.dancePadBeatT * (bpm / 60);
    const step = Math.floor(beat * 2) % this.dancePadMats.length;
    const pulse = 0.5 + 0.5 * Math.sin(beat * Math.PI * 2);
    const lit = MIRROR_SPAWN_SAFE_ZONE.padLitColor;
    const dim = MIRROR_SPAWN_SAFE_ZONE.padDimColor;

    for (let i = 0; i < this.dancePadMats.length; i++) {
      const mat = this.dancePadMats[i];
      // Pattern combo : colonne / diagonale qui court.
      const combo =
        i === step ||
        (i + step) % 5 === 0 ||
        Math.abs(i - step) === 7;
      if (combo) {
        mat.color.setHex(lit);
        mat.opacity = 0.35 + pulse * 0.45;
      } else {
        mat.color.setHex(dim);
        mat.opacity = 0.12 + pulse * 0.06;
      }
    }
  }

  private clearSafeZoneRing(): void {
    if (!this.safeZoneRing) return;
    const sharedGeo = this.safeZoneRing.userData['sharedPadGeo'] as
      | THREE.BufferGeometry
      | undefined;
    this.safeZoneRing.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (mesh.geometry && mesh.geometry !== sharedGeo) {
        mesh.geometry.dispose();
      }
      const mat = mesh.material;
      const disposeMat = (m: THREE.Material): void => {
        const mapped = m as THREE.MeshBasicMaterial;
        if (mapped.map) mapped.map.dispose();
        m.dispose();
      };
      if (Array.isArray(mat)) mat.forEach(disposeMat);
      else if (mat) disposeMat(mat);
    });
    sharedGeo?.dispose();
    this.safeZoneRing.removeFromParent();
    this.safeZoneRing = null;
    this.dancePadMats.length = 0;
    this.dancePadBeatT = 0;
  }

  private syncBotMeshes(scene: THREE.Scene): void {
    const remotes = this.session.remotePlayers();
    const player = this.characterNft.getCharacterMesh();
    const mode = this.meta.mode();
    const maxBots =
      mode === 'duel-bots' ? 1 : mode === 'ffa-peers' ? 2 : 3;

    const bots = remotes.filter(
      (r) =>
        r.userId.startsWith('bot-') &&
        (r.status === 'alive' || r.status === 'spawning')
    );
    const peers = remotes.filter(
      (r) =>
        !r.userId.startsWith('bot-') &&
        (r.status === 'alive' || r.status === 'spawning')
    );
    const activeBots = bots.slice(0, maxBots);
    const aliveIds = new Set([
      ...activeBots.map((r) => r.userId),
      ...peers.map((r) => r.userId),
    ]);

    for (const [id, root] of this.botRoots) {
      if (!aliveIds.has(id)) {
        scene.remove(root);
        this.disposeGroup(root);
        this.botRoots.delete(id);
        this.botAi.delete(id);
      }
    }

    const origin = player?.position ?? new THREE.Vector3(0, 0, 5);

    for (const remote of [...activeBots, ...peers]) {
      const isBot = remote.userId.startsWith('bot-');
      let root = this.botRoots.get(remote.userId);
      if (!root) {
        root = isBot
          ? this.createBotVisual(remote.displayName)
          : this.createPeerVisual(remote.displayName);
        scene.add(root);
        this.botRoots.set(remote.userId, root);
        if (isBot) {
          this.botAi.set(
            remote.userId,
            this.createAi(remote.position.x, remote.position.z, mode, this.meta.wave())
          );
        }
      }
      root.visible = true;

      let x = remote.position.x;
      let z = remote.position.z;

      if (isBot) {
        const distFromPlayer = Math.hypot(x - origin.x, z - origin.z);
        if (distFromPlayer > 28 || distFromPlayer < 0.2) {
          const slot = activeBots.findIndex((b) => b.userId === remote.userId);
          const lateral = (slot - 1) * 2.6;
          // Toujours hors zone safe miroir (face Canebière −Z).
          const outside = this.pointOutsideSpawnSafe(
            origin.x + lateral,
            origin.z - (MIRROR_SPAWN_SAFE_ZONE.radiusMeters + 4 + slot * 1.8)
          );
          x = outside.x;
          z = outside.z;
          this.economy.upsert({
            ...remote,
            position: { x, y: 0, z },
          });
          const ai = this.botAi.get(remote.userId);
          if (ai) ai.home = { x, z };
        } else if (isInsideMirrorSpawnSafeZone(x, z)) {
          const outside = this.pointOutsideSpawnSafe(x, z);
          x = outside.x;
          z = outside.z;
          this.economy.upsert({ ...remote, position: { x, y: 0, z } });
          const ai = this.botAi.get(remote.userId);
          if (ai) ai.home = { x, z };
        }
      }

      root.position.set(x, 0, z);
      root.lookAt(origin.x, 0, origin.z);

      const d = Math.hypot(x - origin.x, z - origin.z);
      root.scale.setScalar(d > 18 ? 0.82 : 1);
    }
  }

  private animateBots(dt: number): void {
    const player = this.characterNft.getCharacterMesh();
    const bob = Math.sin(this.botAnimT * 3) * 0.04;
    for (const [id, root] of this.botRoots) {
      if (!root.visible) continue;
      const body = root.children[0];
      if (body) body.position.y = 0.85 + bob;
      const ring = root.children[3];
      if (ring) ring.rotation.z = this.botAnimT * 1.2;

      // Peers WS : pose serveur uniquement, pas d’IA strafe.
      if (!id.startsWith('bot-')) continue;

      const ai = this.botAi.get(id);
      if (!ai || !player) continue;
      ai.strafeT += dt * (1.1 + ai.coverBias);
      const lateral = Math.sin(ai.strafeT) * ai.strafeDir * (1.4 + ai.coverBias);
      const back = Math.cos(ai.strafeT * 0.5) * 0.6 * ai.coverBias;
      const tx = ai.home.x + lateral;
      const tz = ai.home.z + back;
      const clamped = this.pointOutsideSpawnSafe(tx, tz);
      root.position.x = THREE.MathUtils.lerp(root.position.x, clamped.x, 0.04);
      root.position.z = THREE.MathUtils.lerp(root.position.z, clamped.z, 0.04);
      root.lookAt(player.position.x, 0, player.position.z);

      const state = this.economy.getState(id);
      if (state && state.status === 'alive') {
        this.economy.upsert({
          ...state,
          position: { x: root.position.x, y: 0, z: root.position.z },
        });
      }
    }
  }

  private syncPowerMeshes(scene: THREE.Scene): void {
    const list = this.meta.powerUps();
    const ids = new Set(list.map((p) => p.id));
    for (const [id, mesh] of this.powerMeshes) {
      if (!ids.has(id)) {
        scene.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        this.powerMeshes.delete(id);
      }
    }
    for (const pu of list) {
      let mesh = this.powerMeshes.get(pu.id);
      if (!mesh) {
        const color = pu.kind === 'shield' ? 0x18314f : 0xd5a021;
        mesh = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.4, 0),
          new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.42,
          })
        );
        mesh.name = `arena-pu-${pu.id}`;
        scene.add(mesh);
        this.powerMeshes.set(pu.id, mesh);
      }
      mesh.position.set(pu.x, 0.65 + Math.sin(this.botAnimT * 4) * 0.15, pu.z);
      mesh.rotation.y = this.botAnimT * 2.4;
    }
  }

  private clearPowerMeshes(): void {
    const scene = this.threeScene.getScene();
    for (const [, mesh] of this.powerMeshes) {
      scene?.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.powerMeshes.clear();
  }

  private createBotVisual(label: string): THREE.Group {
    const root = new THREE.Group();
    root.name = `arena-bot-${label}`;

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x7b0d1e,
      emissive: 0x0d0630,
      emissiveIntensity: 0.2,
      roughness: 0.72,
      metalness: 0.08,
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: 0x18314f,
      emissive: 0x0d0630,
      emissiveIntensity: 0.25,
      roughness: 0.6,
    });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.1, 0.45), bodyMat);
    body.position.y = 0.85;
    root.add(body);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.4, 0.4), bodyMat);
    head.position.y = 1.6;
    root.add(head);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.08), accentMat);
    visor.position.set(0, 1.62, 0.22);
    root.add(visor);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.72, 24),
      new THREE.MeshBasicMaterial({
        color: 0x7b0d1e,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.04;
    root.name = `arena-bot-root`;
    root.add(ring);

    root.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.castShadow = false;
        obj.receiveShadow = false;
      }
    });
    return root;
  }

  private flashBot(userId: string, kill: boolean): void {
    const root = this.botRoots.get(userId);
    if (!root) return;
    root.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
        const mat = obj.material;
        const prev = mat.emissiveIntensity;
        mat.emissiveIntensity = kill ? 1.1 : 0.7;
        window.setTimeout(() => {
          mat.emissiveIntensity = prev;
        }, kill ? 200 : 90);
      }
    });
  }

  private clearBotsVisual(): void {
    const scene = this.threeScene.getScene();
    for (const [, root] of this.botRoots) {
      scene?.remove(root);
      this.disposeGroup(root);
    }
    this.botRoots.clear();
    this.botAi.clear();
  }

  private disposeGroup(root: THREE.Group): void {
    root.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        const mat = obj.material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat?.dispose();
      }
    });
    root.clear();
  }

  private pulseHitFlash(hit: boolean): void {
    this.hitFlashSignal.set(hit);
    window.setTimeout(() => this.hitFlashSignal.set(false), 90);
  }
}
