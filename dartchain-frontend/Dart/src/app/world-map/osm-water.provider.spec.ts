import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OSMWaterProvider } from './osm-water.provider';

function waterResponse(wayId: number) {
  return {
    elements: [
      {
        type: 'way',
        id: wayId,
        geometry: [
          { lat: 43.2942, lon: 5.3738 },
          { lat: 43.2942, lon: 5.3748 },
          { lat: 43.2938, lon: 5.3748 },
          { lat: 43.2938, lon: 5.3738 },
          { lat: 43.2942, lon: 5.3738 },
        ],
        tags: { natural: 'water' },
      },
    ],
  };
}

describe('OSMWaterProvider', () => {
  let provider: OSMWaterProvider;

  beforeEach(() => {
    provider = new OSMWaterProvider();
    vi.restoreAllMocks();
  });

  it('parse les polygones natural=water', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => waterResponse(55),
    } as Response);

    const ways = await provider.loadWaterPolygons();
    expect(ways).toHaveLength(1);
    expect(ways[0].id).toBe('osm-water-55');
    expect(ways[0].points.length).toBeGreaterThanOrEqual(4);
  });
});
