import { Injectable, inject } from '@angular/core';

import { GeoJsonBuildingProvider } from '@world-map/geojson-building.provider';
import { projectGeoToMetaverseWorld } from '@world-map/placements/ground-floor-anchor.util';
import {
  isArenaSlimWorld,
  METAVERSE_ARENA_PROFILE,
} from '@world-map/arena/metaverse-arena-profile';
import { ProductConfigService } from '@core/config/product-config.service';

export interface ArenaAabbCollider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  sourceId: string;
}

/**
 * Colliders AABB dérivés du GeoJSON Vieux-Port déjà en repo.
 * Additif : n’altère pas les colliders MetaverseMapProvider.
 */
@Injectable({ providedIn: 'root' })
export class ArenaGeoColliderService {
  private readonly geoJson = inject(GeoJsonBuildingProvider);
  private readonly product = inject(ProductConfigService);
  private colliders: ArenaAabbCollider[] = [];
  private loaded = false;

  async ensureLoaded(): Promise<ArenaAabbCollider[]> {
    if (this.loaded) return this.colliders;
    // Arena slim : zones de collision bâtiments désactivées (code intact).
    if (isArenaSlimWorld(this.product.metaverseArenaEnabled)) {
      this.colliders = [];
      this.loaded = true;
      return this.colliders;
    }
    try {
      const buildings = await this.geoJson.loadVieuxPortBuildings();
      const radius = METAVERSE_ARENA_PROFILE.playRadiusMeters;
      const next: ArenaAabbCollider[] = [];

      for (const building of buildings) {
        const points = building.footprint ?? [];
        if (points.length < 3) continue;
        let minX = Infinity;
        let maxX = -Infinity;
        let minZ = Infinity;
        let maxZ = -Infinity;
        for (const pt of points) {
          const world = projectGeoToMetaverseWorld(pt.latitude, pt.longitude);
          minX = Math.min(minX, world.x);
          maxX = Math.max(maxX, world.x);
          minZ = Math.min(minZ, world.z);
          maxZ = Math.max(maxZ, world.z);
        }
        if (!Number.isFinite(minX) || !Number.isFinite(maxX)) continue;
        const cx = (minX + maxX) * 0.5;
        const cz = (minZ + maxZ) * 0.5;
        if (Math.hypot(cx, cz) > radius) continue;
        next.push({
          minX,
          maxX,
          minZ,
          maxZ,
          sourceId: String(building.id ?? building.cadastralId ?? next.length),
        });
      }

      this.colliders = next;
      this.loaded = true;
    } catch {
      this.colliders = [];
      this.loaded = true;
    }
    return this.colliders;
  }

  isBlocked(x: number, z: number, radius = 0.4): boolean {
    for (const box of this.colliders) {
      if (
        x + radius >= box.minX &&
        x - radius <= box.maxX &&
        z + radius >= box.minZ &&
        z - radius <= box.maxZ
      ) {
        return true;
      }
    }
    return false;
  }

  /** Spawn sûr près d’un point (fallback = point d’origine si libre). */
  findSafeSpawnNear(originX: number, originZ: number, radius = 8): { x: number; z: number } {
    if (!this.isBlocked(originX, originZ, 0.6)) {
      return { x: originX, z: originZ };
    }
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const dist = 1.5 + (i % 5) * 1.2;
      const x = originX + Math.cos(angle) * dist;
      const z = originZ + Math.sin(angle) * dist;
      if (Math.hypot(x, z) > METAVERSE_ARENA_PROFILE.playRadiusMeters) continue;
      if (!this.isBlocked(x, z, 0.6)) return { x, z };
    }
    return { x: originX, z: originZ };
  }

  /** Spawn sûr hors bâtiments, dans le rayon arène. */
  findSafeSpawn(attempts = 24): { x: number; z: number } {
    const radius = METAVERSE_ARENA_PROFILE.playRadiusMeters * 0.45;
    for (let i = 0; i < attempts; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 4 + Math.random() * radius;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      if (!this.isBlocked(x, z, 0.6)) {
        return { x, z };
      }
    }
    return { x: 2.5, z: -4 };
  }
}
