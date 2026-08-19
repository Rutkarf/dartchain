import { Injectable } from '@angular/core';

import type { BuildingReference } from './wigle.types';
import {
  attachEntranceToBuilding,
  resolveEntranceFromBox,
  resolveEntranceFromFootprint,
} from './building-entrance.util';

@Injectable({ providedIn: 'root' })
export class WigleBuildingRegistryService {
  private readonly buildings = new Map<string, BuildingReference>();

  register(building: BuildingReference): void {
    this.buildings.set(building.id, attachEntranceToBuilding(building));
  }

  registerMany(buildings: BuildingReference[]): void {
    for (const building of buildings) {
      this.register(building);
    }
  }

  registerFromBox(params: {
    id: string;
    x: number;
    z: number;
    width: number;
    depth: number;
    height: number;
    label?: string;
  }): void {
    const halfW = params.width / 2;
    const halfD = params.depth / 2;
    const centerX = params.x;
    const centerZ = params.z;
    this.register({
      id: params.id,
      label: params.label,
      center: { x: centerX, y: params.height / 2, z: centerZ },
      minX: centerX - halfW,
      maxX: centerX + halfW,
      minZ: centerZ - halfD,
      maxZ: centerZ + halfD,
      height: params.height,
      entrance: resolveEntranceFromBox({
        centerX,
        centerZ,
        width: params.width,
        depth: params.depth,
        height: params.height,
      }),
    });
  }

  registerFromFootprint(params: {
    id: string;
    worldPoints: Array<{ x: number; z: number }>;
    height: number;
    label?: string;
  }): void {
    if (params.worldPoints.length === 0) return;
    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minZ = Number.POSITIVE_INFINITY;
    let maxZ = Number.NEGATIVE_INFINITY;
    let sumX = 0;
    let sumZ = 0;
    for (const point of params.worldPoints) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minZ = Math.min(minZ, point.z);
      maxZ = Math.max(maxZ, point.z);
      sumX += point.x;
      sumZ += point.z;
    }
    const count = params.worldPoints.length;
    const centerX = sumX / count;
    const centerZ = sumZ / count;
    this.register({
      id: params.id,
      label: params.label,
      center: { x: centerX, y: params.height / 2, z: centerZ },
      minX,
      maxX,
      minZ,
      maxZ,
      height: params.height,
      entrance: resolveEntranceFromFootprint(params.worldPoints, params.height),
    });
  }

  list(): BuildingReference[] {
    return [...this.buildings.values()];
  }

  get(id: string): BuildingReference | undefined {
    return this.buildings.get(id);
  }

  clear(): void {
    this.buildings.clear();
  }
}
