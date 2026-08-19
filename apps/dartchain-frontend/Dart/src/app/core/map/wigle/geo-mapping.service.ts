import { Injectable, inject } from '@angular/core';
import * as THREE from 'three';

import { GeoCoordinateService } from '../geo-coordinate.service';
import {
  METERS_PER_DEGREE_LATITUDE,
  metersPerDegreeLongitude,
} from '../geo-projection.constants';
import { LocalOriginService } from '../local-origin.service';
import {
  OSMBuildingProvider,
  type OSMBuildingFootprint,
} from '../osm-building.provider';

const WGS84_EARTH_RADIUS = 6_378_137;
const OSM_CACHE_PREFIX = 'dartchain-osm-footprints-v1';
const OSM_CACHE_TTL_MS = 86_400_000;

export interface OSMBuildingMatch {
  wiglePointId: string;
  footprint: OSMBuildingFootprint;
  matchType: 'inside-footprint' | 'nearest-building';
  distanceMeters: number;
}

interface CachedOsmPayload {
  fetchedAt: number;
  buildings: OSMBuildingFootprint[];
}

/**
 * Cycle 4 — mapping GPS ↔ monde Three.js + footprints OSM.
 * Délègue au GeoCoordinateService existant (précision ~cm en zone Vieux-Port).
 */
@Injectable({ providedIn: 'root' })
export class GeoMappingService {
  private readonly geo = inject(GeoCoordinateService);
  private readonly origin = inject(LocalOriginService);
  private readonly osm = inject(OSMBuildingProvider);

  get centerLatitude(): number {
    return this.origin.latitude;
  }

  get centerLongitude(): number {
    return this.origin.longitude;
  }

  /** Conversion GPS → Three.js (mètres, origine Vieux-Port). */
  geoToWorld(latitude: number, longitude: number, altitude = 0): THREE.Vector3 {
    return this.geo.geoToWorld(latitude, longitude, altitude);
  }

  /**
   * Variante WGS84 locale — équivalente à l'équirectangulaire du projet sur ~1 km.
   * Conservée pour debug / validation croisée.
   */
  geoToWorldWgs84Local(latitude: number, longitude: number, altitude = 0): THREE.Vector3 {
    const x =
      ((longitude - this.centerLongitude) * Math.PI) / 180 * WGS84_EARTH_RADIUS;
    const z =
      -((latitude - this.centerLatitude) * Math.PI) / 180 * WGS84_EARTH_RADIUS;
    return new THREE.Vector3(x, altitude, z);
  }

  async fetchOSMBuildings(
    latitude: number,
    longitude: number,
    radiusMeters: number
  ): Promise<OSMBuildingFootprint[]> {
    const cacheKey = `${OSM_CACHE_PREFIX}:${latitude.toFixed(4)}:${longitude.toFixed(4)}:${Math.round(radiusMeters)}`;
    const cached = this.readCache(cacheKey);
    if (cached) return cached;

    try {
      const buildings = await this.osm.loadBuildingsAround(latitude, longitude, radiusMeters);
      if (buildings.length > 0) {
        this.writeCache(cacheKey, buildings);
      }
      return buildings;
    } catch (error) {
      const memoryCache = this.osm.filterCachedAround(latitude, longitude, radiusMeters);
      if (memoryCache.length > 0) {
        console.warn(
          '[GeoMappingService] Overpass indisponible, réutilisation cache mémoire:',
          memoryCache.length
        );
        return memoryCache;
      }
      console.warn('[GeoMappingService] Overpass indisponible, cache vide.', error);
      return [];
    }
  }

  osmFootprintToThreeShape(footprint: OSMBuildingFootprint): THREE.Shape | null {
    if (footprint.points.length < 3) return null;

    const worldPoints = footprint.points.map((p: { latitude: number; longitude: number }) =>
      this.geoToWorld(p.latitude, p.longitude, 0)
    );
    const shapePoints = worldPoints
      .slice(0, -1)
      .map((point: THREE.Vector3) => new THREE.Vector2(point.x, -point.z));

    if (shapePoints.length < 3) return null;

    const shape = new THREE.Shape(shapePoints);
    shape.closePath();
    return shape;
  }

