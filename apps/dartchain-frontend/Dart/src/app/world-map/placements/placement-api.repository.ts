import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, firstValueFrom, of } from 'rxjs';

import { environment } from '../../../environments/environment';
import { WIGLE_OSM_QUERY_BOUNDS } from '../wigle/wigle-visual.config';
import type { PlacementInquiryRequest } from './inquiry.model';
import { createDevPlacementFixtures } from './placement-fixtures.dev';
import type {
  MetaversePlacementDetailDto,
  MetaversePlacementsResponseDto,
  PlacementInquiryResponseDto,
} from './placement.dto';
import {
  mapInquiryResponseDto,
  mapPlacementDetail,
  mapPlacementsResponse,
  type PlacementCatalog,
  type PlacementDetail,
} from './placement.mapper';
import { resolvePlacementDataFallback } from './placement-rules';

/**
 * Contrats API attendus (backend pas encore livré — lot MB-7) :
 *   GET  {apiUrl}/metaverse/placements?south&north&west&east
 *   GET  {apiUrl}/metaverse/placements/:id
 *   POST {apiUrl}/metaverse/placements/:id/inquiries
 * Le frontend n’est pas une autorité de disponibilité, de prix ou de propriété.
 */
export const METAVERSE_PLACEMENT_API = {
  listPath: '/metaverse/placements',
  detailPath: (id: string) => `/metaverse/placements/${encodeURIComponent(id)}`,
  inquiryPath: (id: string) =>
    `/metaverse/placements/${encodeURIComponent(id)}/inquiries`,
} as const;

export interface MapBoundsQuery {
  south: number;
  north: number;
  west: number;
  east: number;
}

export const DEFAULT_PLACEMENT_BOUNDS: MapBoundsQuery = {
  south: WIGLE_OSM_QUERY_BOUNDS.south,
  north: WIGLE_OSM_QUERY_BOUNDS.north,
  west: WIGLE_OSM_QUERY_BOUNDS.west,
  east: WIGLE_OSM_QUERY_BOUNDS.east,
};

export interface PlacementListResult {
  catalog: PlacementCatalog | null;
  fallback: ReturnType<typeof resolvePlacementDataFallback>;
  error: string | null;
}

export interface PlacementInquiryResult {
  response: ReturnType<typeof mapInquiryResponseDto>;
  error: string | null;
}

@Injectable({ providedIn: 'root' })
export class PlacementApiRepository {
  private readonly http = inject(HttpClient, { optional: true });

  async listPlacements(
    bounds: MapBoundsQuery = DEFAULT_PLACEMENT_BOUNDS
  ): Promise<PlacementListResult> {
    const payload = await this.fetchList(bounds);
    const fallback = resolvePlacementDataFallback(
      environment.production,
      payload !== null
    );

    if (fallback === 'api' && payload) {
      const catalog = mapPlacementsResponse(payload);
      return {
        catalog,
        fallback,
        error: catalog ? null : 'Réponse placements invalide.',
      };
    }

    if (fallback === 'fixture-dev') {
      const catalog = mapPlacementsResponse(createDevPlacementFixtures());
      return { catalog, fallback, error: null };
    }

    return {
      catalog: null,
      fallback,
      error: 'Inventaire emplacements indisponible.',
    };
  }

  async getPlacement(id: string): Promise<PlacementDetail | null> {
    if (this.http) {
      const dto = await firstValueFrom(
        this.http
          .get<MetaversePlacementDetailDto>(
            `${environment.apiUrl}${METAVERSE_PLACEMENT_API.detailPath(id)}`
          )
          .pipe(catchError(() => of(null)))
      );
      if (dto) return mapPlacementDetail(dto);
    }

    if (environment.production) return null;
    const catalog = mapPlacementsResponse(createDevPlacementFixtures());
    if (!catalog) return null;
    const placement = catalog.placements.find((item) => item.id === id);
    const building = catalog.buildings.find(
      (item) => item.id === placement?.buildingId
    );
    if (!placement || !building) return null;
    return {
      source: 'fixture-dev',
      serverTime: catalog.serverTime,
      building,
      placement,
      merchant: catalog.merchants.find((item) => item.id === placement.merchantId),
      campaign: catalog.campaigns.find((item) => item.id === placement.campaignId),
      offer: catalog.offers.find((item) => item.placementId === placement.id),
    };
  }

  async submitInquiry(
    request: PlacementInquiryRequest
  ): Promise<PlacementInquiryResult> {
    if (!this.http) {
      return { response: null, error: 'Réseau indisponible.' };
    }

    const dto = await firstValueFrom(
      this.http
        .post<PlacementInquiryResponseDto>(
          `${environment.apiUrl}${METAVERSE_PLACEMENT_API.inquiryPath(request.placementId)}`,
          request
        )
        .pipe(catchError(() => of(null)))
    );

    const response = dto ? mapInquiryResponseDto(dto) : null;
    if (!response) {
      return { response: null, error: 'Demande non transmise.' };
    }
    return { response, error: null };
  }

  private async fetchList(
    bounds: MapBoundsQuery
  ): Promise<MetaversePlacementsResponseDto | null> {
    if (!this.http) return null;
    return firstValueFrom(
      this.http
        .get<MetaversePlacementsResponseDto>(
          `${environment.apiUrl}${METAVERSE_PLACEMENT_API.listPath}`,
          {
            params: {
              south: String(bounds.south),
              north: String(bounds.north),
              west: String(bounds.west),
              east: String(bounds.east),
            },
          }
        )
        .pipe(catchError(() => of(null)))
    );
  }
}
