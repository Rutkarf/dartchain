import { beforeEach, describe, expect, it, vi } from 'vitest';

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
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
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
    expect(around[0].heightSource).toBe('levels');
  });

  it('filters cached footprints around a GPS center', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      const body = typeof init?.body === 'string' ? init.body : '';
      const lat = body.includes('43.309') ? 43.31 : 43.2965;
      const lon = body.includes('43.309') ? 5.38 : 5.37;
      const id = body.includes('43.309') ? 2 : 1;
      return {
        ok: true,
        json: async () => overpassResponse(id, lat, lon),
      } as Response;
    });

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

  it('never calls overpass-api.de from the browser', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('fail'));
    const buildings = await provider.loadBuildings({
      south: 43.2937,
      north: 43.2999,
      west: 5.3642,
      east: 5.3778,
    });
    expect(buildings).toEqual([]);
    expect(fetchSpy.mock.calls.length).toBeGreaterThan(0);
    for (const call of fetchSpy.mock.calls) {
      expect(String(call[0])).not.toContain('overpass-api.de');
    }
  });

  it('opens circuit after full endpoint failure and soft-fails', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('down'));
    const first = await provider.loadBuildings({
      south: 43.2937,
      north: 43.3095,
      west: 5.354,
      east: 5.394,
    });
    expect(first).toEqual([]);
    const callsAfterFirst = fetchSpy.mock.calls.length;
    expect(callsAfterFirst).toBeGreaterThan(0);

    const second = await provider.loadBuildings({
      south: 43.2937,
      north: 43.3095,
      west: 5.354,
      east: 5.394,
    });
    expect(second).toEqual([]);
    // Circuit ouvert : pas de nouvelle rafale réseau.
    expect(fetchSpy.mock.calls.length).toBe(callsAfterFirst);
  });
});
