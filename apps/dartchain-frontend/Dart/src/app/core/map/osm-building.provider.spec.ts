import { vi } from 'vitest';

import { OSMBuildingProvider } from './osm-building.provider';

function overpassResponse(wayId: number, lat: number, lon: number) {
  const nodeId = wayId * 10;
  return {
    elements: [
      { type: 'node', id: nodeId, lat, lon },
      { type: 'node', id: nodeId + 1, lat, lon: lon + 0.0001 },
      { type: 'node', id: nodeId + 2, lat: lat - 0.0001, lon: lon + 0.0001 },
      { type: 'node', id: nodeId + 3, lat: lat - 0.0001, lon },
      {
        type: 'way',
        id: wayId,
        nodes: [nodeId, nodeId + 1, nodeId + 2, nodeId + 3, nodeId],
        tags: { building: 'yes', 'building:levels': '3' },
      },
    ],
  };
}

describe('OSMBuildingProvider cache', () => {
  let provider: OSMBuildingProvider;

  beforeEach(() => {
    provider = new OSMBuildingProvider();
    vi.restoreAllMocks();
  });

  it('reuses in-memory cache when Overpass fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => overpassResponse(42, 43.2965, 5.37),
    } as Response);

    await provider.loadBuildings({
      south: 43.2937,
      north: 43.2999,
      west: 5.3642,
      east: 5.3778,
    });

    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'));

    const around = await provider.loadBuildingsAround(43.2965, 5.37, 500);
    expect(around).toHaveLength(1);
    expect(around[0].id).toBe('osm-way-42');
  });

  it('filters cached footprints around a GPS center', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => overpassResponse(1, 43.2965, 5.37),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => overpassResponse(2, 43.31, 5.38),
      } as Response);

    await provider.loadBuildings({
      south: 43.2937,
      north: 43.2999,
      west: 5.3642,
      east: 5.3778,
    });
    await provider.loadBuildings({
      south: 43.309,
      north: 43.311,
      west: 5.379,
      east: 5.382,
    });

    const nearby = provider.filterCachedAround(43.2965, 5.37, 500);
    expect(nearby.map((fp) => fp.id)).toEqual(['osm-way-1']);
  });
});
