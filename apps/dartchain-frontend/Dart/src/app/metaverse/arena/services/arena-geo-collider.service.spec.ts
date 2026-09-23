import { describe, expect, it } from 'vitest';

import { ArenaGeoColliderService } from './arena-geo-collider.service';

describe('ArenaGeoColliderService', () => {
  it('détecte un point dans un AABB', () => {
    const service = Object.create(ArenaGeoColliderService.prototype) as ArenaGeoColliderService;
    (service as unknown as { colliders: { minX: number; maxX: number; minZ: number; maxZ: number; sourceId: string }[] }).colliders = [
      { minX: -1, maxX: 1, minZ: -1, maxZ: 1, sourceId: 't' },
    ];
    (service as unknown as { loaded: boolean }).loaded = true;

    expect(service.isBlocked(0, 0)).toBe(true);
    expect(service.isBlocked(5, 5)).toBe(false);
  });
});
