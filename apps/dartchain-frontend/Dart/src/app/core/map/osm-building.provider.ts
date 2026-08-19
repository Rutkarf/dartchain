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
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

@Injectable({ providedIn: 'root' })
export class OSMBuildingProvider {
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
