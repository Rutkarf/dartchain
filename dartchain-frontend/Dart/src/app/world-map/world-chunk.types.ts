import { WORLD_SCALE } from './map-configuration';

export type WorldChunkState = 'unloaded' | 'loading' | 'loaded' | 'unloading';

export interface WorldChunkBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface WorldChunk {
  id: string;
  gridX: number;
  gridZ: number;
  seed: number;
  state: WorldChunkState;
  bounds: WorldChunkBounds;
}

export type BuildingType =
  | 'historic-block'
  | 'apartment'
  | 'house'
  | 'tower'
  | 'industrial'
  | 'market'
  | 'club'
  | 'metro'
  | 'landmark'
  | 'port-building';

export function chunkIdFromGrid(gridX: number, gridZ: number): string {
  return `chunk:${gridX}:${gridZ}`;
}

export function worldToChunkGrid(world: number, chunkSize = WORLD_SCALE.chunkSizeMeters): number {
  return Math.floor(world / chunkSize);
}

export function chunkBounds(gridX: number, gridZ: number): WorldChunkBounds {
  const size = WORLD_SCALE.chunkSizeMeters;
  return {
    minX: gridX * size,
    maxX: (gridX + 1) * size,
    minZ: gridZ * size,
    maxZ: (gridZ + 1) * size,
  };
}

export function deterministicChunkSeed(gridX: number, gridZ: number): number {
  let x = Math.imul(gridX | 0, 0x9e3779b1) ^ Math.imul(gridZ | 0, 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  return (x ^ (x >>> 15)) >>> 0;
}
