/**
 * Diagnostics profondeur (dev-only) — pas de HUD produit.
 */

import { STAR_DEPTH_LAYERS } from './star-conquest-depth';
import { starConquestGalaxyRadius } from './star-conquest-ui-maturity.config';

export interface StarConquestDepthDiag {
  galaxyRadius: number;
  farZ: number;
  midZ: number;
  nearZ: number;
  zSpan: number;
}

export function describeStarConquestDepth(): StarConquestDepthDiag {
  const farZ = STAR_DEPTH_LAYERS.far.zCenter;
  const nearZ = STAR_DEPTH_LAYERS.near.zCenter;
  return {
    galaxyRadius: starConquestGalaxyRadius(),
    farZ,
    midZ: STAR_DEPTH_LAYERS.mid.zCenter,
    nearZ,
    zSpan: nearZ - farZ,
  };
}