  createExtrudedMesh(
    footprint: OSMBuildingFootprint,
    material: THREE.Material
  ): THREE.Mesh | null {
    const shape = this.osmFootprintToThreeShape(footprint);
    if (!shape) return null;

    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: footprint.height,
      bevelEnabled: false,
      steps: 1,
    });
    geometry.rotateX(-Math.PI / 2);

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `osm-network-${footprint.id}`;
    mesh.userData['osmBuildingId'] = footprint.id;
    mesh.frustumCulled = true;
    return mesh;
  }

  matchWiglePointsToFootprints(
    points: Array<{ id: string; latitude: number; longitude: number }>,
    footprints: OSMBuildingFootprint[],
    nearestThresholdMeters = 25
  ): OSMBuildingMatch[] {
    const matches: OSMBuildingMatch[] = [];
    const usedFootprints = new Set<string>();

    for (const point of points) {
      const containing = footprints.find((fp) =>
        this.isPointInFootprint(point.latitude, point.longitude, fp)
      );
      if (containing && !usedFootprints.has(containing.id)) {
        usedFootprints.add(containing.id);
        matches.push({
          wiglePointId: point.id,
          footprint: containing,
          matchType: 'inside-footprint',
          distanceMeters: 0,
        });
        continue;
      }

      let nearest: OSMBuildingFootprint | undefined;
      let nearestDist = Number.POSITIVE_INFINITY;
      for (const fp of footprints) {
        if (usedFootprints.has(fp.id)) continue;
        const center = this.footprintCentroid(fp);
        const dist = this.haversineMeters(point.latitude, point.longitude, center.lat, center.lon);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = fp;
        }
      }

      if (nearest && nearestDist <= nearestThresholdMeters) {
        usedFootprints.add(nearest.id);
        matches.push({
          wiglePointId: point.id,
          footprint: nearest,
          matchType: 'nearest-building',
          distanceMeters: nearestDist,
        });
      }
    }

    return matches;
  }

  isPointInFootprint(
    latitude: number,
    longitude: number,
    footprint: OSMBuildingFootprint
  ): boolean {
    const ring = footprint.points.slice(0, -1);
    if (ring.length < 3) return false;

    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i].longitude;
      const yi = ring[i].latitude;
      const xj = ring[j].longitude;
      const yj = ring[j].latitude;
      const intersect =
        yi > latitude !== yj > latitude &&
        longitude < ((xj - xi) * (latitude - yi)) / (yj - yi + 1e-12) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  footprintCentroid(footprint: OSMBuildingFootprint): { lat: number; lon: number } {
    const pts = footprint.points.slice(0, -1);
    const sum = pts.reduce(
      (acc: { lat: number; lon: number }, p: { latitude: number; longitude: number }) => ({
        lat: acc.lat + p.latitude,
        lon: acc.lon + p.longitude,
      }),
      { lat: 0, lon: 0 }
    );
    return { lat: sum.lat / pts.length, lon: sum.lon / pts.length };
  }

  haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;
    const metersLat = dLat * METERS_PER_DEGREE_LATITUDE;
    const metersLon = dLon * metersPerDegreeLongitude(this.centerLatitude);
    return Math.sqrt(metersLat * metersLat + metersLon * metersLon);
  }

  private readCache(key: string): OSMBuildingFootprint[] | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const payload = JSON.parse(raw) as CachedOsmPayload;
      if (Date.now() - payload.fetchedAt > OSM_CACHE_TTL_MS) {
        localStorage.removeItem(key);
        return null;
      }
      return payload.buildings;
    } catch {
      return null;
    }
  }

  private writeCache(key: string, buildings: OSMBuildingFootprint[]): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const payload: CachedOsmPayload = { fetchedAt: Date.now(), buildings };
      localStorage.setItem(key, JSON.stringify(payload));
    } catch {
      // Quota dépassé — ignorer silencieusement
    }
  }
}
