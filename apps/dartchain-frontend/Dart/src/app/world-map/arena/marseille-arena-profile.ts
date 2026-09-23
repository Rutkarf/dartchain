import type { MapQuality } from '../map-configuration';
import { mapPerfProfile } from '../marseille-perf.config';

/**
 * Profil B+ — upgrade flaggé du rendu Marseille sans réécrire MarseilleMapProvider.
 * Palette méditerranéenne fin d’après-midi, arène compacte, coût GPU réduit.
 */
export const MARSEILLE_ARENA_PROFILE = {
  id: 'mediterranean-arena-v1',
  playRadiusMeters: 72,
  /** Palette ocre / sable / terracotta / gris chaud. */
  palette: {
    sand: 0xc4a574,
    ochre: 0xb8834a,
    terracotta: 0xc46b4a,
    offWhite: 0xe8e0d4,
    warmGray: 0x8a8478,
    sea: 0x3a7a8c,
  },
  fog: {
    enabled: true,
    color: 0xd4c4a8,
    near: 90,
    far: 420,
  },
  light: {
    keyColor: 0xffd8a8,
    keyIntensity: 0.72,
    ambientColor: 0xffe8d0,
    ambientIntensity: 0.34,
    hemiSky: 0xffe4c4,
    hemiGround: 0x8a7050,
    hemiIntensity: 0.28,
  },
  toneMappingExposure: 1.08,
  environmentIntensity: 0.55,
  nightShift: false,
  /** Landmarks stylisés (noms UI uniquement). */
  landmarkHints: ['vieux-port', 'ombriere', 'quai', 'panier-massing'] as const,
} as const;

export type MarseilleArenaProfile = typeof MARSEILLE_ARENA_PROFILE;

/** Ajustements perf quand le profil arène est actif (sans changer les caps OSM). */
export function arenaPerfOverrides(quality: MapQuality) {
  const base = mapPerfProfile(quality);
  return {
    ...base,
    spawnShadows: false,
    spotLightShadows: false,
    useTaa: false,
    useSsao: false,
    bloomStrengthScale: Math.min(base.bloomStrengthScale, 0.2),
    shadowMapSize: Math.min(base.shadowMapSize, 512),
    streamingHazePanels: Math.min(base.streamingHazePanels, 2),
  };
}
