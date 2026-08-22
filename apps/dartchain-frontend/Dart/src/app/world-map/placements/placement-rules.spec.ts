import { createDevPlacementFixtures } from './placement-fixtures.dev';
import { mapPlacementsResponse } from './placement.mapper';
import {
  isInquiryCtaEnabled,
  isPlacementVisible,
  isTransactionalCtaEnabled,
  resolveAuthoritativePlacementStatus,
  resolvePlacementDataFallback,
} from './placement-rules';

describe('placement-rules', () => {
  const catalog = mapPlacementsResponse(createDevPlacementFixtures());

  it('sert les fixtures DEV hors production, jamais en production sans payload', () => {
    expect(resolvePlacementDataFallback(false, false)).toBe('fixture-dev');
    expect(resolvePlacementDataFallback(true, false)).toBe('empty-error');
    expect(resolvePlacementDataFallback(true, true)).toBe('api');
    expect(resolvePlacementDataFallback(false, true)).toBe('api');
  });

  it('ne déduit pas active depuis une date locale', () => {
    const paused = catalog!.placements.find((item) => item.id === 'dev-placement-04')!;
    expect(
      resolveAuthoritativePlacementStatus(paused, '2099-01-01T00:00:00.000Z')
    ).toBe('paused');
  });

  it('autorise le CTA inquiry seulement sur available/active + offre inquiry/quote', () => {
    const available = catalog!.placements.find((item) => item.id === 'dev-placement-01')!;
    const building = catalog!.buildings.find((item) => item.id === available.buildingId)!;
    const offer = catalog!.offers.find((item) => item.placementId === available.id);
    expect(isPlacementVisible(building, available)).toBe(true);
    expect(isInquiryCtaEnabled(building, available, offer)).toBe(true);

    const paused = catalog!.placements.find((item) => item.id === 'dev-placement-04')!;
    const pausedBuilding = catalog!.buildings.find((item) => item.id === paused.buildingId)!;
    const pausedOffer = catalog!.offers.find((item) => item.placementId === paused.id);
    expect(isInquiryCtaEnabled(pausedBuilding, paused, pausedOffer)).toBe(false);
    expect(isTransactionalCtaEnabled(pausedOffer)).toBe(false);
  });

  it('refuse checkout/reservation côté client même si le DTO le propose', () => {
    const checkoutOffer = catalog!.offers.find((item) => item.id === 'dev-offer-04')!;
    expect(checkoutOffer.commercialModel).toBe('checkout');
    expect(isTransactionalCtaEnabled(checkoutOffer)).toBe(false);
  });
});
