import * as THREE from 'three';

import type { MapQuality } from './map-configuration';
import { pbrDetailForQuality } from './material-library/material-library.config';

/** MeshPhysicalMaterial (transmission / sheen) réservé au tier full PBR. */
export function usesPhysicalPbrFeatures(quality: MapQuality): boolean {
  return pbrDetailForQuality(quality) === 'full';
}

export interface QuaySurfaceMaterialOptions {
  color?: number;
  roughness: number;
  metalness: number;
  envMapIntensity: number;
  sheen?: number;
  sheenColor?: THREE.Color;
}

/** Quai port — Standard sur albedo/flat, Physical + sheen uniquement en high. */
export function createQuaySurfaceMaterial(
  quality: MapQuality,
  options: QuaySurfaceMaterialOptions
): THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial {
  const color = options.color ?? 0xa8b0bc;

  if (!usesPhysicalPbrFeatures(quality)) {
    return new THREE.MeshStandardMaterial({
      color,
      roughness: options.roughness,
      metalness: options.metalness,
      envMapIntensity: options.envMapIntensity,
      emissive: new THREE.Color(0x182430),
      emissiveIntensity: quality === 'low' ? 0.02 : 0.05,
    });
  }

  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: options.roughness,
    metalness: options.metalness,
    envMapIntensity: options.envMapIntensity,
    sheen: options.sheen ?? 0.08,
    sheenRoughness: 0.38,
    sheenColor: options.sheenColor ?? new THREE.Color(0xc8e8ff),
  });
}

/** Vitrage architectural — transmission coûteuse, réservée au tier high. */
export function createArchitecturalGlassMaterial(
  quality: MapQuality,
  options: {
    color: number;
    roughness?: number;
    metalness?: number;
    opacity?: number;
    envMapIntensity?: number;
    transmission?: number;
    thickness?: number;
  }
): THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial {
  if (!usesPhysicalPbrFeatures(quality)) {
    return new THREE.MeshStandardMaterial({
      color: options.color,
      roughness: options.roughness ?? 0.12,
      metalness: options.metalness ?? 0.22,
      transparent: true,
      opacity: options.opacity ?? 0.42,
      envMapIntensity: options.envMapIntensity ?? 0.95,
      depthWrite: false,
      emissive: new THREE.Color(0x1a3048),
      emissiveIntensity: 0.08,
    });
  }

  return new THREE.MeshPhysicalMaterial({
    color: options.color,
    roughness: options.roughness ?? 0.12,
    metalness: options.metalness ?? 0.22,
    transmission: options.transmission ?? 0.28,
    transparent: true,
    opacity: options.opacity ?? 0.42,
    thickness: options.thickness ?? 0.35,
    depthWrite: false,
  });
}
