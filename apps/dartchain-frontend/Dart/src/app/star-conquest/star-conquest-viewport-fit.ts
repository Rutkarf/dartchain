import { STAR_CONQUEST_DESIGN_VIEWPORT, starConquestOverlayBox } from './star-conquest-scale';

export interface StarConquestRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function starConquestRectFitsViewport(
  rect: StarConquestRect,
  vw = STAR_CONQUEST_DESIGN_VIEWPORT.w,
  vh = STAR_CONQUEST_DESIGN_VIEWPORT.h,
  margin = 0
): boolean {
  return (
    rect.x >= margin &&
    rect.y >= margin &&
    rect.x + rect.w <= vw - margin &&
    rect.y + rect.h <= vh - margin &&
    rect.w > 0 &&
    rect.h > 0
  );
}

export function starConquestOverlayFitsDesignViewport(): boolean {
  const box = starConquestOverlayBox();
  const panel: StarConquestRect = {
    x: box.margin,
    y: box.margin,
    w: box.panelW,
    h: box.panelH,
  };
  const scanner: StarConquestRect = {
    x: box.margin,
    y: box.margin,
    w: box.scannerW,
    h: box.scannerH,
  };
  return (
    starConquestRectFitsViewport(panel, 250, 550, 0) &&
    starConquestRectFitsViewport(scanner, 250, 550, 0) &&
    panel.y + panel.h <= box.usableBottom &&
    scanner.y + scanner.h <= box.usableBottom
  );
}
