import { MARSEILLE_COORDINATE_SYSTEM_VERSION } from './coordinate-system';
import { inquiryImpliesReservation } from './inquiry.model';
import type { MetaversePlacementsResponseDto } from './placement.dto';
import { createDevPlacementFixtures } from './placement-fixtures.dev';
import {
  mapInquiryResponseDto,
  mapPlacementDto,
  mapPlacementsResponse,
} from './placement.mapper';

describe('placement.mapper', () => {
  it('mappe les fixtures DEV sans inventer un partenaire réel', () => {
    const catalog = mapPlacementsResponse(createDevPlacementFixtures());
    expect(catalog).not.toBeNull();
    expect(catalog!.source).toBe('fixture-dev');
    expect(catalog!.placements.length).toBe(4);
    expect(catalog!.placements.every((item) => item.id.startsWith('dev-'))).toBe(
      true
    );
    expect(
      catalog!.merchants.every((item) => item.verifiedStatus === 'unverified')
    ).toBe(true);
  });

  it('ignore un placement dont le CRS n’est pas marseille-local-v1', () => {
    const dto = mapPlacementDto({
      id: 'dev-placement-bad-crs',
      buildingId: 'mirror-adjacent-building-01',
      anchorWorld: {
        x: 0,
        y: 1.2,
        z: 0,
        coordinateSystemVersion: 'other-crs',
      },
      status: 'available',
    });
    expect(dto).toBeNull();
  });

  it('force unavailable si le statut API est inconnu', () => {
    const dto = mapPlacementDto({
      id: 'dev-placement-unknown-status',
      buildingId: 'mirror-adjacent-building-01',
      anchorWorld: {
        x: 1,
        y: 1.2,
        z: 1,
        coordinateSystemVersion: MARSEILLE_COORDINATE_SYSTEM_VERSION,
      },
      status: 'sold' as never,
    });
    expect(dto?.status).toBe('unavailable');
  });

  it('écarte les placements orphelins (buildingId absent du catalogue)', () => {
    const raw: MetaversePlacementsResponseDto = {
      type: 'METAVERSE_PLACEMENTS',
      source: 'authorized-api',
      serverTime: '2026-08-20T12:00:00.000Z',
      buildings: [
        {
          id: 'only-building',
          label: 'Test',
          world: { x: 0, y: 0, z: 0 },
          status: 'active',
        },
      ],
      placements: [
        {
          id: 'orphan',
          buildingId: 'missing-building',
          anchorWorld: { x: 0, y: 1.2, z: 0 },
          status: 'available',
        },
        {
          id: 'ok',
          buildingId: 'only-building',
          anchorWorld: { x: 0, y: 1.2, z: 0 },
          status: 'available',
        },
      ],
    };
    const catalog = mapPlacementsResponse(raw);
    expect(catalog!.placements.map((item) => item.id)).toEqual(['ok']);
    expect(catalog!.placements[0].anchorWorld.coordinateSystemVersion).toBe(
      MARSEILLE_COORDINATE_SYSTEM_VERSION
    );
  });

  it('ne transforme pas received en réservation', () => {
    const response = mapInquiryResponseDto({
      inquiryId: 'inq-1',
      status: 'received',
    });
    expect(response).not.toBeNull();
    expect(inquiryImpliesReservation(response!)).toBe(false);
  });
});
