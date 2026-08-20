import {
  GEO_SOURCE_QUALITY_ORDER,
  isSurveyGrade,
  mayPresentAsRealGeometry,
  type GeoSourceQuality,
} from './source-quality';

describe('source-quality (ITER-002)', () => {
  const all: readonly GeoSourceQuality[] = GEO_SOURCE_QUALITY_ORDER;

  it('liste les cinq niveaux exigés par la politique géographique', () => {
    expect(all).toEqual([
      'VERIFIED',
      'PROJECTED',
      'APPROXIMATE',
      'PLACEHOLDER',
      'UNKNOWN',
    ]);
  });

  it('interdit de présenter PLACEHOLDER comme géométrie réelle', () => {
    expect(mayPresentAsRealGeometry('PLACEHOLDER')).toBe(false);
    expect(mayPresentAsRealGeometry('APPROXIMATE')).toBe(false);
    expect(mayPresentAsRealGeometry('PROJECTED')).toBe(true);
    expect(isSurveyGrade('PROJECTED')).toBe(false);
    expect(isSurveyGrade('VERIFIED')).toBe(true);
  });
});
