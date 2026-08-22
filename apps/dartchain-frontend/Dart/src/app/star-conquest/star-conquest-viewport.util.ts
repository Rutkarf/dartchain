import {
  STAR_CONQUEST_DESIGN_VIEWPORT,
  type StarConquestGpuQuality,
} from './star-conquest-scale';

/** Viewport produit exclusif — dev = prod = 250×550. */
export const SC_LAYOUT_W = STAR_CONQUEST_DESIGN_VIEWPORT.w;
export const SC_LAYOUT_H = STAR_CONQUEST_DESIGN_VIEWPORT.h;

export function starConquestRenderSize(): { width: number; height: number } {
  return { width: SC_LAYOUT_W, height: SC_LAYOUT_H };
}

export function starConquestLayoutWidth(): number {
  return SC_LAYOUT_W;
}

export function starConquestLayoutHeight(): number {
  return SC_LAYOUT_H;
}

/** Échelle DOM → espace layout 250×550 (dev sur grand écran). */
export function starConquestDomToLayoutScale(): { scaleX: number; scaleY: number } {
  if (typeof window === 'undefined') {
    return { scaleX: 1, scaleY: 1 };
  }
  return {
    scaleX: SC_LAYOUT_W / Math.max(window.innerWidth, 1),
    scaleY: SC_LAYOUT_H / Math.max(window.innerHeight, 1),
  };
}

export function starConquestScaleDomLength(
  value: number,
  axis: 'x' | 'y' = 'y'
): number {
  const { scaleX, scaleY } = starConquestDomToLayoutScale();
  return value * (axis === 'x' ? scaleX : scaleY);
}

/** Pointer DOM → espace layout 250×550. */
export function starConquestClientToLayout(
  clientX: number,
  clientY: number
): { x: number; y: number } {
  const { scaleX, scaleY } = starConquestDomToLayoutScale();
  return { x: clientX * scaleX, y: clientY * scaleY };
}

/** NDC Three.js → px layout 250×550. */
export function starConquestNdcToLayout(
  ndcX: number,
  ndcY: number
): { x: number; y: number } {
  return {
    x: (ndcX * 0.5 + 0.5) * SC_LAYOUT_W,
    y: (-ndcY * 0.5 + 0.5) * SC_LAYOUT_H,
  };
}

export interface StarConquestFramePerfHints {
  occlusionIntervalMs: number;
  labelIntervalMs: number;
  skipRenderWhenIdleDual: boolean;
}

const FRAME_HINTS: Record<StarConquestGpuQuality, StarConquestFramePerfHints> = {
  'ultra-low': {
    occlusionIntervalMs: 480,
    labelIntervalMs: 88,
    skipRenderWhenIdleDual: true,
  },
  low: {
    occlusionIntervalMs: 360,
    labelIntervalMs: 56,
    skipRenderWhenIdleDual: true,
  },
  medium: {
    occlusionIntervalMs: 280,
    labelIntervalMs: 48,
    skipRenderWhenIdleDual: false,
  },
  high: {
    occlusionIntervalMs: 240,
    labelIntervalMs: 40,
    skipRenderWhenIdleDual: false,
  },
};

export function starConquestFramePerfHints(
  _quality: StarConquestGpuQuality = 'ultra-low'
): StarConquestFramePerfHints {
  return FRAME_HINTS['ultra-low'];
}
