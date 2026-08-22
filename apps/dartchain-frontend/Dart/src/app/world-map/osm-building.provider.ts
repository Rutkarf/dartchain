import { Injectable } from '@angular/core';

import { environment } from '../../environments/environment';
import {
  resolveBuildingHeightFromTags,
  type BuildingHeightSource,
} from './building-height.util';

export interface OSMBuildingBounds {
  south: number;
  north: number;
  west: number;
  east: number;
}

export interface OSMBuildingFootprint {
  id: string;
  points: Array<{ latitude: number; longitude: number }>;
  height: number;
  heightSource: BuildingHeightSource;
}

interface OverpassElementBase {
  id: number;
  type: 'node' | 'way';
}

interface OverpassNode extends OverpassElementBase {
  type: 'node';
  lat: number;
  lon: number;
}

interface OverpassWay extends OverpassElementBase {
  type: 'way';
  nodes?: number[];
  geometry?: Array<{ lat: number; lon: number }>;
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: Array<OverpassNode | OverpassWay>;
}

const METERS_PER_DEGREE_LAT = 111_320;
/** Same-origin only — never hit overpass hosts from the browser (CORS). */
const OVERPASS_ENDPOINTS = [`${environment.apiUrl}/metaverse/overpass`, '/overpass', '/overpass-alt'];
const MAX_AROUND_RADIUS_METERS = 1500;
/** Tuiles ~900 m — requêtes Overpass fiables (évite timeout / payload tronqué). */
const TILE_DEG = 0.008;
/** Pause réseau après un échec complet (tous les endpoints). */
const CIRCUIT_COOLDOWN_MS = 60_000;

@Injectable({ providedIn: 'root' })
export class OSMBuildingProvider {
  private readonly footprintCache = new Map<string, OSMBuildingFootprint>();
  private circuitOpenUntil = 0;
  private loggedCircuitOpen = false;

  async loadBuildings(bounds: OSMBuildingBounds): Promise<OSMBuildingFootprint[]> {
    const tiles = splitBoundsIntoTiles(bounds, TILE_DEG);
    // Canebière / nord du Vieux-Port en premier (lat plus haute = nord OSM).
    tiles.sort((a, b) => b.north - a.north || a.west - b.west);

    let lastError: unknown;
    let failedTiles = 0;
    for (const tile of tiles) {
      if (this.isCircuitOpen()) {
        break;
      }
      try {
        const batch = await this.fetchTile(tile);
        this.mergeIntoCache(batch);
      } catch (error) {
        lastError = error;
        failedTiles++;
        if (failedTiles === 1) {
          console.warn('[OSMBuildingProvider] Tuile Overpass echouee', tile, error);
        }
      }
    }

    const all = [...this.footprintCache.values()].filter((b) => footprintInBounds(b, bounds));
    if (all.length === 0 && lastError) {
      // Soft-fail : le caller (Marseille) conserve le catalogue accurate.
      console.warn(
        '[OSMBuildingProvider] Overpass indisponible — cache vide, fallback accurate attendu.',
        lastError
      );
      return [];
    }
    if (failedTiles > 1) {
      console.warn(
        `[OSMBuildingProvider] ${failedTiles} tuiles Overpass en echec (circuit / reseau).`
      );
    }
    return all;
  }

  /** Cycle 4 — footprint OSM autour d'un point GPS (rayon en mètres). */
  async loadBuildingsAround(
    latitude: number,
    longitude: number,
    radiusMeters: number
  ): Promise<OSMBuildingFootprint[]> {
    const radius = Math.min(Math.max(Math.round(radiusMeters), 20), MAX_AROUND_RADIUS_METERS);
    const cached = this.filterCachedAround(latitude, longitude, radius);
    if (cached.length >= 3) {
      return cached;
    }

    if (this.isCircuitOpen()) {
      return cached;
    }

    const query = `
[out:json][timeout:45];
way["building"](around:${radius},${latitude},${longitude});
out geom;
    `.trim();

    try {
      const fetched = await this.fetchOverpass(query);
      this.mergeIntoCache(fetched);
      const merged = this.filterCachedAround(latitude, longitude, radius);
      return merged.length > 0 ? merged : fetched;
    } catch (error) {
      if (cached.length > 0) {
        return cached;
      }
      throw error;
    }
  }

  /** Footprints déjà chargés (ex. Marseille) filtrés autour d'un point. */
  filterCachedAround(
    latitude: number,
    longitude: number,
    radiusMeters: number
  ): OSMBuildingFootprint[] {
    const radius = Math.min(Math.max(Math.round(radiusMeters), 20), MAX_AROUND_RADIUS_METERS);
    const results: OSMBuildingFootprint[] = [];

    for (const footprint of this.footprintCache.values()) {
      const center = footprintCentroid(footprint);
      if (haversineMeters(latitude, longitude, center.lat, center.lon) <= radius * 1.15) {
        results.push(footprint);
      }
    }

    return results;
  }

  getCachedCount(): number {
    return this.footprintCache.size;
  }

  private async fetchTile(bounds: OSMBuildingBounds): Promise<OSMBuildingFootprint[]> {
    const query = `
[out:json][timeout:40];
way["building"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
out geom;
    `.trim();
    return this.fetchOverpass(query);
  }

