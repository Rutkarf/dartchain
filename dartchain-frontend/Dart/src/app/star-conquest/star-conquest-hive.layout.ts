import { STAR_QUEST_FAMILY_ORDER, type StarQuestFamily } from './star-conquest-families';
import {
  starConquestGalaxyRadius,
  starConquestRingDepthAmp,
  starConquestRingTilt,
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

/** Point sur l’axe circulaire biaisé (bas = proche, haut = fond). */
export function starConquestRingPoint(
  angle: number,
  ringR = starConquestGalaxyRadius() * 0.62,
  tilt = starConquestRingTilt()
): { x: number; y: number; z: number } {
  const cosT = Math.cos(tilt);
  const sinT = Math.sin(tilt);
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return {
    x: c * ringR,
    // Raccourci vertical du biais
    y: s * ringR * cosT,
    // Bas (s < 0) → +Z près du joueur ; haut → −Z au fond
    z: -s * ringR * sinT,
  };
}

/**
 * Cinq galaxies (familles) sur le cercle nébuleuse biaisé — cadré 250×550.
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
    const p = starConquestRingPoint(angle, ring);
    const depthT = Math.max(
      0,
      Math.min(1, (p.z / Math.max(depthAmp, 1e-6) + 1) * 0.5)
    );
    return {
      family,
      familyIndex: i,
      angle,
      x: p.x,
      y: p.y,
      z: p.z,
      depthT,
      clusterScale: 0.4 + depthT * 0.6,
    };
  });
}

/** Cellules ruche (legacy / tests) — une par famille. */
export function starConquestHiveCells(
  galaxyR = starConquestGalaxyRadius()
): readonly StarConquestHiveCell[] {
  const cosT = Math.cos(starConquestRingTilt());
  return starConquestGalaxiesOnRing(0, galaxyR).map((g) => ({
    family: g.family,
    angle: g.angle,
    depthZ: g.z,
    radius: Math.hypot(g.x, Math.abs(cosT) > 1e-4 ? g.y / cosT : g.y),
  }));
}

export function hiveCellCenter(cell: StarConquestHiveCell): {
  x: number;
  y: number;
  z: number;
} {
  const p = starConquestRingPoint(cell.angle, cell.radius);
  return { x: p.x, y: p.y, z: p.z };
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
