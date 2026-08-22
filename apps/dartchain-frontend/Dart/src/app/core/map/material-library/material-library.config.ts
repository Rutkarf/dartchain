import type { MapQuality } from '../map-configuration';
import { mapPerfProfile } from '../marseille-perf.config';

/** Niveau de détail PBR — Phase 7 + 14 perf profile. */
export type PbrDetailLevel = 'flat' | 'albedo' | 'full';

export function pbrDetailForQuality(quality: MapQuality): PbrDetailLevel {
  return mapPerfProfile(quality).pbrDetail;
}

export const PBR_TEXTURE_DEFAULTS = {
  anisotropy: 8,
  asphaltRepeat: [8, 28] as const,
  sidewalkRepeat: [6, 6] as const,
  quayRepeat: [4, 4] as const,
  esplanadeRepeat: [3, 3] as const,
  curbRepeat: [12, 2] as const,
  roofRepeat: [1.4, 1.4] as const,
} as const;