  private mergeIntoCache(buildings: OSMBuildingFootprint[]): void {
    for (const building of buildings) {
      this.footprintCache.set(building.id, building);
    }
  }

  private isCircuitOpen(): boolean {
    return Date.now() < this.circuitOpenUntil;
  }

  private openCircuit(reason: unknown): void {
    this.circuitOpenUntil = Date.now() + CIRCUIT_COOLDOWN_MS;
    if (!this.loggedCircuitOpen) {
      this.loggedCircuitOpen = true;
      console.warn(
        '[OSMBuildingProvider] Circuit Overpass ouvert 60s — arret des requetes.',
        reason
      );
    }
  }

  private closeCircuit(): void {
    this.circuitOpenUntil = 0;
    this.loggedCircuitOpen = false;
  }

  private async fetchOverpass(query: string): Promise<OSMBuildingFootprint[]> {
    if (this.isCircuitOpen()) {
      throw new Error('Overpass circuit open');
    }

    let lastError: unknown;
    for (const endpoint of OVERPASS_ENDPOINTS) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=UTF-8',
          },
          body: query,
        });

        if (!response.ok) {
          throw new Error(`Overpass HTTP ${response.status} via ${endpoint}`);
        }

        const data = (await response.json()) as OverpassResponse;
        if (!Array.isArray(data.elements)) {
          throw new Error(`Overpass payload invalide via ${endpoint}`);
        }
        this.closeCircuit();
        return this.parseBuildings(data);
      } catch (error) {
        lastError = error;
      }
    }

    this.openCircuit(lastError);
    throw lastError ?? new Error('Tous les endpoints Overpass ont echoue.');
  }

  private parseBuildings(data: OverpassResponse): OSMBuildingFootprint[] {
    const nodeMap = new Map<number, OverpassNode>();
    const ways: OverpassWay[] = [];

    for (const element of data.elements) {
      if (element.type === 'node') {
        nodeMap.set(element.id, element);
      } else if (element.type === 'way') {
        ways.push(element);
      }
    }

    const buildings: OSMBuildingFootprint[] = [];
    const seenIds = new Set<string>();

    for (const way of ways) {
      const tags = way.tags ?? {};
      if (!tags['building']) continue;

      let points: Array<{ latitude: number; longitude: number }> = [];
      if (way.geometry && way.geometry.length >= 4) {
        points = way.geometry.map((g) => ({ latitude: g.lat, longitude: g.lon }));
      } else if (way.nodes?.length) {
        points = way.nodes
          .map((nodeId) => nodeMap.get(nodeId))
          .filter((node): node is OverpassNode => !!node)
          .map((node) => ({ latitude: node.lat, longitude: node.lon }));
      }

      if (points.length < 4) continue;

      const first = points[0];
      const last = points[points.length - 1];
      const isClosed =
        Math.abs(first.latitude - last.latitude) < 1e-9 &&
        Math.abs(first.longitude - last.longitude) < 1e-9;
      if (!isClosed) {
        points = [...points, first];
      }

      const id = `osm-way-${way.id}`;
      if (seenIds.has(id)) continue;
      seenIds.add(id);

      const resolved = resolveBuildingHeightFromTags(tags);
      buildings.push({
        id,
        points,
        height: resolved.heightMeters,
        heightSource: resolved.heightSource,
      });
    }

    return buildings;
  }
}

function splitBoundsIntoTiles(bounds: OSMBuildingBounds, tileDeg: number): OSMBuildingBounds[] {
  const tiles: OSMBuildingBounds[] = [];
  for (let south = bounds.south; south < bounds.north - 1e-9; south += tileDeg) {
    for (let west = bounds.west; west < bounds.east - 1e-9; west += tileDeg) {
      tiles.push({
        south,
        west,
        north: Math.min(south + tileDeg, bounds.north),
        east: Math.min(west + tileDeg, bounds.east),
      });
    }
  }
  return tiles.length > 0 ? tiles : [bounds];
}

function footprintInBounds(footprint: OSMBuildingFootprint, bounds: OSMBuildingBounds): boolean {
  const c = footprintCentroid(footprint);
  return (
    c.lat >= bounds.south &&
    c.lat <= bounds.north &&
    c.lon >= bounds.west &&
    c.lon <= bounds.east
  );
}

function footprintCentroid(footprint: OSMBuildingFootprint): { lat: number; lon: number } {
  const pts = footprint.points.slice(0, -1);
  if (pts.length === 0) return { lat: 0, lon: 0 };
  const sum = pts.reduce(
    (acc, p) => ({ lat: acc.lat + p.latitude, lon: acc.lon + p.longitude }),
    { lat: 0, lon: 0 }
  );
  return { lat: sum.lat / pts.length, lon: sum.lon / pts.length };
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  const metersLat = dLat * METERS_PER_DEGREE_LAT;
  const metersLon = dLon * METERS_PER_DEGREE_LAT * Math.cos((lat1 * Math.PI) / 180);
  return Math.sqrt(metersLat * metersLat + metersLon * metersLon);
}
