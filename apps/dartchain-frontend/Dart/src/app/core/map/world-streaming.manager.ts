import { Injectable, inject } from '@angular/core';
import * as THREE from 'three';

import { GeoCoordinateService } from './geo-coordinate.service';
import {
  MARSEILLE_DISTRICTS,
  WORLD_SCALE,
  type MarseilleDistrictId,
} from './map-configuration';
import {
  chunkBounds,
  chunkIdFromGrid,
  deterministicChunkSeed,
  worldToChunkGrid,
  type BuildingType,
  type WorldChunk,
} from './world-chunk.types';

interface LoadedChunk extends WorldChunk {
  group: THREE.Group;
  geometries: THREE.BufferGeometry[];
  buildingCount: number;
}

export interface StreamingStats {
  loadedChunks: number;
  buildings: number;
  currentChunkId: string;
}

/**
 * Streaming déterministe autour du joueur.
 * Un groupe par chunk, matériaux partagés, déchargement hors rayon.
 */
@Injectable({ providedIn: 'root' })
export class WorldStreamingManager {
  private readonly geo = inject(GeoCoordinateService);

  private root: THREE.Group | null = null;
  private readonly loaded = new Map<string, LoadedChunk>();
  private readonly districtWorld = new Map<MarseilleDistrictId, THREE.Vector3>();
  private groundMaterial: THREE.MeshStandardMaterial | null = null;
  private wallMaterials: THREE.MeshStandardMaterial[] = [];
  private neonMaterials: THREE.MeshBasicMaterial[] = [];
  private roofMaterial: THREE.MeshStandardMaterial | null = null;
  private hillMaterial: THREE.MeshStandardMaterial | null = null;
  private lastGrid = { x: Number.MAX_SAFE_INTEGER, z: Number.MAX_SAFE_INTEGER };
  private buildingTotal = 0;

  attach(root: THREE.Group): void {
    this.root = root;
    this.districtWorld.clear();
    for (const [id, district] of Object.entries(MARSEILLE_DISTRICTS) as Array<
      [MarseilleDistrictId, (typeof MARSEILLE_DISTRICTS)[MarseilleDistrictId]]
    >) {
      this.districtWorld.set(
        id,
        this.geo.geoToWorld(district.latitude, district.longitude, 0)
      );
    }
    this.ensureSharedMaterials();
  }

  update(playerPosition: THREE.Vector3): StreamingStats {
    const gridX = worldToChunkGrid(playerPosition.x);
    const gridZ = worldToChunkGrid(playerPosition.z);
    const currentId = chunkIdFromGrid(gridX, gridZ);
    if (gridX !== this.lastGrid.x || gridZ !== this.lastGrid.z || this.loaded.size === 0) {
      this.lastGrid = { x: gridX, z: gridZ };
      this.syncChunks(gridX, gridZ);
    }
    return {
      loadedChunks: this.loaded.size,
      buildings: this.buildingTotal,
      currentChunkId: currentId,
    };
  }

  getLoadedChunkIds(): string[] {
    return [...this.loaded.keys()];
  }

  dispose(): void {
    for (const chunk of this.loaded.values()) {
      this.unloadChunk(chunk.id);
    }
    this.loaded.clear();
    this.groundMaterial?.dispose();
    this.roofMaterial?.dispose();
    this.hillMaterial?.dispose();
    for (const material of this.wallMaterials) {
      material.dispose();
    }
    for (const material of this.neonMaterials) {
      material.dispose();
    }
    this.wallMaterials = [];
    this.neonMaterials = [];
    this.groundMaterial = null;
    this.roofMaterial = null;
    this.hillMaterial = null;
    this.root = null;
    this.buildingTotal = 0;
  }

