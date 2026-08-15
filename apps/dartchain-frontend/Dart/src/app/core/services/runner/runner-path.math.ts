import * as THREE from 'three';
import { RUNNER_CONFIG } from './runner.config';

/**
 * Surface type « planète » : cylindre d’axe X (latéral).
 * progress=0 → (0,0,0) ; avance → −Z avec y qui s’abaisse légèrement (horizon).
 */
export interface PathFrame {
  position: THREE.Vector3;
  /** Direction d’avance (tangent). */
  forward: THREE.Vector3;
  /** Normale sol (up). */
  up: THREE.Vector3;
  /** Latéral vers +voie droite. */
  right: THREE.Vector3;
  /** Quaternion aligné : +Y = up, −Z = forward. */
  quaternion: THREE.Quaternion;
}

const _pos = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _up = new THREE.Vector3();
const _right = new THREE.Vector3();
const _negFwd = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _m = new THREE.Matrix4();
const _look = new THREE.Matrix4();

/**
 * Convertit (progress, laneX) → frame monde sur la surface courbée.
 * @param progress distance le long du parcours (≥0 vers l’avant)
 * @param laneX offset latéral (voie * laneWidth)
 */
export function pathFrameAt(progress: number, laneX: number, out?: PathFrame): PathFrame {
  const R = RUNNER_CONFIG.curveRadius;
  const θ = progress / R;

  // Point sur le cylindre : y = R(cosθ − 1), z = −R·sinθ
  _pos.set(laneX, R * (Math.cos(θ) - 1), -R * Math.sin(θ));

  // Tangent d/dprogress = dθ/dp * ∂/∂θ
  _fwd.set(0, -Math.sin(θ), -Math.cos(θ)).normalize();
  // Normale radial (vers l’extérieur du cylindre / « haut » local)
  _up.set(0, Math.cos(θ), -Math.sin(θ)).normalize();
  _right.crossVectors(_fwd, _up).normalize();
  // Recalcule up pour orthonormalité
  _up.crossVectors(_right, _fwd).normalize();

  _negFwd.copy(_fwd).negate();
  _look.makeBasis(_right, _up, _negFwd);
  _quat.setFromRotationMatrix(_look);

  if (out) {
    out.position.copy(_pos);
    out.forward.copy(_fwd);
    out.up.copy(_up);
    out.right.copy(_right);
    out.quaternion.copy(_quat);
    return out;
  }

  return {
    position: _pos.clone(),
    forward: _fwd.clone(),
    up: _up.clone(),
    right: _right.clone(),
    quaternion: _quat.clone(),
  };
}

/** Centre X d’une voie (−1, 0, 1). */
export function laneCenterX(laneIndex: number): number {
  return laneIndex * RUNNER_CONFIG.laneWidth;
}

/** Interpolation lane index → offset X. */
export function lerpLaneX(fromLane: number, toLane: number, t: number): number {
  const a = laneCenterX(fromLane);
  const b = laneCenterX(toLane);
  const s = t * t * (3 - 2 * t); // smoothstep
  return THREE.MathUtils.lerp(a, b, s);
}

/** RNG déterministe (mulberry32). */
export function createSeededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function disposeObject3D(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const geo = child.geometry;
      if (geo && !geo.userData?.['shared']) {
        geo.dispose();
      }
      const mats = Array.isArray(child.material)
        ? child.material
        : child.material
          ? [child.material]
          : [];
      for (const mat of mats) {
        // Matériaux partagés (userData.shared) : ne pas dispose ici
        if (mat.userData?.['shared']) continue;
        mat.dispose();
      }
    }
    if (child instanceof THREE.Light) {
      child.dispose?.();
    }
  });
}
