import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OSMStreetProvider } from './osm-street.provider';

function highwayResponse(wayId: number, highway: string) {
  return {
    elements: [
      {
        type: 'way',
        id: wayId,
        geometry: [
          { lat: 43.2946, lon: 5.3741 },
          { lat: 43.2948, lon: 5.3745 },
        ],
        tags: { highway },
      },
    ],
  };
}

describe('OSMStreetProvider', () => {
  let provider: OSMStreetProvider;

  beforeEach(() => {
    provider = new OSMStreetProvider();
    vi.restoreAllMocks();
  });

  it('parse les ways highway avec géométrie', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => highwayResponse(99, 'residential'),
    } as Response);

    const streets = await provider.loadStreets({
      south: 43.293,
      north: 43.296,
      west: 5.373,
      east: 5.376,
    });

    expect(streets).toHaveLength(1);
    expect(streets[0].id).toBe('osm-highway-99');
    expect(streets[0].highwayType).toBe('residential');
    expect(streets[0].points.length).toBe(2);
  });

  it('retourne le cache si Overpass echoue', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => highwayResponse(1, 'footway'),
    } as Response);

    await provider.loadStreets({
      south: 43.293,
      north: 43.296,
      west: 5.373,
      east: 5.376,
    });

    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('down'));

    const cached = await provider.loadStreets({
      south: 43.293,
      north: 43.296,
      west: 5.373,
      east: 5.376,
    });
    expect(cached.length).toBeGreaterThanOrEqual(1);
  });

  it('loadStreetsVieuxPortCore utilise le bbox 420 m', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => highwayResponse(7, 'tertiary'),
    } as Response);

    const streets = await provider.loadStreetsVieuxPortCore();
    expect(streets).toHaveLength(1);
    expect(provider.getCachedCount()).toBeGreaterThanOrEqual(1);
  });
});
