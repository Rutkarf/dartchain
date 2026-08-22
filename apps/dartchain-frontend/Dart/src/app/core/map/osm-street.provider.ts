import { Injectable } from '@angular/core';

import { environment } from '../../../environments/environment';
import { VIEUX_PORT_OSM_STREET_BOUNDS } from './ground-osm.config';

export interface OSMStreetBounds {
  south: number;
  north: number;
  west: number;
  east: number;
}

export interface OSMStreetWay {
  id: string;
  points: Array<{ latitude: number; longitude: number }>;
  highwayType: string;
}

interface OverpassNode {
  type: 'node';
  id: number;
  lat: number;
  lon: number;
}

interface OverpassWay {
  type: 'way';
  id: number;
  nodes?: number[];
  geometry?: Array<{ lat: number; lon: number }>;
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: Array<OverpassNode | OverpassWay>;
}

const OVERPASS_ENDPOINTS = [
  `${environment.apiUrl}/metaverse/overpass`,
  '/overpass',
  '/overpass-alt',
];
const CIRCUIT_COOLDOWN_MS = 60_000;

const HIGHWAY_FILTER =
  '^(primary|secondary|tertiary|residential|unclassified|living_street|service|pedestrian|footway|path|steps)$';

@Injectable({ providedIn: 'root' })
export class OSMStreetProvider {
  private readonly cache = new Map<string, OSMStreetWay>();
  private circuitOpenUntil = 0;

  async loadStreets(bounds: OSMStreetBounds): Promise<OSMStreetWay[]> {
    if (this.isCircuitOpen()) {
      return this.filterInBounds([...this.cache.values()], bounds);
    }

    const query = `
[out:json][timeout:45];
way["highway"~"${HIGHWAY_FILTER}"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
out geom;
    `.trim();

    try {
      const ways = await this.fetchOverpass(query);
      for (const way of ways) {
        this.cache.set(way.id, way);
      }
      return this.filterInBounds(ways, bounds);
    } catch (error) {
      console.warn('[OSMStreetProvider] Overpass indisponible — layout fallback.', error);
      return this.filterInBounds([...this.cache.values()], bounds);
    }
  }

  /** Phase 1.5 — bbox cœur Vieux-Port (~420 m). */
  loadStreetsVieuxPortCore(): Promise<OSMStreetWay[]> {
    return this.loadStreets(VIEUX_PORT_OSM_STREET_BOUNDS);
  }

  private filterInBounds(ways: OSMStreetWay[], bounds: OSMStreetBounds): OSMStreetWay[] {
    return ways.filter((way) => {
      const c = wayCentroid(way);
      return (
        c.latitude >= bounds.south &&
        c.latitude <= bounds.north &&
        c.longitude >= bounds.west &&
        c.longitude <= bounds.east
      );
    });
  }

  getCachedCount(): number {
    return this.cache.size;
  }

  private isCircuitOpen(): boolean {
    return Date.now() < this.circuitOpenUntil;
  }

  private openCircuit(): void {
    this.circuitOpenUntil = Date.now() + CIRCUIT_COOLDOWN_MS;
  }

  private async fetchOverpass(query: string): Promise<OSMStreetWay[]> {
    let lastError: unknown;
    for (const endpoint of OVERPASS_ENDPOINTS) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
          body: query,
        });
        if (!response.ok) {
          throw new Error(`Overpass HTTP ${response.status} via ${endpoint}`);
        }
        const data = (await response.json()) as OverpassResponse;
        if (!Array.isArray(data.elements)) {
          throw new Error(`Overpass payload invalide via ${endpoint}`);
        }
        this.circuitOpenUntil = 0;
        return this.parseWays(data);
      } catch (error) {
        lastError = error;
      }
    }
    this.openCircuit();
    throw lastError ?? new Error('Tous les endpoints Overpass ont echoue.');
  }

  private parseWays(data: OverpassResponse): OSMStreetWay[] {
    const nodeMap = new Map<number, OverpassNode>();
    const ways: OverpassWay[] = [];

    for (const element of data.elements) {
      if (element.type === 'node') {
        nodeMap.set(element.id, element);
      } else if (element.type === 'way') {
        ways.push(element);
      }
    }

    const results: OSMStreetWay[] = [];
    for (const way of ways) {
      const highwayType = way.tags?.['highway'];
      if (!highwayType) continue;

      let points: Array<{ latitude: number; longitude: number }> = [];
      if (way.geometry && way.geometry.length >= 2) {
        points = way.geometry.map((g) => ({ latitude: g.lat, longitude: g.lon }));
      } else if (way.nodes?.length) {
        points = way.nodes
          .map((nodeId) => nodeMap.get(nodeId))
          .filter((node): node is OverpassNode => !!node)
          .map((node) => ({ latitude: node.lat, longitude: node.lon }));
      }
      if (points.length < 2) continue;

      results.push({
        id: `osm-highway-${way.id}`,
        points,
        highwayType,
      });
    }
    return results;
  }
}

function wayCentroid(way: OSMStreetWay): { latitude: number; longitude: number } {
  const pts = way.points;
  if (pts.length === 0) return { latitude: 0, longitude: 0 };
  const sum = pts.reduce(
    (acc, p) => ({ lat: acc.lat + p.latitude, lon: acc.lon + p.longitude }),
    { lat: 0, lon: 0 }
  );
  return { latitude: sum.lat / pts.length, longitude: sum.lon / pts.length };
}
