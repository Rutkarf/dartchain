import { STAR_QUEST_FAMILY_ORDER, type StarQuestFamily } from './star-conquest-families';
import {
  starConquestGalaxyRadius,
  starConquestRingDepthAmp,
} from './star-conquest-ui-maturity.config';

export interface StarConquestHiveCell {
  family: StarQuestFamily;
  /** Angle pentagone (0 = +X). */
  angle: number;
  /** Profondeur relative (far négatif). */
  depthZ: number;
  radius: number;
}

export interface StarConquestGalaxyOnRing {
  family: StarQuestFamily;
  familyIndex: number;
  angle: number;
  x: number;
  y: number;
  z: number;
  /** 0 = fond du cercle, 1 = devant. */
  depthT: number;
  clusterScale: number;
}

/**
 * Cinq galaxies (familles) sur le cercle nébuleuse — cadré 250×550.
 * `phase` = rotation lente du cercle (radians).
 */
export function starConquestGalaxiesOnRing(
  phase = 0,
  galaxyR = starConquestGalaxyRadius()
): readonly StarConquestGalaxyOnRing[] {
  const ring = galaxyR * 0.62;
  const depthAmp = starConquestRingDepthAmp();
  const n = STAR_QUEST_FAMILY_ORDER.length;
  return STAR_QUEST_FAMILY_ORDER.map((family, i) => {
    const angle = -Math.PI / 2 + (i / n) * Math.PI * 2 + phase;
    const x = Math.cos(angle) * ring;
    const y = Math.sin(angle) * ring * 0.72;
    // Devant du cercle = +Z (caméra), fond = −Z
    const z = Math.sin(angle) * depthAmp;
    const depthT = Math.max(0, Math.min(1, (z / Math.max(depthAmp, 1e-6) + 1) * 0.5));
    return {
      family,
      familyIndex: i,
      angle,
      x,
      y,
      z,
      depthT,
      clusterScale: 0.4 + depthT * 0.6,
    };
  });
}

/** Cellules ruche (legacy / tests) — une par famille. */
export function starConquestHiveCells(
  galaxyR = starConquestGalaxyRadius()
): readonly StarConquestHiveCell[] {
  return starConquestGalaxiesOnRing(0, galaxyR).map((g) => ({
    family: g.family,
    angle: g.angle,
    depthZ: g.z,
    radius: Math.hypot(g.x, g.y / 0.72),
  }));
}

export function hiveCellCenter(cell: StarConquestHiveCell): {
  x: number;
  y: number;
  z: number;
} {
  return {
    x: Math.cos(cell.angle) * cell.radius,
    y: Math.sin(cell.angle) * cell.radius * 0.78,
    z: cell.depthZ,
  };
}

/** Sommets d’un hexagone (fermé) dans le plan XY. */
export function hiveHexPoints(
  cx: number,
  cy: number,
  cz: number,
  radius: number,
  segments = 6
): Array<{ x: number; y: number; z: number }> {
  const pts: Array<{ x: number; y: number; z: number }> = [];
  for (let s = 0; s <= segments; s++) {
    const a = (s / segments) * Math.PI * 2 + Math.PI / 6;
    pts.push({
      x: cx + Math.cos(a) * radius,
      y: cy + Math.sin(a) * radius * 0.86,
      z: cz,
    });
  }
  return pts;
}
