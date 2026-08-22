import { Injectable } from '@angular/core';

import { environment } from '../../../environments/environment';
import { VIEUX_PORT_OSM_STREET_BOUNDS } from './ground-osm.config';

export interface OSMWaterWay {
  id: string;
  points: Array<{ latitude: number; longitude: number }>;
  waterType: string;
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

@Injectable({ providedIn: 'root' })
export class OSMWaterProvider {
  private readonly cache = new Map<string, OSMWaterWay>();
  private circuitOpenUntil = 0;

  async loadWaterPolygons(bounds = VIEUX_PORT_OSM_STREET_BOUNDS): Promise<OSMWaterWay[]> {
    if (this.isCircuitOpen()) {
      return [...this.cache.values()];
    }

    const query = `
[out:json][timeout:45];
(
  way["natural"="water"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
  way["water"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
  way["waterway"="riverbank"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
);
out geom;
    `.trim();

    try {
      const ways = await this.fetchOverpass(query);
      for (const way of ways) {
        this.cache.set(way.id, way);
      }
      return ways;
    } catch (error) {
      console.warn('[OSMWaterProvider] Overpass indisponible — polygones layout fallback.', error);
      return [...this.cache.values()];
    }
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

  private async fetchOverpass(query: string): Promise<OSMWaterWay[]> {
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

  private parseWays(data: OverpassResponse): OSMWaterWay[] {
    const nodeMap = new Map<number, OverpassNode>();
    const ways: OverpassWay[] = [];

    for (const element of data.elements) {
      if (element.type === 'node') {
        nodeMap.set(element.id, element);
      } else if (element.type === 'way') {
        ways.push(element);
      }
    }

    const results: OSMWaterWay[] = [];
    for (const way of ways) {
      const tags = way.tags ?? {};
      const waterType = tags['natural'] ?? tags['water'] ?? tags['waterway'] ?? 'water';

      let points: Array<{ latitude: number; longitude: number }> = [];
      if (way.geometry && way.geometry.length >= 3) {
        points = way.geometry.map((g) => ({ latitude: g.lat, longitude: g.lon }));
      } else if (way.nodes?.length) {
        points = way.nodes
          .map((nodeId) => nodeMap.get(nodeId))
          .filter((node): node is OverpassNode => !!node)
          .map((node) => ({ latitude: node.lat, longitude: node.lon }));
      }
      if (points.length < 4) continue;

      results.push({
        id: `osm-water-${way.id}`,
        points,
        waterType,
      });
    }
    return results;
  }
}
