/**
 * Gouverneur perf exclusif metaverseBB — n’écrase pas le profiler partagé.
 * Non branché sur le renderer tant que `enforceDprCap` est false.
 */
export const MARSEILLE_PERF_GOVERNOR = {
  enforceDprCap: false,
  maxDevicePixelRatio: 1.75,
  pauseWhenHidden: true,
  maxOverlaySignage: 24,
  mergeStaticOverlay: true,
} as const;
