import * as THREE from 'three';

/** Phase 13 — SSAO radius adaptatif à la distance caméra. */
export function adaptiveSsaoSettings(
  cameraDistance: number,
  cameraHeight: number
): { kernelRadius: number; maxDistance: number } {
  const dist = Math.hypot(cameraDistance, cameraHeight * 0.35);
  const kernelRadius = THREE.MathUtils.lerp(8.5, 4.2, THREE.MathUtils.clamp(dist / 48, 0, 1));
  const maxDistance = THREE.MathUtils.lerp(0.08, 0.045, THREE.MathUtils.clamp(dist / 72, 0, 1));
  return { kernelRadius, maxDistance };
}

export const VALIDATION_DOF = {
  focus: 42,
  aperture: 0.00012,
  maxblur: 0.0048,
} as const;
