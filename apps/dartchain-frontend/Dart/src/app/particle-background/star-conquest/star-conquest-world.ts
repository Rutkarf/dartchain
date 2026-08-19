import * as THREE from 'three';

const STICK_DEADZONE = 0.04;
const DEFAULT_PAN_MAX_X = 90;
const DEFAULT_PAN_MAX_Y = 70;
/** Vitesse de pan caméra (unités monde / s à stick plein). */
const PAN_SPEED = 52;
const CAMERA_Z = 160;
/** Rebond doux hors drag seulement. */
const EDGE_BOUNCE = 48;
const CENTER_SPRING = 1.2;

/**
 * Univers Star Conquest — la structure reste fixe.
 * Le joystick déplace uniquement le point de vue (caméra) en X/Y,
 * sans changer la profondeur ni transformer le contenu.
 */
export class StarConquestWorld {
  readonly root = new THREE.Group();
  readonly content = new THREE.Group();

  private viewX = 0;
  private viewY = 0;
  private targetViewX = 0;
  private targetViewY = 0;

  private stickX = 0;
  private stickY = 0;
  private dragging = false;

  private panMaxX = DEFAULT_PAN_MAX_X;
  private panMaxY = DEFAULT_PAN_MAX_Y;

  private focusActive = false;
  private readonly focusTarget = new THREE.Vector3();

  /** Correction de rebond (unités / s) calculée depuis le viewport. */
  private bounceVX = 0;
  private bounceVY = 0;

  constructor() {
    this.root.name = 'StarConquestWorld';
    this.content.name = 'StarConquestContent';
    this.root.add(this.content);
    this.content.position.set(0, 0, 0);
    this.content.rotation.set(0, 0, 0);
  }

  attachContent(object: THREE.Object3D): void {
    this.content.add(object);
  }

  /** Limites de pan caméra pour explorer tout le monde Quests. */
  setTravelBounds(txMax: number, tyMax: number, _tzMax?: number): void {
    this.panMaxX = Math.max(48, txMax);
    this.panMaxY = Math.max(48, tyMax);
    this.targetViewX = clamp(this.targetViewX, -this.panMaxX, this.panMaxX);
    this.targetViewY = clamp(this.targetViewY, -this.panMaxY, this.panMaxY);
    this.viewX = clamp(this.viewX, -this.panMaxX, this.panMaxX);
    this.viewY = clamp(this.viewY, -this.panMaxY, this.panMaxY);
  }

  setDragging(active: boolean): void {
    this.dragging = active;
    if (!active) {
      this.stickX = 0;
      this.stickY = 0;
    }
  }

  isDragging(): boolean {
    return this.dragging;
  }

  setStick(nx: number, ny: number): void {
    this.stickX = clamp(nx, -1, 1);
    this.stickY = clamp(ny, -1, 1);
    this.dragging = true;
    this.focusActive = false;
    this.bounceVX = 0;
    this.bounceVY = 0;
  }

  /** Relâche le stick. Par défaut recentre la vue (viewport app 250×550). */
  releaseStick(recenter = true): void {
    this.dragging = false;
    this.stickX = 0;
    this.stickY = 0;
    if (recenter) this.resetView(false);
  }

  focusWorldPoint(worldPos: THREE.Vector3): void {
    this.focusActive = true;
    this.focusTarget.copy(worldPos);
  }

  resetView(immediate = false): void {
    this.focusActive = false;
    this.targetViewX = 0;
    this.targetViewY = 0;
    this.bounceVX = 0;
    this.bounceVY = 0;
    if (immediate) {
      this.viewX = 0;
      this.viewY = 0;
    }
  }

  getViewOffset(): { x: number; y: number } {
    return { x: this.viewX, y: this.viewY };
  }

  clearEdgeBounce(): void {
    this.bounceVX = 0;
    this.bounceVY = 0;
  }

