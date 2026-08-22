/**
 * Qualité déclarée de chaque donnée géographique metaverseBB.
 * Ne jamais promouvoir PLACEHOLDER / APPROXIMATE en VERIFIED sans source licenciée.
 */
export type GeoSourceQuality =
  | 'VERIFIED'
  | 'PROJECTED'
  | 'APPROXIMATE'
  | 'PLACEHOLDER'
  | 'UNKNOWN';

export const GEO_SOURCE_QUALITY_ORDER: readonly GeoSourceQuality[] = [
  'VERIFIED',
  'PROJECTED',
  'APPROXIMATE',
  'PLACEHOLDER',
  'UNKNOWN',
] as const;

export function isSurveyGrade(quality: GeoSourceQuality): boolean {
  return quality === 'VERIFIED';
}

export function mayPresentAsRealGeometry(quality: GeoSourceQuality): boolean {
  return quality === 'VERIFIED' || quality === 'PROJECTED';
}
