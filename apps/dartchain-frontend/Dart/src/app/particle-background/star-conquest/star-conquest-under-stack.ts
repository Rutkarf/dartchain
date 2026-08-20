import * as THREE from 'three';
import { measureFloorTopPx, screenToWorldOnPlane } from './star-conquest-layout';
import { createSoftDiscTexture } from './star-conquest-visuals';
import { STAR_CONQUEST_SCALE } from './star-conquest-scale';

/** Au moins 2 particules sous le floor, sur l’axe vertical central. */
const COUNT = 2;
/** Offset horizontal léger autour du centre (px). */
const X_OFFSETS_PX = [-14, 14];
/** Fractions dans la bande floor (0 = sommet floor, 1 = bas viewport). */
const V_SLOTS = [0.42, 0.72];

/**
 * Particules visibles derrière le peek Three.js (z-index 0 sous floor z=1),
 * centrées sur la ligne verticale du bas de page.
 */
export class StarConquestUnderStackBand {
  readonly group = new THREE.Group();
  private readonly points: THREE.Points;
  private readonly home = new Float32Array(COUNT * 3);
  private readonly phase = new Float32Array(COUNT);
  private readonly amp = new Float32Array(COUNT);
  private readonly speed = new Float32Array(COUNT);
  private readonly discTex: THREE.CanvasTexture;
  private time = 0;

  constructor() {
    this.group.name = 'StarConquestUnderFloorBand';
    this.discTex = createSoftDiscTexture(32);
    for (let i = 0; i < COUNT; i++) {
      this.phase[i] = i * 1.7;
      this.amp[i] = 1.4 + i * 0.35;
      this.speed[i] = 0.32 + i * 0.08;
    }

    const pos = new Float32Array(COUNT * 3);
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.points = new THREE.Points(
      geom,
      new THREE.PointsMaterial({
        map: this.discTex,
        color: 0xc8d8e8,
        size: 2.8,
        transparent: true,
        opacity: 0.78,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      })
    );
    this.points.name = 'star-conquest-under-floor';
    this.points.raycast = () => {};
    this.group.add(this.points);
  }

  layout(camera: THREE.PerspectiveCamera, floorPeekPx = 64): void {
    const vw = Math.max(window.innerWidth, 32);
    const vh = Math.max(window.innerHeight, 32);
    const floorTop = measureFloorTopPx(floorPeekPx, vh);
    const bandTop = floorTop;
    const bandBottom = vh - 4;
    const bandH = Math.max(12, bandBottom - bandTop);
    const centerX = vw * 0.5;

    (this.points.material as THREE.PointsMaterial).size =
      (bandH < 36 ? 2.1 : 2.9) * STAR_CONQUEST_SCALE.visual;
    (this.points.material as THREE.PointsMaterial).opacity = 0.7;

    for (let i = 0; i < COUNT; i++) {
      const sx = centerX + X_OFFSETS_PX[i];
      const sy = bandTop + V_SLOTS[i] * bandH;
      // Z derrière le plan interactif — visibles sous le mask du floor
      const z = -18 - i * 4;
      const world = screenToWorldOnPlane(sx, sy, camera, z);
      const i3 = i * 3;
      this.home[i3] = world.x;
      this.home[i3 + 1] = world.y;
      this.home[i3 + 2] = world.z;
    }
    this.writeLive(0);
  }

  tick(deltaMs: number): void {
    this.time += deltaMs * 0.001;
    this.writeLive(this.time);
  }

  private writeLive(t: number): void {
    const pos = this.points.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3;
      const p = this.phase[i] + t * this.speed[i];
      const a = this.amp[i];
      // Micro-dérive, restent près de l’axe central
      arr[i3] = this.home[i3] + Math.sin(p) * a * 0.45;
      arr[i3 + 1] = this.home[i3 + 1] + Math.cos(p * 0.9) * a * 0.35;
      arr[i3 + 2] = this.home[i3 + 2] + Math.sin(p * 0.55) * a * 0.25;
    }
    pos.needsUpdate = true;
  }

  dispose(): void {
    this.points.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
    this.discTex.dispose();
  }
}
