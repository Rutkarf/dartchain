import { MIRROR_CANOPY } from '../vieux-port-mirror-canopy.util';
import type { GeoSourceQuality } from './source-quality';

/**
 * Cible de validation publiée (canopée Ombrière).
 * Ne remplace pas `MIRROR_CANOPY` gameplay — écart géométrique documenté.
 * Pas une géométrie Foster + Partners ; pas une vérité cadastrale.
 */
export const OMBRIERE_PUBLISHED_FOOTPRINT = {
  lengthMeters: 46,
  widthMeters: 22,
  form: 'open-sided-pavilion',
  sourceQuality: 'APPROXIMATE' as GeoSourceQuality,
  sourceNotes:
    'Published target dimensions for calibration only. Not loaded from licensed drawings.',
} as const;

export interface GeometricDeviation {
  baseGeometry: GeoSourceQuality;
  stylizedOverlay: 'CYBERPUNK_VISUAL_ONLY' | 'NONE';
  lengthDeltaMeters: number;
  widthDeltaMeters: number;
  notes: string;
}

export function ombriereGameplayDeviation(): GeometricDeviation {
  return {
    baseGeometry: 'PLACEHOLDER',
    stylizedOverlay: 'NONE',
    lengthDeltaMeters: MIRROR_CANOPY.width - OMBRIERE_PUBLISHED_FOOTPRINT.lengthMeters,
    widthDeltaMeters: MIRROR_CANOPY.depth - OMBRIERE_PUBLISHED_FOOTPRINT.widthMeters,
    notes:
      'Gameplay canopy remains 18.4×12.2 m under the spawn. Do not scale MIRROR_CANOPY to 46×22 without a compatibility layer.',
  };
}
