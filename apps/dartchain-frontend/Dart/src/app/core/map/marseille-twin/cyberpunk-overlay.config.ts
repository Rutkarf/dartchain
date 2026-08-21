/**
 * Overlay cyberpunk — couche visuelle additive (hologrammes enseigne).
 * N’altère pas la géométrie des rues, le spawn, ni les colliders.
 */
export const MARSEILLE_CYBERPUNK_OVERLAY = {
  enabled: false,
  layerName: 'marseille-cyberpunk-overlay',
  neonIntensity: 0.55,
  hologramOpacity: 0.28,
  wetReflection: false,
  nightShift: false,
  geometricDeviation: 'CYBERPUNK_VISUAL_ONLY' as const,
} as const;

export type CyberpunkOverlayConfig = typeof MARSEILLE_CYBERPUNK_OVERLAY;

export function shouldAttachCyberpunkOverlay(): boolean {
  return MARSEILLE_CYBERPUNK_OVERLAY.enabled;
}
