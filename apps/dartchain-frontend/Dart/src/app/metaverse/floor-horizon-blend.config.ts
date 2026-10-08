/**
 * Ciel metaverse + fondu vers Conquête stellaire.
 * Exclusive three-floor : ne pas réutiliser WORLD_BACKGROUND_CONFIG (navy partagé).
 *
 * Le canvas floor est opaque (ciel noir). Un masque CSS fond le haut de la bande
 * peek vers transparent pour laisser transparaître la nébuleuse (z-index 0).
 */
export const FLOOR_HORIZON_BLEND = {
  skyColor: 0x0d0630,
  /** Alpha du clear WebGL : 1 = ciel noir opaque (le masque CSS gère le fondu). */
  clearAlpha: 1,
  fog: {
    color: 0x0d0630,
    /** Visible Canebière / Panier — ne noircit plus le tissu urbain dès 180 m. */
    near: 520,
    far: 1400,
  },
  /**
   * Stops du masque, bas → haut de la bande peek (offset 0 = sol, 1 = démarcation).
   * Alpha 1 = metaverse opaque ; 0 = nébuleuse seule.
   * Fondu plus long (moins d’arête nette sous Star Conquest / FEED).
   */
  maskStops: [
    { offset: 0, alpha: 1 },
    { offset: 0.42, alpha: 1 },
    { offset: 0.58, alpha: 0.92 },
    { offset: 0.72, alpha: 0.55 },
    { offset: 0.86, alpha: 0.22 },
    { offset: 1, alpha: 0 },
  ],
} as const;

export type FloorHorizonMaskStop = (typeof FLOOR_HORIZON_BLEND.maskStops)[number];

export function floorHorizonMaskImage(): string {
  const stops = FLOOR_HORIZON_BLEND.maskStops
    .map((stop) => `rgba(10, 18, 32, ${stop.alpha}) ${(stop.offset * 100).toFixed(0)}%`)
    .join(', ');
  return `linear-gradient(to top, ${stops})`;
}
