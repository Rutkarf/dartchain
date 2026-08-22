import type { PlacementCampaign } from './commercial.model';
import type { PlacementOffer } from './commercial.model';
import type { PlacementBuilding, SponsoredPlacement } from './placement.model';

export type PlacementDataFallback = 'api' | 'fixture-dev' | 'empty-error';

export function resolvePlacementDataFallback(
  isProduction: boolean,
  hasPayload: boolean
): PlacementDataFallback {
  if (hasPayload) return 'api';
  if (!isProduction) return 'fixture-dev';
  return 'empty-error';
}

export function isPlacementBuildingVisible(building: PlacementBuilding): boolean {
  return building.status === 'active';
}

export function isPlacementVisible(
  building: PlacementBuilding,
  placement: SponsoredPlacement
): boolean {
  if (!isPlacementBuildingVisible(building)) return false;
  return placement.status !== 'unavailable';
}

/** Le frontend n’infère pas `active` depuis les dates : le statut API prime. */
export function resolveAuthoritativePlacementStatus(
  placement: SponsoredPlacement,
  _nowIso?: string
): SponsoredPlacement['status'] {
  return placement.status;
}

export function isTransactionalCtaEnabled(
  offer: PlacementOffer | undefined
): boolean {
  if (!offer) return false;
  if (offer.commercialModel === 'reservation' || offer.commercialModel === 'checkout') {
    return false;
  }
  return offer.commercialModel === 'inquiry' || offer.commercialModel === 'quote';
}

export function isInquiryCtaEnabled(
  building: PlacementBuilding,
  placement: SponsoredPlacement,
  offer: PlacementOffer | undefined,
  campaign?: PlacementCampaign
): boolean {
  if (!isPlacementVisible(building, placement)) return false;
  if (placement.status !== 'available' && placement.status !== 'active') {
    return false;
  }
  if (campaign && campaign.status === 'rejected') return false;
  return isTransactionalCtaEnabled(offer);
}
