import * as THREE from 'three';

import type { MapQuality } from '../map-configuration';
import type { GeoMappingService, OSMBuildingMatch } from './geo-mapping.service';
import { colorForNetworkType } from './shaders/wigle-wave.shader';
import type { WigleGeoPoint } from './wigle-point.types';

const BATCH_SIZE = 10;
const LOD_NEAR_METERS = 45;
const LOD_FAR_METERS = 120;

interface FootprintEntry {
  wiglePointId: string;
  mesh: THREE.Mesh;
  footprintId: string;
  centroid: THREE.Vector3;
}

/**
 * Bâtiments OSM extrudés associés aux points réseau (couche additive).
 */
export class WigleOsmFootprintManager {
  private root: THREE.Group | null = null;
  private readonly entries = new Map<string, FootprintEntry>();
  private matchedPointIds = new Set<string>();
  private quality: MapQuality = 'medium';
  private loading = false;
  private readonly sharedMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a1a2e,
    emissive: 0x00f3ff,
    emissiveIntensity: 0.28,
    roughness: 0.22,
    metalness: 0.78,
    transparent: true,
    opacity: 0.92,
  });

  attach(parent: THREE.Group, quality: MapQuality): void {
    this.quality = quality;
    this.root = new THREE.Group();
    this.root.name = 'osm-network-footprints';
    parent.add(this.root);
  }

  getMatchedPointIds(): ReadonlySet<string> {
    return this.matchedPointIds;
  }

  getActiveCount(): number {
    return this.entries.size;
  }

  async loadForPoints(
    points: WigleGeoPoint[],
    geoMapping: GeoMappingService,
    centerLat: number,
    centerLon: number,
    radiusMeters: number
  ): Promise<void> {
    if (this.loading || !this.root || points.length === 0) return;
    this.loading = true;

    try {
      const footprints = await geoMapping.fetchOSMBuildings(centerLat, centerLon, radiusMeters);
      if (footprints.length === 0) {
        if (this.entries.size > 0) {
          console.info(
            '[OsmNetworkFootprints] Overpass vide — conservation',
            this.entries.size,
            'footprints existants'
          );
        }
        return;
      }

      const matches = geoMapping.matchWiglePointsToFootprints(points, footprints);
      if (matches.length === 0 && this.entries.size > 0) {
        return;
      }

      this.clearMeshes();
      this.matchedPointIds.clear();

      for (let i = 0; i < matches.length; i += BATCH_SIZE) {
        const batch = matches.slice(i, i + BATCH_SIZE);
        for (const match of batch) {
          this.addFootprintMesh(match, geoMapping, points);
        }
        await yieldToMain();
      }

      console.info(
        '[OsmNetworkFootprints] Footprints OSM:',
        this.entries.size,
        '/',
        points.length,
        'points réseau'
      );
    } catch (error) {
      console.warn('[OsmNetworkFootprints] Échec chargement OSM.', error);
    } finally {
      this.loading = false;
    }
  }

  updateVisibility(cameraPosition: THREE.Vector3, camera?: THREE.Camera): void {
    for (const entry of this.entries.values()) {
      const distance = cameraPosition.distanceTo(entry.centroid);
      const inRange = distance <= LOD_FAR_METERS;

      if (this.quality === 'low') {
        entry.mesh.visible = inRange && distance <= LOD_NEAR_METERS;
      } else {
        entry.mesh.visible = inRange;
      }

      if (entry.mesh.visible && this.quality === 'high') {
        const mat = entry.mesh.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = 0.22 + THREE.MathUtils.clamp((60 - distance) / 60, 0, 0.25);
      }

      if (camera && entry.mesh.visible) {
        entry.mesh.frustumCulled = true;
      }
    }
  }

  dispose(): void {
    this.clearMeshes();
    this.sharedMaterial.dispose();
    if (this.root?.parent) this.root.parent.remove(this.root);
    this.root = null;
    this.matchedPointIds.clear();
  }

  private addFootprintMesh(
    match: OSMBuildingMatch,
    geoMapping: GeoMappingService,
    points: WigleGeoPoint[]
  ): void {
    if (!this.root) return;

    const point = points.find((p) => p.id === match.wiglePointId);
    const color = point ? colorForNetworkType(point.networkType) : 0x00f3ff;
    const material = this.sharedMaterial.clone();
    material.emissive.setHex(color);
    material.emissiveIntensity = 0.32;

    const mesh = geoMapping.createExtrudedMesh(match.footprint, material);
    if (!mesh) return;

    const centroid = geoMapping.footprintCentroid(match.footprint);
    const worldCentroid = geoMapping.geoToWorld(centroid.lat, centroid.lon, 0);

    this.root.add(mesh);
    this.entries.set(match.wiglePointId, {
      wiglePointId: match.wiglePointId,
      mesh,
      footprintId: match.footprint.id,
      centroid: new THREE.Vector3(worldCentroid.x, match.footprint.height / 2, worldCentroid.z),
    });
    this.matchedPointIds.add(match.wiglePointId);
  }

  private clearMeshes(): void {
    for (const entry of this.entries.values()) {
      entry.mesh.geometry.dispose();
      const mat = entry.mesh.material;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat.dispose();
      this.root?.remove(entry.mesh);
    }
    this.entries.clear();
  }
}

function yieldToMain(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
