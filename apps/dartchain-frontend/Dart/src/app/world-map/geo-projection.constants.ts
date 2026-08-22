/**
 * Constantes de projection locale équirectangulaire (zone urbaine Marseille).
 *
 * Repère Three.js :
 * - X : est (longitude croissante)
 * - Y : altitude (mètres)
 * - Z : sud (latitude décroissante) — le nord géographique est −Z
 * - Unité : 1 unité Three.js = 1 mètre (worldScale = 1)
 */
export const METERS_PER_DEGREE_LATITUDE = 111_320;

/** Facteur cos(latitude) pour la conversion longitude → mètres. */
export function metersPerDegreeLongitude(latitudeDegrees: number): number {
  return METERS_PER_DEGREE_LATITUDE * Math.cos((latitudeDegrees * Math.PI) / 180);
}
