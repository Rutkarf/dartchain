import {
  MARSEILLE_COORDINATE_SYSTEM_VERSION,
  toWorldCoordinate,
} from './coordinate-system';
import type {
  CampaignCta,
  MerchantProfile,
  PlacementCampaign,
  PlacementOffer,
} from './commercial.model';
import type { GeoCoordinate } from './coordinates.model';
import type { PlacementInquiryResponse } from './inquiry.model';
import type {
  PlacementBuilding,
  PlacementDisplayPolicy,
  SponsoredPlacement,
} from './placement.model';
import type {
  MerchantProfileDto,
  MetaversePlacementDetailDto,
  MetaversePlacementsResponseDto,
  PlacementBuildingDto,
  PlacementCampaignDto,
  PlacementGeoDto,
  PlacementInquiryResponseDto,
  PlacementOfferDto,
  PlacementWorldDto,
  SponsoredPlacementDto,
} from './placement.dto';

export interface PlacementCatalog {
  source: 'authorized-api' | 'fixture-dev';
  serverTime: string;
  buildings: PlacementBuilding[];
  placements: SponsoredPlacement[];
  merchants: MerchantProfile[];
  campaigns: PlacementCampaign[];
  offers: PlacementOffer[];
}

export interface PlacementDetail {
  source: 'authorized-api' | 'fixture-dev';
  serverTime: string;
  building: PlacementBuilding;
  placement: SponsoredPlacement;
  merchant?: MerchantProfile;
  campaign?: PlacementCampaign;
  offer?: PlacementOffer;
}

const BUILDING_STATUSES = new Set<PlacementBuilding['status']>([
  'active',
  'draft',
  'hidden',
  'archived',
]);

const PLACEMENT_STATUSES = new Set<SponsoredPlacement['status']>([
  'available',
  'reserved',
  'active',
  'paused',
  'expired',
  'unavailable',
]);

const PLACEMENT_TYPES = new Set<SponsoredPlacement['placementType']>([
  'ground-floor-storefront',
  'entrance-panel',
  'street-display',
  'other',
]);

const MERCHANT_STATUSES = new Set<MerchantProfile['verifiedStatus']>([
  'unverified',
  'pending',
  'verified',
  'suspended',
]);

const CAMPAIGN_STATUSES = new Set<PlacementCampaign['status']>([
  'draft',
  'scheduled',
  'active',
  'paused',
  'expired',
  'rejected',
]);

const OFFER_MODELS = new Set<PlacementOffer['commercialModel']>([
  'inquiry',
  'quote',
  'reservation',
  'checkout',
]);

const CTA_KINDS = new Set<CampaignCta['kind']>([
  'inquiry',
  'quote',
  'reservation',
  'checkout',
]);

const GEO_SOURCES = new Set<GeoCoordinate['source']>([
  'verified',
  'approximate',
  'projected',
  'unknown',
]);

