import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import * as THREE from 'three';
import { catchError, firstValueFrom, of, type Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import type { WIGLEBuildingAggregate, WigleAreaAggregate } from './wigle.types';
import type { WiglePointsResponse } from './wigle-point.types';
import { WIGLE_GEO_CONFIG, WIGLE_OSM_QUERY_BOUNDS } from './wigle-visual.config';
import { MARSEILLE_GEO_ORIGIN, WIGLE_PROFESSIONAL_ANCHORS } from '../geo-reference.config';
import { METRO_SPAWN_ANCHOR } from '../map-configuration';
import { GeoCoordinateService } from '../geo-coordinate.service';

export interface WigleBuildingsApiResponse {
  type: string;
  source: string;
  aggregates: WIGLEBuildingAggregate[];
  totalObservations: number;
  unmatchedObservations: number;
}

export interface WigleAreasApiResponse {
  type: string;
  source: string;
  areas: WigleAreaAggregate[];
}

@Injectable({ providedIn: 'root' })
export class WigleApiService {
  private readonly http = inject(HttpClient, { optional: true });
  private readonly geo = inject(GeoCoordinateService);

  fetchBuildingAggregates(
    bounds = WIGLE_OSM_QUERY_BOUNDS
  ): Observable<WigleBuildingsApiResponse> {
    if (!this.http) {
      return of(this.localMockBuildings());
    }
    const params = {
      south: String(bounds.south),
      north: String(bounds.north),
      west: String(bounds.west),
      east: String(bounds.east),
    };
    return this.http
      .get<WigleBuildingsApiResponse>(`${environment.apiUrl}/metaverse/wigle/buildings`, {
        params,
      })
      .pipe(catchError(() => of(this.localMockBuildings())));
  }

  fetchAreaAggregates(bounds = WIGLE_OSM_QUERY_BOUNDS): Observable<WigleAreasApiResponse> {
    if (!this.http) {
      return of(this.localMockAreas());
    }
    const params = {
      south: String(bounds.south),
      north: String(bounds.north),
      west: String(bounds.west),
      east: String(bounds.east),
    };
    return this.http
      .get<WigleAreasApiResponse>(`${environment.apiUrl}/metaverse/wigle/areas`, { params })
      .pipe(catchError(() => of(this.localMockAreas())));
  }

  async loadBuildingAggregates(): Promise<WigleBuildingsApiResponse> {
    return firstValueFrom(this.fetchBuildingAggregates());
  }

  fetchGeoPoints(
    lat = MARSEILLE_GEO_ORIGIN.latitude,
    lon = MARSEILLE_GEO_ORIGIN.longitude,
    radiusMeters = WIGLE_GEO_CONFIG.loadRadiusMeters,
    limit: number = WIGLE_GEO_CONFIG.maxActivePoints
  ): Observable<WiglePointsResponse> {
    if (!this.http) {
      return of(this.localMockGeoPoints(lat, lon, radiusMeters));
    }
    return this.http
      .get<WiglePointsResponse>(`${environment.apiUrl}/metaverse/wigle/points`, {
        params: {
          lat: String(lat),
          lon: String(lon),
          radiusMeters: String(radiusMeters),
          limit: String(limit),
        },
      })
      .pipe(catchError(() => of(this.localMockGeoPoints(lat, lon, radiusMeters))));
  }

  async loadGeoPoints(
    lat = MARSEILLE_GEO_ORIGIN.latitude,
    lon = MARSEILLE_GEO_ORIGIN.longitude,
    radiusMeters = WIGLE_GEO_CONFIG.loadRadiusMeters,
    limit: number = WIGLE_GEO_CONFIG.maxActivePoints
  ): Promise<WiglePointsResponse> {
    return firstValueFrom(this.fetchGeoPoints(lat, lon, radiusMeters, limit));
  }

  private localMockGeoPoints(lat: number, lon: number, radiusMeters: number): WiglePointsResponse {
    const metroGeo = this.geo.worldToGeo(
      new THREE.Vector3(
        METRO_SPAWN_ANCHOR.mirror.x + METRO_SPAWN_ANCHOR.spawnOffsetFromMirror.x,
        0,
        METRO_SPAWN_ANCHOR.mirror.z + METRO_SPAWN_ANCHOR.spawnOffsetFromMirror.z
      )
    );

    const anchorPoints = WIGLE_PROFESSIONAL_ANCHORS.map((anchor) => ({
      id: anchor.id,
      latitude: anchor.latitude,
      longitude: anchor.longitude,
      networkName: anchor.networkName,
      networkType: anchor.networkType,
      signalStrength: anchor.signalStrength,
      source: 'mock' as const,
    }));

    anchorPoints.push({
      id: 'vp-metro',
      latitude: metroGeo.latitude,
      longitude: metroGeo.longitude,
      networkName: 'Metro-Vieux-Port',
      networkType: 'WIFI',
      signalStrength: -55,
      source: 'mock',
    });

    const points = anchorPoints.filter((p) => {
      const dLat = (p.latitude - lat) * 111_320;
      const dLon = (p.longitude - lon) * 111_320 * Math.cos((lat * Math.PI) / 180);
      return Math.hypot(dLat, dLon) <= radiusMeters;
    });

    return {
      type: 'WIGLE_GEO_POINTS',
      source: 'mock',
      centerLatitude: lat,
      centerLongitude: lon,
      radiusMeters,
      points,
    };
  }

  private localMockBuildings(): WigleBuildingsApiResponse {
    const landmarkIds = [
      'mirror-adjacent-building-02',
      'mirror-adjacent-building-01',
      'harbor-west-building',
      'harbor-east-building',
      'vieux-port-arcades-west',
      'vieux-port-shops-east',
    ];
    const aggregates = landmarkIds.map((buildingId, index) => ({
      buildingId,
      observationCount: 3 + (index % 3),
      signalAverage: -58 - index * 2,
      signalMin: -72,
      signalMax: -48,
      networkTypeCounts: { wifi: 2 + (index % 2), bluetooth: index % 2 },
      channelCounts: { '6': 2, '11': 1 },
      lastObservedAt: new Date().toISOString(),
      confidence: (index < 4 ? 'high' : 'medium') as 'high' | 'medium',
    }));
    return {
      type: 'WIGLE_VISUALIZATION',
      source: 'mock',
      totalObservations: aggregates.reduce((s, a) => s + a.observationCount, 0),
      unmatchedObservations: 1,
      aggregates,
    };
  }

  private localMockAreas(): WigleAreasApiResponse {
    const unmatched = WIGLE_PROFESSIONAL_ANCHORS.find((a) => a.id === 'vp-canebiere');
    return {
      type: 'WIGLE_VISUALIZATION',
      source: 'mock',
      areas: [
        {
          areaId: 'area-canebiere-local',
          latitudeApprox: unmatched?.latitude ?? MARSEILLE_GEO_ORIGIN.latitude - 0.0004,
          longitudeApprox: unmatched?.longitude ?? MARSEILLE_GEO_ORIGIN.longitude - 0.00055,
          observationCount: 2,
          signalAverage: -74,
          networkTypeCounts: { unknown: 2 },
          confidence: 'low',
          source: 'mock',
        },
      ],
    };
  }
}
