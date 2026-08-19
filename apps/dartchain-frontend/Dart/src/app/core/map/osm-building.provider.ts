import { Injectable } from '@angular/core';

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
  nodes: number[];
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: Array<OverpassNode | OverpassWay>;
}

const DEFAULT_BUILDING_HEIGHT = 8;
const FLOOR_HEIGHT = 3;
const MAX_BUILDING_HEIGHT = 120;
const METERS_PER_DEGREE_LAT = 111_320;
/** Proxy Vite en dev, puis endpoint public CORS-friendly. */
const OVERPASS_ENDPOINTS = ['/overpass', 'https://overpass-api.de/api/interpreter'];

@Injectable({ providedIn: 'root' })
export class OSMBuildingProvider {
  private readonly footprintCache = new Map<string, OSMBuildingFootprint>();

  async loadBuildings(bounds: OSMBuildingBounds): Promise<OSMBuildingFootprint[]> {
    const query = `
[out:json][timeout:15];
(
  way["building"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
);
out body;
>;
out skel qt;
    `.trim();

    const buildings = await this.fetchOverpass(query);
    this.mergeIntoCache(buildings);
    return buildings;
  }

  /** Cycle 4 — footprint OSM autour d'un point GPS (rayon en mètres). */
  async loadBuildingsAround(
    latitude: number,
    longitude: number,
    radiusMeters: number
  ): Promise<OSMBuildingFootprint[]> {
    const radius = Math.min(Math.max(Math.round(radiusMeters), 20), 800);
    const cached = this.filterCachedAround(latitude, longitude, radius);
    if (cached.length >= 3) {
      return cached;
    }

    const query = `
[out:json][timeout:20];
(
  way["building"](around:${radius},${latitude},${longitude});
);
out body;
>;
out skel qt;
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
    const radius = Math.min(Math.max(Math.round(radiusMeters), 20), 800);
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

  private mergeIntoCache(buildings: OSMBuildingFootprint[]): void {
    for (const building of buildings) {
      this.footprintCache.set(building.id, building);
    }
  }

  private async fetchOverpass(query: string): Promise<OSMBuildingFootprint[]> {
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
        return this.parseBuildings(data);
      } catch (error) {
        lastError = error;
      }
    }
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

    for (const way of ways) {
      const tags = way.tags ?? {};
      if (!tags['building']) continue;

      const points = way.nodes
        .map((nodeId) => nodeMap.get(nodeId))
        .filter((node): node is OverpassNode => !!node)
        .map((node) => ({ latitude: node.lat, longitude: node.lon }));

      if (points.length < 4) continue;

      const first = points[0];
      const last = points[points.length - 1];
      const isClosed =
        Math.abs(first.latitude - last.latitude) < 1e-9 &&
        Math.abs(first.longitude - last.longitude) < 1e-9;
      if (!isClosed) continue;

      buildings.push({
        id: `osm-way-${way.id}`,
        points,
        height: this.resolveBuildingHeight(tags),
      });
    }

    return buildings;
  }

  private resolveBuildingHeight(tags: Record<string, string>): number {
    const directHeight = Number.parseFloat(tags['height'] ?? '');
    if (Number.isFinite(directHeight) && directHeight > 0) {
      return clampHeight(directHeight);
    }

    const levels = Number.parseFloat(tags['building:levels'] ?? '');
    if (Number.isFinite(levels) && levels > 0) {
      return clampHeight(levels * FLOOR_HEIGHT);
    }

    return DEFAULT_BUILDING_HEIGHT;
  }
}

function clampHeight(height: number): number {
  return Math.min(MAX_BUILDING_HEIGHT, Math.max(4, height));
}

function footprintCentroid(footprint: OSMBuildingFootprint): { lat: number; lon: number } {
  const pts = footprint.points.slice(0, -1);
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
