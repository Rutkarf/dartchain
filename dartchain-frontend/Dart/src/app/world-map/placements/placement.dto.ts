import type {
  CampaignCta,
  CampaignCreative,
  MerchantProfile,
  Money,
  PlacementAvailability,
  PlacementCampaign,
  PlacementOffer,
} from './commercial.model';
import type { GeoCoordinate } from './coordinates.model';
import type { PlacementInquiryResponse } from './inquiry.model';
import type {
  PlacementBounds,
  PlacementBuilding,
  PlacementDisplayPolicy,
  PlacementFacing,
  SponsoredPlacement,
} from './placement.model';
import type { WorldCoordinate } from './coordinate-system';

export type PlacementPayloadSource = 'authorized-api' | 'fixture-dev';

export interface PlacementGeoDto {
  latitude: number;
  longitude: number;
  altitude?: number;
  source?: GeoCoordinate['source'];
}

export interface PlacementWorldDto {
  x: number;
  y: number;
  z: number;
  coordinateSystemVersion?: string;
}

export interface PlacementBuildingDto {
  id: string;
  label: string;
  geo?: PlacementGeoDto;
  world: PlacementWorldDto;
  visualVariant?: string;
  status?: PlacementBuilding['status'];
}

export interface SponsoredPlacementDto {
  id: string;
  buildingId: string;
  placementType?: SponsoredPlacement['placementType'];
  anchorWorld: PlacementWorldDto;
  anchorGeo?: PlacementGeoDto;
  bounds?: PlacementBounds;
  facing?: PlacementFacing;
  visibilityTier?: SponsoredPlacement['visibilityTier'];
  status?: SponsoredPlacement['status'];
  merchantId?: string;
  campaignId?: string;
  displayPolicy?: Partial<PlacementDisplayPolicy>;
}

export interface MerchantProfileDto {
  id: string;
  displayName: string;
  category?: string;
  verifiedStatus?: MerchantProfile['verifiedStatus'];
  publicProfile?: MerchantProfile['publicProfile'];
}

export interface PlacementCampaignDto {
  id: string;
  placementId: string;
  merchantId: string;
  title: string;
  creative?: Partial<CampaignCreative>;
  cta?: Partial<CampaignCta>;
  startAt: string;
  endAt: string;
  status?: PlacementCampaign['status'];
}

export interface PlacementOfferDto {
  id: string;
  placementId: string;
  commercialModel?: PlacementOffer['commercialModel'];
  price?: Money;
  availability?: PlacementAvailability;
  termsUrl?: string;
}

export interface MetaversePlacementsResponseDto {
  type: string;
  source: PlacementPayloadSource | string;
  serverTime: string;
  buildings?: PlacementBuildingDto[];
  placements: SponsoredPlacementDto[];
  merchants?: MerchantProfileDto[];
  campaigns?: PlacementCampaignDto[];
  offers?: PlacementOfferDto[];
}

export interface MetaversePlacementDetailDto {
  type: string;
  source: PlacementPayloadSource | string;
  serverTime: string;
  building: PlacementBuildingDto;
  placement: SponsoredPlacementDto;
  merchant?: MerchantProfileDto;
  campaign?: PlacementCampaignDto;
  offer?: PlacementOfferDto;
}

export interface PlacementInquiryResponseDto {
  inquiryId: string;
  status: PlacementInquiryResponse['status'];
  message?: string;
}
