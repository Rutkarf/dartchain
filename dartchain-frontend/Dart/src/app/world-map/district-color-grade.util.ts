import * as THREE from 'three';

export type ColorGradeDistrict = 'harbor-spawn' | 'canebiere' | 'outer-port';

export interface DistrictColorGrade {
  shadowTint: THREE.Vector3;
  highlightTint: THREE.Vector3;
  mixBoost: number;
}

const GRADES: Record<ColorGradeDistrict, DistrictColorGrade> = {
  'harbor-spawn': {
    shadowTint: new THREE.Vector3(0.86, 0.94, 1.06),
    highlightTint: new THREE.Vector3(1.04, 1.02, 0.98),
    mixBoost: 0,
  },
  canebiere: {
    shadowTint: new THREE.Vector3(0.9, 0.92, 1.02),
    highlightTint: new THREE.Vector3(1.06, 1.03, 0.96),
    mixBoost: 0.04,
  },
  'outer-port': {
    shadowTint: new THREE.Vector3(0.82, 0.9, 1.08),
    highlightTint: new THREE.Vector3(1.02, 1.01, 1),
    mixBoost: -0.06,
  },
};

/** Phase 13 — color grade subtil par zone Vieux-Port. */
export function resolveDistrictColorGrade(x: number, z: number): DistrictColorGrade {
  if (z > 4 && Math.hypot(x, z) < 120) {
    return GRADES['harbor-spawn'];
  }
  if (z < -24 && Math.abs(x) < 140) {
    return GRADES.canebiere;
  }
  if (Math.hypot(x, z) > 180) {
    return GRADES['outer-port'];
  }
  return GRADES['harbor-spawn'];
}

export function districtColorGradeMix(baseMix: number, district: DistrictColorGrade): number {
  return THREE.MathUtils.clamp(baseMix + district.mixBoost, 0, 0.52);
}
