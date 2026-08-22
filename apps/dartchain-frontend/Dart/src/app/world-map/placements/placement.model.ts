import type { GeoCoordinate, WorldCoordinate } from './coordinates.model';

/**
 * Bâtiment côté inventaire commercial.
 * Ne pas confondre avec wigle.types.BuildingReference (AABB + entrée WiFi).
 */
export type PlacementBuildingStatus = 'active' | 'draft' | 'hidden' | 'archived';

export interface PlacementBuilding {
  id: string;
  label: string;
  geo?: GeoCoordinate;
  world: WorldCoordinate;
  visualVariant: string;
  status: PlacementBuildingStatus;
}

export type SponsoredPlacementType =
  | 'ground-floor-storefront'
  | 'entrance-panel'
  | 'street-display'
  | 'other';

export type PlacementInventoryStatus =
  | 'available'
  | 'reserved'
  | 'active'
  | 'paused'
  | 'expired'
  | 'unavailable';

export type PlacementVisibilityTier = 'standard' | 'featured' | 'premium';

export interface PlacementBounds {
  width: number;
  height: number;
  depth: number;
}

export interface PlacementFacing {
  facingRad: number;
}

export interface PlacementDisplayPolicy {
  showWhenUnselected: boolean;
  minDistanceMeters?: number;
  maxDistanceMeters?: number;
}

export interface SponsoredPlacement {
  id: string;
  buildingId: string;
  placementType: SponsoredPlacementType;
  anchorWorld: WorldCoordinate;
  anchorGeo?: GeoCoordinate;
  bounds?: PlacementBounds;
  facing?: PlacementFacing;
  visibilityTier?: PlacementVisibilityTier;
  status: PlacementInventoryStatus;
  merchantId?: string;
  campaignId?: string;
  displayPolicy: PlacementDisplayPolicy;
}
