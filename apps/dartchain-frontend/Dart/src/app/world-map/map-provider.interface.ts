import * as THREE from 'three';

import type { MapProviderId } from './map-configuration';

/**
 * Abstraction de surface pour le personnage (indépendante d'OSM).
 * Implémentée par les fournisseurs de carte.
 */
export interface SurfaceProvider {
  getSurfaceHeight(worldPosition: THREE.Vector3): Promise<number>;
  getSurfaceHeightSync?(worldX: number, worldZ: number): number | null;
  isWalkable(x: number, z: number, radius: number): boolean;
}

/** Contrat commun aux fournisseurs de carte (legacy floor, Marseille OSM, …). */
export interface MapProvider {
  readonly id: MapProviderId;

  initialize(scene: THREE.Scene, camera: THREE.Camera): Promise<void>;

  update(cameraPosition: THREE.Vector3): void;

  getSurfaceHeight(worldPosition: THREE.Vector3): Promise<number>;

  getSurfaceNormal?(worldPosition: THREE.Vector3): Promise<THREE.Vector3>;

  getSurfaceProvider(): SurfaceProvider;

  /** Nombre de meshes de massing urbain (accurate + OSM). Optionnel. */
  getCityMassingCount?(): number;

  /** Recharge le catalogue accurate si la scène est vide. Optionnel. */
  ensureCityMassing?(): void;

  dispose(): void;
}
