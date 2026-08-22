import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import * as THREE from 'three';
import {
  bindWebGlVisibilityPause,
  shouldAnimateWebGl,
} from '../../core/utils/three-animation.util';

const MOVE_SPEED = 0.15;
const MAX_VELOCITY = 0.2;
const FRICTION = 0.85;
const CLIMB_SPEED = 0.1;
const LADDER_Y_MIN = 0.75;
const LADDER_Y_MAX = 14.5;
const LADDER_TOP_Y = 14;

/**
 * Scène Three.js : 3ᵉ personne + collisions bâtiments + échelle + fusée.
 * Contrôles WASD / flèches + E pour grimper.
 */
@Component({
  selector: 'app-ladder-climb-scene',
  standalone: true,
  templateUrl: './ladder-climb-scene.html',
  styleUrl: './ladder-climb-scene.css',
})
export class LadderClimbSceneComponent implements AfterViewInit, OnDestroy {
  @ViewChild('gameCanvas', { static: true })
  canvasRef!: ElementRef<HTMLCanvasElement>;

  private readonly zone = inject(NgZone);

  /** Overlay UI */
  readonly promptText = signal<string | null>(null);
  readonly statusText = signal<string | null>(null);

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private character!: THREE.Mesh;
  private readonly buildings: THREE.Mesh[] = [];
  private readonly velocity = new THREE.Vector3();
  private readonly previousPosition = new THREE.Vector3();
  private readonly characterBox = new THREE.Box3();
  private readonly buildingBox = new THREE.Box3();
  private readonly ladderZone = new THREE.Box3(
    new THREE.Vector3(-1, 0, -41),
    new THREE.Vector3(1, 15, -39)
  );

  private climbingMode = false;
  private canClimb = false;
  private animating = false;
  private animationId = 0;
  private visibilityBinding?: { unsubscribe: () => void };

  private readonly keys = {
    w: false,
    a: false,
    s: false,
    d: false,
    e: false,
  };

