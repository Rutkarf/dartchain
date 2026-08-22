import { MARSEILLE_LANDMARK_BUILDINGS } from '../geo-reference.config';
import { MARSEILLE_COORDINATE_SYSTEM_VERSION } from './coordinate-system';
import {
  groundFloorAnchorFromGeoFootprint,
  projectMarseilleWorldToGeo,
} from './ground-floor-anchor.util';
import type { MetaversePlacementsResponseDto } from './placement.dto';

/**
 * Fixtures DEV uniquement — partenaires fictifs, aucun commerçant réel.
 * Ids `dev-*` / `fixture-dev`. Ne jamais servir en production.
 *
 * Les ancres RDC sont dérivées du footprint OSM way/* (GEO-FACADE-1 + GEO-WAY-1).
 */
export const PLACEMENT_FIXTURE_SOURCE = 'fixture-dev' as const;

const DEV_NOTICE =
  'DEV — emplacement fictif, non contractuel, aucun partenaire réel associé.';

interface DevPlacementSpec {
  id: string;
  buildingId: string;
  placementType: 'ground-floor-storefront' | 'entrance-panel';
  visibilityTier?: 'standard' | 'featured';
  status: 'available' | 'active' | 'paused';
  merchantId?: string;
  campaignId?: string;
  maxDistanceMeters: number;
}

const DEV_PLACEMENT_SPECS: readonly DevPlacementSpec[] = [
  {
    id: 'dev-placement-01',
    buildingId: 'mirror-adjacent-building-01',
    placementType: 'ground-floor-storefront',
    visibilityTier: 'standard',
    status: 'available',
    maxDistanceMeters: 48,
  },
  {
    id: 'dev-placement-02',
    buildingId: 'mirror-adjacent-building-02',
    placementType: 'ground-floor-storefront',
    visibilityTier: 'featured',
    status: 'active',
    merchantId: 'dev-merchant-vitrine',
    campaignId: 'dev-campaign-demo',
    maxDistanceMeters: 48,
  },
  {
    id: 'dev-placement-03',
    buildingId: 'harbor-west-building',
    placementType: 'entrance-panel',
    status: 'available',
    merchantId: 'dev-merchant-quai',
    maxDistanceMeters: 48,
  },
  {
    id: 'dev-placement-04',
    buildingId: 'harbor-east-building',
    placementType: 'ground-floor-storefront',
    status: 'paused',
    maxDistanceMeters: 36,
  },
];

function facadeAnchorDto(buildingId: string) {
  const landmark = MARSEILLE_LANDMARK_BUILDINGS.find((item) => item.id === buildingId);
  if (!landmark) {
    throw new Error(`[placement-fixtures] Landmark OSM introuvable: ${buildingId}`);
  }
  const anchor = groundFloorAnchorFromGeoFootprint(landmark.footprint);
  if (!anchor) {
    throw new Error(`[placement-fixtures] Façade RDC incalculable: ${buildingId}`);
  }
  const geo = projectMarseilleWorldToGeo(
    anchor.world.x,
    anchor.world.y,
    anchor.world.z
  );
  return {
    anchorWorld: {
      x: anchor.world.x,
      y: anchor.world.y,
      z: anchor.world.z,
      coordinateSystemVersion: MARSEILLE_COORDINATE_SYSTEM_VERSION,
    },
    anchorGeo: {
      latitude: geo.latitude,
      longitude: geo.longitude,
      altitude: geo.altitude,
      source: 'projected' as const,
    },
    facing: { facingRad: anchor.facingRad },
  };
}

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
          latitude: 43.2946586,
          longitude: 5.3748354,
          source: 'verified',
        },
        world: {
          x: 57.75,
          y: 0,
          z: -6.58,
          coordinateSystemVersion: MARSEILLE_COORDINATE_SYSTEM_VERSION,
        },
        visualVariant: 'ground-storefront-v1',
        status: 'active',
      },
      {
        id: 'mirror-adjacent-building-02',
        label: 'DEV — Immeuble nord Ombrière',
        geo: {
          latitude: 43.2948273,
          longitude: 5.3747644,
          source: 'verified',
        },
        world: {
          x: 51.99,
          y: 0,
          z: -25.36,
          coordinateSystemVersion: MARSEILLE_COORDINATE_SYSTEM_VERSION,
        },
        visualVariant: 'ground-storefront-v1',
        status: 'active',
      },
      {
        id: 'harbor-west-building',
        label: 'DEV — Façade ouest Vieux-Port',
        geo: {
          latitude: 43.2938272,
          longitude: 5.3737823,
          source: 'approximate',
        },
        world: {
          x: -27.58,
          y: 0,
          z: 85.98,
          coordinateSystemVersion: MARSEILLE_COORDINATE_SYSTEM_VERSION,
        },
        visualVariant: 'ground-storefront-v1',
        status: 'active',
      },
      {
        id: 'harbor-east-building',
        label: 'DEV — Hôtel des Princes (inventaire fictif)',
        geo: {
          latitude: 43.294698,
          longitude: 5.375526,
          source: 'verified',
        },
        world: {
          x: 113.7,
          y: 0,
          z: -10.96,
          coordinateSystemVersion: MARSEILLE_COORDINATE_SYSTEM_VERSION,
        },
        visualVariant: 'ground-storefront-v1',
        status: 'active',
      },
    ],
    placements: DEV_PLACEMENT_SPECS.map((spec) => {
      const facade = facadeAnchorDto(spec.buildingId);
      return {
        id: spec.id,
        buildingId: spec.buildingId,
        placementType: spec.placementType,
        ...facade,
        visibilityTier: spec.visibilityTier,
        status: spec.status,
        merchantId: spec.merchantId,
        campaignId: spec.campaignId,
        displayPolicy: {
          showWhenUnselected: true,
          maxDistanceMeters: spec.maxDistanceMeters,
        },
      };
    }),
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
