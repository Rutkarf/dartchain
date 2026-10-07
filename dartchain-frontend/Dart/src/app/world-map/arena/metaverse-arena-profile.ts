import type { MapQuality } from '../map-configuration';
import { mapPerfProfile } from '../metaverse-perf.config';

/**
 * Profil MetaVerseBB Arena — night-tech ciné, lisibilité combat, coût GPU réduit.
 */
export const METAVERSE_ARENA_PROFILE = {
  id: 'metaversebb-night-tech-v1',
  playRadiusMeters: 72,
  /**
   * Monde allégé MetaVerseBB (code intact).
   * true = désactive bâtiments / WiGLE / colliders bâtiments / urban props / placements.
   * Conservé : sol, mer, ombrière, station métro, pièces, persos, bots, HUD/joysticks/fire.
   * Réactivation monde complet = `false`.
   */
  slimWorldEnabled: true,
  /** Palette night-tech — verre sombre + accents cyan / magenta. */
  palette: {
    /** Terrain fond — bleu nuit. */
    sand: 0x0d0630,
    /** Allées / routes — vitre teintée. */
    ochre: 0x0d0630,
    terracotta: 0x18314f,
    /** Esplanade — verre clair froid. */
    offWhite: 0x18314f,
    warmGray: 0x18314f,
    sea: 0x09814a,
    /** Accents grille (réf. matériaux). */
    neonCyan: 0x8a95a5,
    neonMagenta: 0x7b0d1e,
    glassDeep: 0x0d0630,
  },
  fog: {
    enabled: true,
    color: 0x0d0630,
    near: 100,
    far: 480,
  },
  light: {
    keyColor: 0xede7d9,
    keyIntensity: 0.55,
    ambientColor: 0x8a95a5,
    ambientIntensity: 0.28,
    hemiSky: 0x18314f,
    hemiGround: 0x0d0630,
    hemiIntensity: 0.32,
  },
  toneMappingExposure: 1.06,
  environmentIntensity: 0.68,
  nightShift: true,
  landmarkHints: ['harbor', 'ombriere', 'quay', 'district-massing'] as const,
} as const;

/** Monde MetaVerseBB allégé quand le produit arène + flag slim sont actifs. */
export function isArenaSlimWorld(metaverseArenaEnabled: boolean): boolean {
  return metaverseArenaEnabled && METAVERSE_ARENA_PROFILE.slimWorldEnabled;
}

export type MetaverseArenaProfile = typeof METAVERSE_ARENA_PROFILE;

/** Ajustements perf quand le profil arène est actif (sans changer les caps OSM du profil de base). */
export function arenaPerfOverrides(quality: MapQuality) {
  const base = mapPerfProfile(quality);
  return {
    ...base,
    spawnShadows: false,
    spotLightShadows: false,
    useTaa: false,
    useSsao: false,
    bloomStrengthScale: Math.min(base.bloomStrengthScale, 0.28),
    shadowMapSize: Math.min(base.shadowMapSize, 512),
    streamingHazePanels: Math.min(base.streamingHazePanels, 2),
  };
}
