import { Injectable, signal } from '@angular/core';
import * as THREE from 'three';

interface BeamFx {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
}

interface SparkFx {
  mesh: THREE.Mesh;
  life: number;
  vel: THREE.Vector3;
}

interface RingFx {
  mesh: THREE.Mesh;
  life: number;
}

/**
 * FX Kill-to-earn — beams épais, muzzle, sparks, anneau KO.
 */
@Injectable({ providedIn: 'root' })
export class ArenaFxService {
  private readonly beams: BeamFx[] = [];
  private readonly sparks: SparkFx[] = [];
  private readonly rings: RingFx[] = [];
  private muzzle: THREE.PointLight | null = null;
  private muzzleSprite: THREE.Mesh | null = null;
  private muzzleLife = 0;
  private scene: THREE.Scene | null = null;
  private readonly screenFlashSignal = signal(0);

  readonly screenFlash = this.screenFlashSignal.asReadonly();

  attach(scene: THREE.Scene): void {
    this.scene = scene;
  }

  /** Trait soft — ne concurrence pas le fuchsia local. */
  spawnBeam(from: THREE.Vector3, to: THREE.Vector3, hit: boolean): void {
    if (!this.scene) return;
    const dir = new THREE.Vector3().subVectors(to, from);
    const len = Math.max(0.25, dir.length());
    const mid = from.clone().add(to).multiplyScalar(0.5);
    const rOuter = hit ? 0.07 : 0.04;
    const rInner = hit ? 0.05 : 0.028;
    const geom = new THREE.CylinderGeometry(rOuter, rInner, len, 6);
    const mat = new THREE.MeshBasicMaterial({
      color: hit ? 0x8aa8b8 : 0x9a8060,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.copy(mid);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    this.scene.add(mesh);
    this.beams.push({ mesh, life: 0.14, maxLife: 0.14 });
  }

  spawnMuzzle(at: THREE.Vector3): void {
    if (!this.scene) return;
    if (!this.muzzle) {
      this.muzzle = new THREE.PointLight(0xc04088, 2.2, 6);
      this.muzzle.name = 'arena-muzzle-light';
      this.scene.add(this.muzzle);
    }
    if (!this.muzzleSprite) {
      this.muzzleSprite = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 8, 8),
        new THREE.MeshBasicMaterial({
          color: 0xffa0d0,
          transparent: true,
          opacity: 0.7,
          depthWrite: false,
        })
      );
      this.muzzleSprite.name = 'arena-muzzle-sprite';
      this.scene.add(this.muzzleSprite);
    }
    this.muzzle.position.copy(at);
    this.muzzle.intensity = 2.8;
    this.muzzleSprite.position.copy(at);
    this.muzzleSprite.scale.setScalar(1);
    (this.muzzleSprite.material as THREE.MeshBasicMaterial).opacity = 0.7;
    this.muzzleLife = 0.1;
    this.screenFlashSignal.set(0.22);
  }

  spawnHitSparks(at: THREE.Vector3, heavy = false): void {
    if (!this.scene) return;
    const n = heavy ? 14 : 8;
    for (let i = 0; i < n; i++) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.1, 0.1),
        new THREE.MeshBasicMaterial({
          color: heavy ? 0xc0a070 : 0x8a7060,
          transparent: true,
          opacity: 0.65,
        })
      );
      mesh.position.copy(at);
      this.scene.add(mesh);
      this.sparks.push({
        mesh,
        life: heavy ? 0.4 : 0.28,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * (heavy ? 7 : 4.5),
          1.2 + Math.random() * (heavy ? 5 : 3),
          (Math.random() - 0.5) * (heavy ? 7 : 4.5)
        ),
      });
    }
  }

  /** Anneau KO au sol + flash doux. */
  spawnKillBurst(at: THREE.Vector3): void {
    if (!this.scene) return;
    this.spawnHitSparks(at, true);
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(0.35, 1.1, 28),
      new THREE.MeshBasicMaterial({
        color: 0xc04088,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(at.x, 0.08, at.z);
    this.scene.add(mesh);
    this.rings.push({ mesh, life: 0.45 });
    this.screenFlashSignal.set(0.5);
  }

  update(dt: number): void {
    const flash = this.screenFlashSignal();
    if (flash > 0) {
      this.screenFlashSignal.set(Math.max(0, flash - dt * 3.2));
    }

    if (this.muzzle && this.muzzleLife > 0) {
      this.muzzleLife -= dt;
      this.muzzle.intensity = Math.max(0, this.muzzleLife * 35);
      if (this.muzzleSprite) {
        const t = Math.max(0, this.muzzleLife / 0.1);
        this.muzzleSprite.scale.setScalar(0.6 + t * 1.4);
        (this.muzzleSprite.material as THREE.MeshBasicMaterial).opacity = t;
      }
    }

    for (let i = this.beams.length - 1; i >= 0; i--) {
      const b = this.beams[i];
      b.life -= dt;
      const mat = b.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, b.life / b.maxLife);
      if (b.life <= 0) {
        this.scene?.remove(b.mesh);
        b.mesh.geometry.dispose();
        mat.dispose();
        this.beams.splice(i, 1);
      }
    }

    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.life -= dt;
      s.vel.y -= 11 * dt;
      s.mesh.position.addScaledVector(s.vel, dt);
      if (s.life <= 0) {
        this.scene?.remove(s.mesh);
        s.mesh.geometry.dispose();
        (s.mesh.material as THREE.Material).dispose();
        this.sparks.splice(i, 1);
      }
    }

    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life -= dt;
      const mat = r.mesh.material as THREE.MeshBasicMaterial;
      const t = Math.max(0, r.life / 0.45);
      mat.opacity = t * 0.9;
      r.mesh.scale.setScalar(1 + (1 - t) * 1.8);
      if (r.life <= 0) {
        this.scene?.remove(r.mesh);
        r.mesh.geometry.dispose();
        mat.dispose();
        this.rings.splice(i, 1);
      }
    }
  }

  dispose(): void {
    for (const b of this.beams) {
      this.scene?.remove(b.mesh);
      b.mesh.geometry.dispose();
      (b.mesh.material as THREE.Material).dispose();
    }
    this.beams.length = 0;
    for (const s of this.sparks) {
      this.scene?.remove(s.mesh);
      s.mesh.geometry.dispose();
      (s.mesh.material as THREE.Material).dispose();
    }
    this.sparks.length = 0;
    for (const r of this.rings) {
      this.scene?.remove(r.mesh);
      r.mesh.geometry.dispose();
      (r.mesh.material as THREE.Material).dispose();
    }
    this.rings.length = 0;
    if (this.muzzle) {
      this.scene?.remove(this.muzzle);
      this.muzzle = null;
    }
    if (this.muzzleSprite) {
      this.scene?.remove(this.muzzleSprite);
      this.muzzleSprite.geometry.dispose();
      (this.muzzleSprite.material as THREE.Material).dispose();
      this.muzzleSprite = null;
    }
    this.screenFlashSignal.set(0);
    this.scene = null;
  }
}