  /**
   * Rebond hors drag uniquement.
   * Ne bloque pas le bas d’écran / zone floor : les Quests sous le floor
   * restent atteignables en pannant vers le bas.
   */
  applyViewportEdgeBounce(
    projected: ReadonlyArray<{ x: number; y: number }>,
    band: { topPx: number; floorTopPx: number; viewportW: number; viewportH: number },
    margin = 10
  ): void {
    if (this.dragging || !projected.length) {
      this.bounceVX *= 0.8;
      this.bounceVY *= 0.8;
      return;
    }
    const left = margin;
    const right = band.viewportW - margin;
    const top = band.topPx + margin;
    // Bas = bas viewport (pas floorTop) — sinon les Quests sous floor
    // déclenchent un rappel permanent vers le centre.
    const bottom = band.viewportH - margin;
    let pushX = 0;
    let pushY = 0;
    let hits = 0;
    for (const p of projected) {
      if (p.y < band.topPx - 80 || p.y > band.viewportH + 80) continue;
      if (p.x < left) {
        pushX -= (left - p.x) / 36;
        hits++;
      } else if (p.x > right) {
        pushX += (p.x - right) / 36;
        hits++;
      }
      if (p.y < top) {
        pushY += (top - p.y) / 36;
        hits++;
      } else if (p.y > bottom) {
        // Soft : seulement si très loin sous le bas (pas la zone floor peek)
        if (p.y > band.viewportH + 24) {
          pushY -= (p.y - bottom) / 48;
          hits++;
        }
      }
    }
    if (!hits) {
      this.bounceVX *= 0.85;
      this.bounceVY *= 0.85;
      return;
    }
    this.bounceVX = clamp(pushX * EDGE_BOUNCE, -EDGE_BOUNCE, EDGE_BOUNCE);
    this.bounceVY = clamp(pushY * EDGE_BOUNCE, -EDGE_BOUNCE, EDGE_BOUNCE);
    this.bounceVX += -this.targetViewX * CENTER_SPRING * 0.08;
    this.bounceVY += -this.targetViewY * CENTER_SPRING * 0.08;
  }

  applyToCamera(camera: THREE.PerspectiveCamera, baseZ = CAMERA_Z): void {
    camera.position.set(this.viewX, this.viewY, baseZ);
    camera.lookAt(this.viewX, this.viewY, 0);
    camera.updateMatrixWorld();
  }

  tick(deltaMs: number): void {
    const dt = Math.min(0.05, deltaMs * 0.001);

    if (this.dragging) {
      const sx = Math.abs(this.stickX) < STICK_DEADZONE ? 0 : this.stickX;
      const sy = Math.abs(this.stickY) < STICK_DEADZONE ? 0 : this.stickY;
      this.targetViewX = clamp(
        this.targetViewX + sx * PAN_SPEED * dt,
        -this.panMaxX,
        this.panMaxX
      );
      this.targetViewY = clamp(
        this.targetViewY - sy * PAN_SPEED * dt,
        -this.panMaxY,
        this.panMaxY
      );
    } else if (this.focusActive) {
      this.targetViewX = clamp(this.focusTarget.x, -this.panMaxX, this.panMaxX);
      this.targetViewY = clamp(this.focusTarget.y, -this.panMaxY, this.panMaxY);
      if (
        Math.abs(this.viewX - this.targetViewX) < 0.6 &&
        Math.abs(this.viewY - this.targetViewY) < 0.6
      ) {
        this.focusActive = false;
      }
    }

    if (
      !this.dragging &&
      (Math.abs(this.bounceVX) > 0.01 || Math.abs(this.bounceVY) > 0.01)
    ) {
      this.targetViewX = clamp(
        this.targetViewX + this.bounceVX * dt,
        -this.panMaxX,
        this.panMaxX
      );
      this.targetViewY = clamp(
        this.targetViewY + this.bounceVY * dt,
        -this.panMaxY,
        this.panMaxY
      );
      this.bounceVX *= Math.pow(0.88, dt * 60);
      this.bounceVY *= Math.pow(0.88, dt * 60);
    }

    const follow = 1 - Math.pow(0.92, dt * 60);
    this.viewX += (this.targetViewX - this.viewX) * follow;
    this.viewY += (this.targetViewY - this.viewY) * follow;

    this.content.position.set(0, 0, 0);
    this.content.rotation.set(0, 0, 0);
  }

  dispose(): void {
    /* contenu disposé par les hosts */
  }
}

function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v));
}