  private readonly onKeyDown = (e: KeyboardEvent): void => this.handleKeyDown(e);
  private readonly onKeyUp = (e: KeyboardEvent): void => this.handleKeyUp(e);
  private readonly onResize = (): void => this.onWindowResize();

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      try {
        this.init();
        this.createFloor();
        // path-line removed (cyberpunk neon floor only)
        this.createBuildings();
        this.createCharacter();
        this.createLadder();
        this.createRocket();
        this.bindEvents();
        this.visibilityBinding = bindWebGlVisibilityPause(
          () => this.pause(),
          () => this.resume()
        );
        this.resume();
      } catch (err) {
        console.error('[ladder-climb] Init failed', err);
      }
    });
  }

  ngOnDestroy(): void {
    this.visibilityBinding?.unsubscribe();
    this.pause();
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('resize', this.onResize);
    this.renderer?.dispose();
    this.scene?.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        const mat = obj.material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat?.dispose();
      }
    });
  }

  // —— 1. Scene setup ——

  private init(): void {
    const canvas = this.canvasRef.nativeElement;
    const width = window.innerWidth;
    const height = Math.max(280, Math.round(window.innerHeight * 0.42));

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87b5d9);

    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.camera.position.set(0, 5, 10);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambient);

    const dir = new THREE.DirectionalLight(0xffffff, 1.0);
    dir.position.set(10, 20, 10);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    dir.shadow.camera.near = 1;
    dir.shadow.camera.far = 80;
    dir.shadow.camera.left = -30;
    dir.shadow.camera.right = 30;
    dir.shadow.camera.top = 30;
    dir.shadow.camera.bottom = -30;
    this.scene.add(dir);
  }

  /** Floor CRITICAL — light gray, fully opaque, DoubleSide. */
  private createFloor(): void {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.MeshStandardMaterial({
        color: 0x999999,
        opacity: 1.0,
        transparent: false,
        roughness: 0.8,
        metalness: 0.2,
        side: THREE.DoubleSide,
      })
    );
    floor.position.set(0, 0, 0);
    floor.rotation.set(-Math.PI / 2, 0, 0);
    floor.receiveShadow = true;
    floor.name = 'floor';
    this.scene.add(floor);
  }

  /** Path line intentionally removed — neon floor / runner road only. */
  private createPathLine(): void {
    return;
  }

  private createBuildings(): void {
    const specs: Array<{ x: number; z: number; w: number; h: number; d: number }> = [
      { x: -6, z: -5, w: 3, h: 4, d: 3 },
      { x: 5, z: -8, w: 2.5, h: 6, d: 2.5 },
      { x: -4, z: -14, w: 3.5, h: 5, d: 3 },
      { x: 7, z: -18, w: 2, h: 7, d: 2 },
      { x: -7, z: -22, w: 4, h: 3.5, d: 3 },
      { x: 4, z: -27, w: 3, h: 8, d: 3.5 },
      { x: -5, z: -32, w: 2.5, h: 5.5, d: 2.5 },
      { x: 6, z: -35, w: 3, h: 4.5, d: 4 },
    ];

    const mat = new THREE.MeshStandardMaterial({
      color: 0x6688cc,
      roughness: 0.7,
      metalness: 0.15,
    });

    for (const s of specs) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(s.w, s.h, s.d), mat);
      mesh.position.set(s.x, s.h / 2, s.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.buildings.push(mesh);
    }
  }

  private createCharacter(): void {
    // CapsuleGeometry (three ≥ r125) — radius 0.5, length 1.5 total-ish
    let geometry: THREE.BufferGeometry;
    if (typeof (THREE as unknown as { CapsuleGeometry?: unknown }).CapsuleGeometry === 'function') {
      // CapsuleGeometry(radius, length, capSegments, radialSegments) — length = cylindrical part
      geometry = new THREE.CapsuleGeometry(0.5, 0.5, 4, 8);
    } else {
      geometry = new THREE.CylinderGeometry(0.5, 0.5, 1.5, 8);
    }

    this.character = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color: 0xff6600,
        roughness: 0.45,
        metalness: 0.2,
      })
    );
    this.character.position.set(0, 1.25, 5);
    this.character.castShadow = true;
    this.character.name = 'character';
    this.scene.add(this.character);
  }

  private createLadder(): void {
    const metal = new THREE.MeshStandardMaterial({
      color: 0x888888,
      metalness: 0.7,
      roughness: 0.35,
    });

    const poleGeo = new THREE.CylinderGeometry(0.1, 0.1, 15, 8);
    const left = new THREE.Mesh(poleGeo, metal);
    left.position.set(-0.5, 7.5, -40);
    left.castShadow = true;
    const right = new THREE.Mesh(poleGeo, metal);
    right.position.set(0.5, 7.5, -40);
    right.castShadow = true;
    this.scene.add(left, right);

    const rungGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.0, 6);
    for (let i = 0; i < 12; i++) {
      const rung = new THREE.Mesh(rungGeo, metal);
      rung.position.set(0, 1.5 + i * 1.2, -40);
      rung.rotation.z = Math.PI / 2;
      rung.castShadow = true;
      this.scene.add(rung);
    }
  }

  private createRocket(): void {
    // Platform
    const platform = new THREE.Mesh(
      new THREE.BoxGeometry(4, 0.3, 4),
      new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.7 })
    );
    platform.position.set(0, 15, -40);
    platform.castShadow = true;
    platform.receiveShadow = true;
    this.scene.add(platform);

    const white = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.3,
      roughness: 0.4,
    });
    const red = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      metalness: 0.2,
      roughness: 0.45,
    });

    // Body
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 3, 16), white);
    body.position.set(0, 17, -40);
    body.castShadow = true;
    this.scene.add(body);

    // Nose
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.5, 16), red);
    nose.position.set(0, 19.25, -40);
    nose.castShadow = true;
    this.scene.add(nose);

    // Fins (4)
    for (let i = 0; i < 4; i++) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.9, 0.55), red);
      const angle = (i / 4) * Math.PI * 2;
      fin.position.set(Math.cos(angle) * 0.75, 16, -40 + Math.sin(angle) * 0.75);
      fin.rotation.y = -angle;
      fin.castShadow = true;
      this.scene.add(fin);
    }

    // Window
    const windowMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 12, 12),
      new THREE.MeshStandardMaterial({
        color: 0x88ccff,
        emissive: 0x226688,
        emissiveIntensity: 0.4,
        metalness: 0.1,
        roughness: 0.2,
      })
    );
    windowMesh.position.set(0, 17.4, -39.35);
    this.scene.add(windowMesh);
  }

  // —— Input ——

  private bindEvents(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('resize', this.onResize, { passive: true });
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    if (key in this.keys) {
      this.keys[key as keyof typeof this.keys] = true;
    }
    if (e.key === 'ArrowUp') this.keys.w = true;
    if (e.key === 'ArrowDown') this.keys.s = true;
    if (e.key === 'ArrowLeft') this.keys.a = true;
    if (e.key === 'ArrowRight') this.keys.d = true;

    if (key === 'e' && this.canClimb && !this.climbingMode) {
      this.startClimbing();
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    if (key in this.keys) {
      this.keys[key as keyof typeof this.keys] = false;
    }
    if (e.key === 'ArrowUp') this.keys.w = false;
    if (e.key === 'ArrowDown') this.keys.s = false;
    if (e.key === 'ArrowLeft') this.keys.a = false;
    if (e.key === 'ArrowRight') this.keys.d = false;
  }

  // —— Movement & collisions ——

  private handleInput(): void {
    if (this.climbingMode) return;

    const wish = new THREE.Vector3();
    if (this.keys.w) wish.z -= 1;
    if (this.keys.s) wish.z += 1;
    if (this.keys.a) wish.x -= 1;
    if (this.keys.d) wish.x += 1;

    if (wish.lengthSq() > 0) {
      wish.normalize().multiplyScalar(MOVE_SPEED);
      this.velocity.add(wish);
    }

    if (this.velocity.length() > MAX_VELOCITY) {
      this.velocity.setLength(MAX_VELOCITY);
    }
  }

  private updateMovement(): void {
    this.velocity.multiplyScalar(FRICTION);
    if (this.velocity.lengthSq() < 1e-6) {
      this.velocity.set(0, 0, 0);
      return;
    }

    this.previousPosition.copy(this.character.position);
    this.character.position.add(this.velocity);
    // Keep feet on floor when not climbing
    this.character.position.y = 1.25;
    this.checkCollisions(this.previousPosition);
  }

  private checkCollisions(previousPosition: THREE.Vector3): void {
    this.characterBox.setFromObject(this.character);

    for (const building of this.buildings) {
      this.buildingBox.setFromObject(building);
      if (!this.characterBox.intersectsBox(this.buildingBox)) continue;

      // Revert + zero velocity (cannot walk through buildings)
      this.character.position.copy(previousPosition);
      this.velocity.set(0, 0, 0);
      console.debug('[ladder-climb] collision building', building.position.toArray());
      break;
    }

    // Soft world bounds so character stays near the play area
    this.character.position.x = THREE.MathUtils.clamp(this.character.position.x, -45, 45);
    this.character.position.z = THREE.MathUtils.clamp(this.character.position.z, -48, 12);
  }

  // —— Ladder ——

  private checkLadderInteraction(): void {
    this.characterBox.setFromObject(this.character);
    const inZone = this.characterBox.intersectsBox(this.ladderZone);
    const nearBase =
      this.character.position.y < 2 &&
      this.character.position.z > -41 &&
      this.character.position.z < -39 &&
      Math.abs(this.character.position.x) < 1.2;

    this.canClimb = inZone && nearBase && !this.climbingMode;

    this.zone.run(() => {
      if (this.climbingMode) {
        if (this.character.position.y > LADDER_TOP_Y) {
          this.promptText.set(null);
          this.statusText.set('You reached the top!');
        } else {
          this.promptText.set('W / ↑ climb · S / ↓ descend');
          this.statusText.set(null);
        }
      } else if (this.canClimb) {
        this.promptText.set('Press E to climb');
        this.statusText.set(null);
      } else {
        this.promptText.set(null);
      }
    });
  }

  private startClimbing(): void {
    this.climbingMode = true;
    this.velocity.set(0, 0, 0);
    this.character.position.set(0, LADDER_Y_MIN, -40);
    console.info('[ladder-climb] climbing started');
    this.zone.run(() => {
      this.promptText.set('W / ↑ climb · S / ↓ descend');
      this.statusText.set(null);
    });
  }

  private updateClimbing(): void {
    if (!this.climbingMode) return;

    let dy = 0;
    if (this.keys.w) dy += CLIMB_SPEED;
    if (this.keys.s) dy -= CLIMB_SPEED;

    // Optional bob while climbing
    const bob = dy !== 0 ? Math.sin(performance.now() * 0.02) * 0.015 : 0;
    this.character.position.y = THREE.MathUtils.clamp(
      this.character.position.y + dy + bob,
      LADDER_Y_MIN,
      LADDER_Y_MAX
    );
    this.character.position.x = 0;
    this.character.position.z = -40;

    // Step onto platform at top
    if (this.character.position.y >= LADDER_Y_MAX - 0.05 && this.keys.w) {
      this.climbingMode = false;
      this.character.position.set(0, 15.9, -40);
      this.zone.run(() => {
        this.statusText.set('You reached the top!');
        this.promptText.set(null);
      });
    }
  }

  // —— Camera / loop ——

  private updateCamera(): void {
    this.camera.position.x = this.character.position.x;
    this.camera.position.y = this.character.position.y + 4;
    this.camera.position.z = this.character.position.z + 10;
    this.camera.lookAt(
      this.character.position.x,
      this.character.position.y + 1,
      this.character.position.z
    );
  }

  private animate = (): void => {
    if (!this.animating) return;
    this.animationId = requestAnimationFrame(this.animate);

    if (shouldAnimateWebGl()) {
      if (this.climbingMode) {
        this.updateClimbing();
      } else {
        this.handleInput();
        this.updateMovement();
      }
      this.checkLadderInteraction();
      this.updateCamera();
    }

    this.renderer.render(this.scene, this.camera);
  };

  private onWindowResize(): void {
    if (!this.camera || !this.renderer) return;
    const width = window.innerWidth;
    const height = Math.max(280, Math.round(window.innerHeight * 0.42));
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  private pause(): void {
    this.animating = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = 0;
    }
  }

  private resume(): void {
    if (this.animating) return;
    this.animating = true;
    this.animate();
  }
}
