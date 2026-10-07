import { measureFloorTopPx } from './star-conquest-layout';

/** Phase 26 — bande SC réellement rasterisée (hors zone floor). */
export interface StarConquestRenderBand {
  fullWidth: number;
  fullHeight: number;
  bandHeight: number;
  floorOcclusionPx: number;
}

export function measureStarConquestRenderBand(
  viewportW: number,
  viewportH: number,
  floorPeekPx = 220
): StarConquestRenderBand {
  const peek = Math.max(28, floorPeekPx);
  let floorTop = measureFloorTopPx(floorPeekPx, viewportH);

  // Le host `app-three-floor` peut couvrir tout l'écran — ignorer mesures trop basses.
  const expectedTop = Math.max(48, viewportH - peek);
  if (floorTop < viewportH * 0.35) {
    floorTop = expectedTop;
  }

  const bandHeight = Math.max(48, Math.min(viewportH - 8, Math.floor(floorTop)));
  const floorOcclusionPx = Math.max(0, viewportH - bandHeight);
  return {
    fullWidth: Math.max(32, viewportW),
    fullHeight: Math.max(32, viewportH),
    bandHeight,
    floorOcclusionPx,
  };
}