  private ensureSharedMaterials(): void {
    if (this.groundMaterial) return;
    this.groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x2c333c,
      roughness: 0.92,
      metalness: 0.04,
    });
    this.roofMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a515c,
      roughness: 0.86,
      metalness: 0.1,
    });
    this.hillMaterial = new THREE.MeshStandardMaterial({
      color: 0x3d4a3a,
      roughness: 0.95,
      metalness: 0.02,
    });
    this.wallMaterials = [
      new THREE.MeshStandardMaterial({ color: 0xcbb8a0, roughness: 0.84, metalness: 0.05 }),
      new THREE.MeshStandardMaterial({ color: 0xe08ab8, roughness: 0.7, metalness: 0.08 }),
      new THREE.MeshStandardMaterial({ color: 0x7aa6ff, roughness: 0.45, metalness: 0.22 }),
      new THREE.MeshStandardMaterial({ color: 0x8d7cff, roughness: 0.5, metalness: 0.18 }),
      new THREE.MeshStandardMaterial({ color: 0xd9c4a2, roughness: 0.8, metalness: 0.04 }),
      new THREE.MeshStandardMaterial({
        color: MARSEILLE_DISTRICTS['le-panier'].palette,
        roughness: 0.78,
        metalness: 0.04,
      }),
      new THREE.MeshStandardMaterial({
        color: MARSEILLE_DISTRICTS.joliette.palette,
        roughness: 0.42,
        metalness: 0.38,
      }),
    ];
    this.neonMaterials = [
      new THREE.MeshBasicMaterial({ color: 0xff3ecf }),
      new THREE.MeshBasicMaterial({ color: 0x40e0ff }),
      new THREE.MeshBasicMaterial({ color: 0xffe600 }),
      new THREE.MeshBasicMaterial({ color: 0x7a5cff }),
    ];
  }

  private syncChunks(originX: number, originZ: number): void {
    const radius = Math.ceil(WORLD_SCALE.generationDistanceMeters / WORLD_SCALE.chunkSizeMeters);
    const wanted = new Set<string>();
    const ranked: Array<{ id: string; gridX: number; gridZ: number; dist: number }> = [];
    for (let dz = -radius; dz <= radius; dz++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const gridX = originX + dx;
        const gridZ = originZ + dz;
        const dist = Math.hypot(dx, dz);
        if (dist > radius) continue;
        ranked.push({ id: chunkIdFromGrid(gridX, gridZ), gridX, gridZ, dist });
      }
    }
    ranked.sort((a, b) => a.dist - b.dist);
    for (const entry of ranked.slice(0, WORLD_SCALE.maxLoadedChunks)) {
      wanted.add(entry.id);
      if (!this.loaded.has(entry.id)) {
        this.loadChunk(entry.gridX, entry.gridZ);
      }
    }
    for (const id of [...this.loaded.keys()]) {
      if (!wanted.has(id)) {
        this.unloadChunk(id);
      }
    }
  }

  private loadChunk(gridX: number, gridZ: number): void {
    if (!this.root || !this.groundMaterial || !this.roofMaterial || !this.hillMaterial) return;
    const id = chunkIdFromGrid(gridX, gridZ);
    const bounds = chunkBounds(gridX, gridZ);
    const seed = deterministicChunkSeed(gridX, gridZ);
    const group = new THREE.Group();
    group.name = id;
    const geometries: THREE.BufferGeometry[] = [];
    const centerX = (bounds.minX + bounds.maxX) * 0.5;
    const centerZ = (bounds.minZ + bounds.maxZ) * 0.5;

    const inCore = Math.hypot(centerX, centerZ) < 180;
    const district = this.nearestDistrict(centerX, centerZ);
    let buildingCount = 0;

    if (!inCore) {
      const groundGeo = new THREE.PlaneGeometry(
        WORLD_SCALE.chunkSizeMeters,
        WORLD_SCALE.chunkSizeMeters
      );
      geometries.push(groundGeo);
      const ground = new THREE.Mesh(groundGeo, this.groundMaterial);
      ground.rotation.x = -Math.PI / 2;
      ground.position.set(centerX, 0.01, centerZ);
      ground.name = `${id}-ground`;
      group.add(ground);

      if (district === 'notre-dame') {
        buildingCount += this.addNotreDameHill(group, geometries, centerX, centerZ);
      } else if (district === 'la-plaine') {
        buildingCount += this.addPlainePlaza(group, geometries, centerX, centerZ, seed);
      } else {
        buildingCount += this.addSeededBlocks(group, geometries, bounds, seed, district);
      }
    }

    this.root.add(group);
    this.loaded.set(id, {
      id,
      gridX,
      gridZ,
      seed,
      state: 'loaded',
      bounds,
      group,
      geometries,
      buildingCount,
    });
    this.buildingTotal += buildingCount;
  }

  private unloadChunk(id: string): void {
    const chunk = this.loaded.get(id);
    if (!chunk) return;
    chunk.state = 'unloading';
    this.root?.remove(chunk.group);
    for (const geometry of chunk.geometries) {
      geometry.dispose();
    }
    this.buildingTotal -= chunk.buildingCount;
    this.loaded.delete(id);
  }

  private nearestDistrict(x: number, z: number): MarseilleDistrictId {
    let best: MarseilleDistrictId = 'vieux-port';
    let bestDist = Number.POSITIVE_INFINITY;
    for (const [id, pos] of this.districtWorld) {
      const dist = Math.hypot(pos.x - x, pos.z - z);
      if (dist < bestDist) {
        bestDist = dist;
        best = id;
      }
    }
    return bestDist < 220 ? best : this.fallbackDistrict(x, z);
  }

  private fallbackDistrict(x: number, z: number): MarseilleDistrictId {
    if (z < -80 && Math.abs(x) < 80) return 'canebiere';
    if (x > 80 && z < -40) return 'cours-julien';
    if (x > 80 && z > 20) return 'la-plaine';
    if (x < -20 && z < -140) return 'joliette';
    if (x < -50 && z < 40) return 'le-panier';
    if (z > 900) return 'notre-dame';
    return 'vieux-port';
  }

  private addSeededBlocks(
    group: THREE.Group,
    geometries: THREE.BufferGeometry[],
    bounds: ReturnType<typeof chunkBounds>,
    seed: number,
    district: MarseilleDistrictId
  ): number {
    const count =
      district === 'cours-julien' || district === 'joliette'
        ? 8
        : district === 'canebiere' || district === 'le-panier'
          ? 7
          : 6;
    let built = 0;
    for (let i = 0; i < count; i++) {
      const u = this.unit(seed + i * 19);
      const v = this.unit(seed + i * 47 + 3);
      const x = THREE.MathUtils.lerp(bounds.minX + 14, bounds.maxX - 14, u);
      const z = THREE.MathUtils.lerp(bounds.minZ + 14, bounds.maxZ - 14, v);
      if (Math.abs(x) < 36 && z > -240 && z < 24) continue;
      const type = this.buildingType(district, i);
      const width =
        type === 'tower' ? 10 + u * 6 : type === 'industrial' ? 16 + u * 14 : 8 + u * 12;
      const depth =
        type === 'house' ? 8 + v * 6 : type === 'industrial' ? 14 + v * 12 : 10 + v * 10;
      const height =
        type === 'tower'
          ? 28 + v * 22
          : type === 'house'
            ? 8 + u * 6
            : type === 'industrial'
              ? 10 + u * 8
              : 12 + u * 16;
      const geo = new THREE.BoxGeometry(width, height, depth);
      geometries.push(geo);
      const wall = this.wallForDistrict(district, i);
      const mesh = new THREE.Mesh(geo, wall);
      mesh.name = `${group.name}-${type}-${i}`;
      mesh.position.set(x, height / 2, z);
      mesh.frustumCulled = true;
      group.add(mesh);
      if (this.roofMaterial) {
        const roofGeo = new THREE.BoxGeometry(width * 0.94, 0.6, depth * 0.94);
        geometries.push(roofGeo);
        const roof = new THREE.Mesh(roofGeo, this.roofMaterial);
        roof.position.set(x, height + 0.35, z);
        group.add(roof);
      }
      built += 1;
    }
    if (district === 'cours-julien') {
      built += this.addCoursJulienDetails(group, geometries, bounds, seed);
    }
    return built;
  }

  private addCoursJulienDetails(
    group: THREE.Group,
    geometries: THREE.BufferGeometry[],
    bounds: ReturnType<typeof chunkBounds>,
    seed: number
  ): number {
    const muralColors = this.neonMaterials;
    let extra = 0;
    for (let i = 0; i < 3; i++) {
      const u = this.unit(seed + 200 + i * 11);
      const x = THREE.MathUtils.lerp(bounds.minX + 10, bounds.maxX - 10, u);
      const z = THREE.MathUtils.lerp(bounds.minZ + 10, bounds.maxZ - 10, this.unit(seed + 311 + i));
      const muralGeo = new THREE.PlaneGeometry(5.2, 4.4);
      geometries.push(muralGeo);
      const mural = new THREE.Mesh(
        muralGeo,
        this.wallMaterials[(i + 1) % this.wallMaterials.length]
      );
      mural.position.set(x, 3.2, z);
      mural.rotation.y = u > 0.5 ? Math.PI / 2 : 0;
      mural.name = `${group.name}-mural-${i}`;
      group.add(mural);
      const neonGeo = new THREE.BoxGeometry(0.08, 3.6, 0.08);
      geometries.push(neonGeo);
      const neon = new THREE.Mesh(neonGeo, muralColors[i % muralColors.length]);
      neon.position.set(x + 2.4, 2.4, z);
      group.add(neon);
      extra += 1;
    }
    return extra;
  }

  private addPlainePlaza(
    group: THREE.Group,
    geometries: THREE.BufferGeometry[],
    x: number,
    z: number,
    seed: number
  ): number {
    if (!this.groundMaterial) return 0;
    const plazaGeo = new THREE.CircleGeometry(36, 32);
    geometries.push(plazaGeo);
    const plaza = new THREE.Mesh(plazaGeo, this.groundMaterial);
    plaza.rotation.x = -Math.PI / 2;
    plaza.position.set(x, 0.04, z);
    plaza.name = `${group.name}-plaine-plaza`;
    group.add(plaza);
    if (this.roofMaterial) {
      const benchGeo = new THREE.BoxGeometry(2.4, 0.42, 0.55);
      geometries.push(benchGeo);
      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2;
        const bench = new THREE.Mesh(benchGeo, this.roofMaterial);
        bench.position.set(x + Math.cos(angle) * 18, 0.24, z + Math.sin(angle) * 18);
        bench.rotation.y = angle + Math.PI / 2;
        bench.name = `${group.name}-plaine-bench-${i}`;
        group.add(bench);
      }
    }
    return this.addSeededBlocks(
      group,
      geometries,
      {
        minX: x - 58,
        maxX: x + 58,
        minZ: z - 58,
        maxZ: z + 58,
      },
      seed,
      'la-plaine'
    );
  }

  private addNotreDameHill(
    group: THREE.Group,
    geometries: THREE.BufferGeometry[],
    x: number,
    z: number
  ): number {
    if (!this.hillMaterial) return 0;
    const hillGeo = new THREE.ConeGeometry(52, 42, 10);
    geometries.push(hillGeo);
    const hill = new THREE.Mesh(hillGeo, this.hillMaterial);
    hill.position.set(x, 21, z);
    hill.name = `${group.name}-hill`;
    group.add(hill);
    const spireGeo = new THREE.CylinderGeometry(1.8, 3.4, 28, 8);
    geometries.push(spireGeo);
    const spire = new THREE.Mesh(
      spireGeo,
      new THREE.MeshStandardMaterial({
        color: 0xf2ece3,
        emissive: 0x665533,
        emissiveIntensity: 0.18,
        roughness: 0.55,
        metalness: 0.12,
      })
    );
    spire.position.set(x, 56, z);
    spire.name = `${group.name}-belvedere-spire`;
    group.add(spire);
    return 1;
  }

  private wallForDistrict(district: MarseilleDistrictId, index: number): THREE.MeshStandardMaterial {
    if (district === 'le-panier') return this.wallMaterials[5] ?? this.wallMaterials[0];
    if (district === 'joliette') return this.wallMaterials[6] ?? this.wallMaterials[0];
    return this.wallMaterials[index % Math.min(5, this.wallMaterials.length)];
  }

  private buildingType(district: MarseilleDistrictId, index: number): BuildingType {
    if (district === 'cours-julien') return index % 3 === 0 ? 'club' : 'apartment';
    if (district === 'canebiere') return index % 4 === 0 ? 'tower' : 'historic-block';
    if (district === 'la-plaine') return index % 2 === 0 ? 'market' : 'apartment';
    if (district === 'notre-dame') return 'landmark';
    if (district === 'le-panier') return index % 3 === 0 ? 'historic-block' : 'house';
    if (district === 'joliette') return index % 3 === 0 ? 'port-building' : 'industrial';
    return index % 5 === 0 ? 'port-building' : 'house';
  }

  private unit(seed: number): number {
    let x = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b);
    x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
    return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
  }
}
