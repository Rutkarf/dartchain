import type { GeoSourceQuality } from './source-quality';
import type { BuildingLodLevel } from './building-lod.model';

export type FacadeCategory =
  | 'harbor-arcade'
  | 'ground-storefront'
  | 'residential'
  | 'landmark'
  | 'unknown';

export type RoofShape = 'flat' | 'unknown';

/**
 * Jumeau bâtiment — identité séparée du mesh Three.js et de l overlay.
 */
export interface MarseilleBuildingTwin {
  id: string;
  identityLabel: string;
  footprintSource: GeoSourceQuality;
  heightSource: GeoSourceQuality;
  heightMeters?: number;
  roofShape: RoofShape;
  facadeCategory: FacadeCategory;
  streetOrientationRadians?: number;
  worldAnchor: { x: number; y: number; z: number };
  cyberpunkVariant: 'none' | 'neon-trim' | 'hologram-bay';
  lod: BuildingLodLevel;
  licenceProvenance: string;
}

export function twinIsGameplayPlaceholder(twin: MarseilleBuildingTwin): boolean {
  return twin.footprintSource === 'PLACEHOLDER' || twin.heightSource === 'PLACEHOLDER';
}
