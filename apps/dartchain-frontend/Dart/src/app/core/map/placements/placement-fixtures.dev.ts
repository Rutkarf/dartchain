import { MARSEILLE_COORDINATE_SYSTEM_VERSION } from './coordinate-system';
import type { MetaversePlacementsResponseDto } from './placement.dto';

/**
 * Fixtures DEV uniquement — partenaires fictifs, aucun commerçant réel.
 * Ids `dev-*` / `fixture-dev`. Ne jamais servir en production.
 */
export const PLACEMENT_FIXTURE_SOURCE = 'fixture-dev' as const;

const DEV_NOTICE =
  'DEV — emplacement fictif, non contractuel, aucun partenaire réel associé.';

export function createDevPlacementFixtures(
  serverTime = '2026-08-20T12:00:00.000Z'
): MetaversePlacementsResponseDto {
  return {
    type: 'METAVERSE_PLACEMENTS',
    source: PLACEMENT_FIXTURE_SOURCE,
    serverTime,
    buildings: [
      {
        id: 'mirror-adjacent-building-01',
        label: 'DEV — Immeuble nord-est Ombrière',
        geo: {
          latitude: 43.2946667,
          longitude: 5.3748399,
          source: 'verified',
        },
        world: {
          x: 58.1,
          y: 0,
          z: -7.5,
          coordinateSystemVersion: MARSEILLE_COORDINATE_SYSTEM_VERSION,
        },
        visualVariant: 'ground-storefront-v1',
        status: 'active',
      },
      {
        id: 'mirror-adjacent-building-02',
        label: 'DEV — Immeuble nord Ombrière',
        geo: {
          latitude: 43.2948349,
          longitude: 5.3747715,
          source: 'verified',
        },
        world: {
          x: 52.6,
          y: 0,
          z: -26.2,
          coordinateSystemVersion: MARSEILLE_COORDINATE_SYSTEM_VERSION,
        },
        visualVariant: 'ground-storefront-v1',
        status: 'active',
      },
      {
        id: 'harbor-west-building',
        label: 'DEV — Façade ouest Vieux-Port',
        geo: {
          latitude: 43.2938343,
          longitude: 5.3737687,
          source: 'approximate',
        },
        world: {
          x: -28.7,
          y: 0,
          z: 85.2,
          coordinateSystemVersion: MARSEILLE_COORDINATE_SYSTEM_VERSION,
        },
        visualVariant: 'ground-storefront-v1',
        status: 'active',
      },
      {
        id: 'harbor-east-building',
        label: 'DEV — Hôtel des Princes (inventaire fictif)',
        geo: {
          latitude: 43.2946888,
          longitude: 5.3755217,
          source: 'verified',
        },
        world: {
          x: 113.4,
          y: 0,
          z: -9.9,
          coordinateSystemVersion: MARSEILLE_COORDINATE_SYSTEM_VERSION,
        },
        visualVariant: 'ground-storefront-v1',
        status: 'active',
      },
    ],
    placements: [
      {
        id: 'dev-placement-01',
        buildingId: 'mirror-adjacent-building-01',
        placementType: 'ground-floor-storefront',
        anchorWorld: {
          x: 68.3,
          y: 1.2,
          z: -7.5,
          coordinateSystemVersion: MARSEILLE_COORDINATE_SYSTEM_VERSION,
        },
        anchorGeo: {
          latitude: 43.2946667,
          longitude: 5.3748399,
          source: 'projected',
        },
        facing: { facingRad: -Math.PI / 2 },
        visibilityTier: 'standard',
        status: 'available',
        displayPolicy: { showWhenUnselected: true, maxDistanceMeters: 48 },
      },
      {
        id: 'dev-placement-02',
        buildingId: 'mirror-adjacent-building-02',
        placementType: 'ground-floor-storefront',
        anchorWorld: {
          x: 61.8,
          y: 1.2,
          z: -26.2,
          coordinateSystemVersion: MARSEILLE_COORDINATE_SYSTEM_VERSION,
        },
        merchantId: 'dev-merchant-vitrine',
        campaignId: 'dev-campaign-demo',
        visibilityTier: 'featured',
        status: 'active',
        facing: { facingRad: -Math.PI / 2 },
        displayPolicy: { showWhenUnselected: true, maxDistanceMeters: 48 },
      },
      {
        id: 'dev-placement-03',
        buildingId: 'harbor-west-building',
        placementType: 'entrance-panel',
        anchorWorld: {
          x: -37.8,
          y: 1.2,
          z: 85.2,
          coordinateSystemVersion: MARSEILLE_COORDINATE_SYSTEM_VERSION,
        },
        merchantId: 'dev-merchant-quai',
        status: 'available',
        facing: { facingRad: Math.PI / 2 },
        displayPolicy: { showWhenUnselected: true, maxDistanceMeters: 48 },
      },
      {
        id: 'dev-placement-04',
        buildingId: 'harbor-east-building',
        placementType: 'ground-floor-storefront',
        anchorWorld: {
          x: 124.5,
          y: 1.2,
          z: -9.9,
          coordinateSystemVersion: MARSEILLE_COORDINATE_SYSTEM_VERSION,
        },
        status: 'paused',
        facing: { facingRad: -Math.PI / 2 },
        displayPolicy: { showWhenUnselected: true, maxDistanceMeters: 36 },
      },
    ],
    merchants: [
      {
        id: 'dev-merchant-vitrine',
        displayName: 'DEV — Partenaire exemple',
        category: 'demo',
        verifiedStatus: 'unverified',
        publicProfile: {
          shortDescription: DEV_NOTICE,
          categoryLabel: 'Démonstration',
        },
      },
      {
        id: 'dev-merchant-quai',
        displayName: 'DEV — Quai fictif',
        category: 'demo',
        verifiedStatus: 'unverified',
        publicProfile: { shortDescription: DEV_NOTICE },
      },
    ],
    campaigns: [
      {
        id: 'dev-campaign-demo',
        placementId: 'dev-placement-02',
        merchantId: 'dev-merchant-vitrine',
        title: 'DEV — Campagne exemple',
        creative: {
          headline: 'Emplacement sponsorisable (démo)',
          body: DEV_NOTICE,
        },
        cta: { kind: 'inquiry', label: 'Demander un devis' },
        startAt: '2026-01-01T00:00:00.000Z',
        endAt: '2026-12-31T23:59:59.000Z',
        status: 'active',
      },
    ],
    offers: [
      {
        id: 'dev-offer-01',
        placementId: 'dev-placement-01',
        commercialModel: 'inquiry',
        availability: {},
      },
      {
        id: 'dev-offer-02',
        placementId: 'dev-placement-02',
        commercialModel: 'quote',
        availability: {},
      },
      {
        id: 'dev-offer-03',
        placementId: 'dev-placement-03',
        commercialModel: 'inquiry',
        availability: {},
      },
      {
        id: 'dev-offer-04',
        placementId: 'dev-placement-04',
        commercialModel: 'checkout',
        availability: {},
      },
    ],
  };
}