const DEFAULT_DISPLAY_POLICY: PlacementDisplayPolicy = {
  showWhenUnselected: true,
  maxDistanceMeters: 48,
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function mapGeo(dto?: PlacementGeoDto): GeoCoordinate | undefined {
  if (!dto || !isFiniteNumber(dto.latitude) || !isFiniteNumber(dto.longitude)) {
    return undefined;
  }
  const source = dto.source && GEO_SOURCES.has(dto.source) ? dto.source : 'unknown';
  return {
    latitude: dto.latitude,
    longitude: dto.longitude,
    altitude: isFiniteNumber(dto.altitude) ? dto.altitude : undefined,
    source,
  };
}

function mapWorld(dto: PlacementWorldDto | undefined): ReturnType<typeof toWorldCoordinate> | null {
  if (!dto || !isFiniteNumber(dto.x) || !isFiniteNumber(dto.y) || !isFiniteNumber(dto.z)) {
    return null;
  }
  if (
    dto.coordinateSystemVersion &&
    dto.coordinateSystemVersion !== MARSEILLE_COORDINATE_SYSTEM_VERSION
  ) {
    return null;
  }
  return toWorldCoordinate(dto.x, dto.y, dto.z);
}

export function mapBuildingDto(dto: PlacementBuildingDto): PlacementBuilding | null {
  if (!dto?.id || !dto.label) return null;
  const world = mapWorld(dto.world);
  if (!world) return null;
  const status = dto.status && BUILDING_STATUSES.has(dto.status) ? dto.status : 'hidden';
  return {
    id: dto.id,
    label: dto.label,
    geo: mapGeo(dto.geo),
    world,
    visualVariant: dto.visualVariant ?? 'ground-storefront-v1',
    status,
  };
}

export function mapPlacementDto(dto: SponsoredPlacementDto): SponsoredPlacement | null {
  if (!dto?.id || !dto.buildingId) return null;
  const anchorWorld = mapWorld(dto.anchorWorld);
  if (!anchorWorld) return null;
  const status =
    dto.status && PLACEMENT_STATUSES.has(dto.status) ? dto.status : 'unavailable';
  const placementType =
    dto.placementType && PLACEMENT_TYPES.has(dto.placementType)
      ? dto.placementType
      : 'ground-floor-storefront';
  return {
    id: dto.id,
    buildingId: dto.buildingId,
    placementType,
    anchorWorld,
    anchorGeo: mapGeo(dto.anchorGeo),
    bounds: dto.bounds,
    facing: dto.facing,
    visibilityTier: dto.visibilityTier,
    status,
    merchantId: dto.merchantId,
    campaignId: dto.campaignId,
    displayPolicy: {
      ...DEFAULT_DISPLAY_POLICY,
      ...dto.displayPolicy,
    },
  };
}

export function mapMerchantDto(dto: MerchantProfileDto): MerchantProfile | null {
  if (!dto?.id || !dto.displayName) return null;
  const verifiedStatus =
    dto.verifiedStatus && MERCHANT_STATUSES.has(dto.verifiedStatus)
      ? dto.verifiedStatus
      : 'unverified';
  return {
    id: dto.id,
    displayName: dto.displayName,
    category: dto.category,
    verifiedStatus,
    publicProfile: dto.publicProfile,
  };
}

export function mapCampaignDto(dto: PlacementCampaignDto): PlacementCampaign | null {
  if (!dto?.id || !dto.placementId || !dto.merchantId || !dto.title) return null;
  const status =
    dto.status && CAMPAIGN_STATUSES.has(dto.status) ? dto.status : 'draft';
  const ctaKind =
    dto.cta?.kind && CTA_KINDS.has(dto.cta.kind) ? dto.cta.kind : 'inquiry';
  return {
    id: dto.id,
    placementId: dto.placementId,
    merchantId: dto.merchantId,
    title: dto.title,
    creative: {
      headline: dto.creative?.headline?.trim() || dto.title,
      body: dto.creative?.body,
      assetKey: dto.creative?.assetKey,
    },
    cta: {
      kind: ctaKind,
      label: dto.cta?.label?.trim() || 'Demander un devis',
    },
    startAt: dto.startAt,
    endAt: dto.endAt,
    status,
  };
}

export function mapOfferDto(dto: PlacementOfferDto): PlacementOffer | null {
  if (!dto?.id || !dto.placementId) return null;
  const commercialModel =
    dto.commercialModel && OFFER_MODELS.has(dto.commercialModel)
      ? dto.commercialModel
      : 'inquiry';
  return {
    id: dto.id,
    placementId: dto.placementId,
    commercialModel,
    price: dto.price,
    availability: dto.availability ?? {},
    termsUrl: dto.termsUrl,
  };
}

export function mapInquiryResponseDto(
  dto: PlacementInquiryResponseDto
): PlacementInquiryResponse | null {
  if (!dto?.inquiryId) return null;
  if (dto.status !== 'received' && dto.status !== 'rejected') return null;
  return {
    inquiryId: dto.inquiryId,
    status: dto.status,
    message: dto.message,
  };
}

function catalogSource(
  raw: string | undefined
): PlacementCatalog['source'] {
  return raw === 'fixture-dev' ? 'fixture-dev' : 'authorized-api';
}

export function mapPlacementsResponse(
  dto: MetaversePlacementsResponseDto
): PlacementCatalog | null {
  if (!dto || !Array.isArray(dto.placements)) return null;
  const buildings = (dto.buildings ?? [])
    .map(mapBuildingDto)
    .filter((item): item is PlacementBuilding => item !== null);
  const placements = dto.placements
    .map(mapPlacementDto)
    .filter((item): item is SponsoredPlacement => item !== null);
  const buildingIds = new Set(buildings.map((item) => item.id));
  const linked = placements.filter((item) => buildingIds.has(item.buildingId));
  return {
    source: catalogSource(dto.source),
    serverTime: dto.serverTime || new Date(0).toISOString(),
    buildings,
    placements: linked,
    merchants: (dto.merchants ?? [])
      .map(mapMerchantDto)
      .filter((item): item is MerchantProfile => item !== null),
    campaigns: (dto.campaigns ?? [])
      .map(mapCampaignDto)
      .filter((item): item is PlacementCampaign => item !== null),
    offers: (dto.offers ?? [])
      .map(mapOfferDto)
      .filter((item): item is PlacementOffer => item !== null),
  };
}

export function mapPlacementDetail(
  dto: MetaversePlacementDetailDto
): PlacementDetail | null {
  const building = mapBuildingDto(dto?.building);
  const placement = mapPlacementDto(dto?.placement);
  if (!building || !placement || placement.buildingId !== building.id) return null;
  return {
    source: catalogSource(dto.source),
    serverTime: dto.serverTime || new Date(0).toISOString(),
    building,
    placement,
    merchant: dto.merchant ? mapMerchantDto(dto.merchant) ?? undefined : undefined,
    campaign: dto.campaign ? mapCampaignDto(dto.campaign) ?? undefined : undefined,
    offer: dto.offer ? mapOfferDto(dto.offer) ?? undefined : undefined,
  };
}
