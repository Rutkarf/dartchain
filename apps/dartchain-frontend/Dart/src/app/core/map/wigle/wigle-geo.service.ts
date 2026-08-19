import { Injectable, inject } from '@angular/core';
import * as THREE from 'three';

import { GeoCoordinateService } from '../geo-coordinate.service';
import { isHarborWaterAt } from '../vieux-port-layout.util';
import { WIGLE_GEO_CONFIG } from './wigle-visual.config';
import type { WigleGroundHeightResolver } from './wigle-ground-placement.util';
import {
  WAVE_EFFECT_TYPES,
  type WigleGeoPoint,
  type WigleNetworkKind,
} from './wigle-point.types';

@Injectable({ providedIn: 'root' })
export class WigleGeoService {
  private readonly geo = inject(GeoCoordinateService);

  private readonly frustum = new THREE.Frustum();
  private readonly projScreenMatrix = new THREE.Matrix4();

  convertGeoToWorld(latitude: number, longitude: number, altitude = 0): THREE.Vector3 {
    return this.geo.geoToWorld(latitude, longitude, altitude);
  }

  enrichPoints(
    rawPoints: Array<{
      id: string;
      latitude: number;
      longitude: number;
      networkName: string;
      networkType: string;
      signalStrength: number;
      source: string;
    }>,
    resolveGroundY?: WigleGroundHeightResolver
  ): WigleGeoPoint[] {
    const enriched: WigleGeoPoint[] = [];
    rawPoints.forEach((point, index) => {
      const world = this.convertGeoToWorld(point.latitude, point.longitude, 0);
      if (isHarborWaterAt(world.x, world.z)) return;

      let worldY = WIGLE_GEO_CONFIG.groundOffsetY;
      if (resolveGroundY) {
        const surface = resolveGroundY(world.x, world.z);
        if (Number.isFinite(surface)) {
          worldY = surface + WIGLE_GEO_CONFIG.groundOffsetY;
        }
      }

      enriched.push({
        id: point.id,
        latitude: point.latitude,
        longitude: point.longitude,
        networkName: point.networkName,
        networkType: normalizeNetworkKind(point.networkType),
        signalStrength: point.signalStrength,
        source: point.source === 'authorized-api' ? 'authorized-api' : 'mock',
        worldX: world.x,
        worldY,
        worldZ: world.z,
        waveEffect: WAVE_EFFECT_TYPES[index % WAVE_EFFECT_TYPES.length],
      });
    });
    return enriched;
  }

  filterByRadius(
    points: WigleGeoPoint[],
    center: THREE.Vector3,
    radiusMeters: number
  ): WigleGeoPoint[] {
    const radiusSq = radiusMeters * radiusMeters;
    return points.filter((point) => {
      const dx = point.worldX - center.x;
      const dz = point.worldZ - center.z;
      return dx * dx + dz * dz <= radiusSq;
    });
  }

  filterVisiblePoints(
    points: WigleGeoPoint[],
    camera: THREE.Camera,
    maxDistance: number
  ): WigleGeoPoint[] {
    this.projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.projScreenMatrix);

    const camPos = camera.position;
    const maxDistSq = maxDistance * maxDistance;
    const visible: WigleGeoPoint[] = [];

    for (const point of points) {
      const dx = point.worldX - camPos.x;
      const dy = point.worldY - camPos.y;
      const dz = point.worldZ - camPos.z;
      if (dx * dx + dy * dy + dz * dz > maxDistSq) continue;

      const sphere = new THREE.Sphere(
        new THREE.Vector3(point.worldX, point.worldY + 4, point.worldZ),
        6
      );
      if (this.frustum.intersectsSphere(sphere)) {
        visible.push(point);
      }
      if (visible.length >= WIGLE_GEO_CONFIG.maxVisiblePoints) break;
    }

    return visible;
  }

  distanceMeters(a: THREE.Vector3, point: WigleGeoPoint): number {
    const dx = a.x - point.worldX;
    const dz = a.z - point.worldZ;
    return Math.sqrt(dx * dx + dz * dz);
  }

  /** Alias Cycle 3 — filtrage frustum + distance caméra. */
  filterVisibleWiglePoints(
    points: WigleGeoPoint[],
    camera: THREE.Camera,
    maxDistance = WIGLE_GEO_CONFIG.meshLineDistance
  ): WigleGeoPoint[] {
    return this.filterVisiblePoints(points, camera, maxDistance);
  }
}

function normalizeNetworkKind(raw: string): WigleNetworkKind {
  switch (raw.toUpperCase()) {
    case 'WIFI':
      return 'WIFI';
    case 'CELL':
      return 'CELL';
    case 'BLE':
      return 'BLE';
    default:
      return 'UNKNOWN';
  }
}
