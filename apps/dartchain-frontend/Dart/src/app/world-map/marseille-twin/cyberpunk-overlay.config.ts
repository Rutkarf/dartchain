import type { MapQuality } from '../map-configuration';
import { mapQualityTier } from '../map-configuration';

/**
 * Overlay cyberpunk — couche visuelle additive (hologrammes enseigne).
 * N’altère pas la géométrie des rues, le spawn, ni les colliders.
 */
export const MARSEILLE_CYBERPUNK_OVERLAY = {
  enabled: true,
  layerName: 'marseille-cyberpunk-overlay',
  neonIntensity: 0.55,
  hologramOpacity: 0.28,
  wetReflection: false,
  nightShift: false,
  geometricDeviation: 'CYBERPUNK_VISUAL_ONLY' as const,
} as const;

export type CyberpunkOverlayConfig = typeof MARSEILLE_CYBERPUNK_OVERLAY;

/** Phase 6 — overlay actif medium/high uniquement (master switch `enabled`). */
export function shouldAttachCyberpunkOverlay(quality: MapQuality = 'medium'): boolean {
  if (!MARSEILLE_CYBERPUNK_OVERLAY.enabled) return false;
  return mapQualityTier(quality).cyberpunkOverlay;
}
