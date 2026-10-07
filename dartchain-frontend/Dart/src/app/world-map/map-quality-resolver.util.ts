import type { MapQuality } from './map-configuration';

export const MAP_QUALITY_PARAM = 'mapQuality';

/** Qualité produit verrouillée — dartchain.pages.dev charge toujours ultra-low. */
export const PRODUCT_MAP_QUALITY: MapQuality = 'ultra-low';

const MAP_QUALITY_SET = new Set<MapQuality>(['ultra-low', 'low', 'medium', 'high']);

export function isMapQuality(value: string | null | undefined): value is MapQuality {
  return value != null && MAP_QUALITY_SET.has(value as MapQuality);
}

/** @deprecated Ignoré en prod — conservé pour compat tests / debug interne. */
export function readMapQualityFromUrl(
  search = typeof globalThis !== 'undefined' && 'location' in globalThis
    ? (globalThis as unknown as Window).location.search
    : ''
): MapQuality | undefined {
  const raw = new URLSearchParams(search).get(MAP_QUALITY_PARAM);
  return isMapQuality(raw) ? raw : undefined;
}

/** Toujours ultra-low — low/medium/high désactivés (fluidité 250×550). */
export function resolveMapQuality(_options?: {
  urlQuality?: MapQuality;
  envQuality?: MapQuality;
  fallback?: MapQuality;
}): MapQuality {
  return PRODUCT_MAP_QUALITY;
}
