import * as THREE from 'three';

import type { MapQuality } from './map-configuration';
import {
  applyGroundSurfaceMaps,
  createGroundPbrLibrary,
  pbrDetailForQuality,
} from './material-library';
import {
  GROUND_MATERIAL_PRESETS,
  GROUND_SURFACE_LEVELS,
} from './ground-surface.config';

export interface GroundMaterialSet {
  road: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial;
  sidewalk: THREE.MeshStandardMaterial;
  curb: THREE.MeshStandardMaterial;
  gutter: THREE.MeshStandardMaterial;
  esplanade: THREE.MeshStandardMaterial;
  quay: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial;
  contactShadow: THREE.MeshBasicMaterial;
  centerLine: THREE.MeshBasicMaterial;
  laneGlow: THREE.MeshBasicMaterial;
  crosswalkStripe: THREE.MeshStandardMaterial;
}

export interface GroundTextureOwnership {
  textures: THREE.Texture[];
}

/** @deprecated Utiliser createGroundMaterialSet(owner, quality). */
export function createWetAsphaltTexture(owner: GroundTextureOwnership): THREE.CanvasTexture {
  const lib = createGroundPbrLibrary(owner, 'albedo');
  return lib.asphalt.map!;
}

export function createGroundMaterialSet(
  owner: GroundTextureOwnership,
  quality: MapQuality = 'medium'
): GroundMaterialSet {
  const detail = pbrDetailForQuality(quality);
  const lib = createGroundPbrLibrary(owner, detail);
  const P = GROUND_MATERIAL_PRESETS;
  const isFull = detail === 'full';

  const road = isFull
    ? new THREE.MeshPhysicalMaterial({
        color: P.road.color,
        roughness: P.road.wetRoughness,
        metalness: P.road.wetMetalness,
        envMapIntensity: P.road.envMapIntensity,
        clearcoat: 0.22,
        clearcoatRoughness: 0.18,
      })
    : new THREE.MeshStandardMaterial({
        color: detail === 'flat' ? 0x3a3f48 : P.road.color,
        roughness: P.road.wetRoughness,
        metalness: P.road.wetMetalness,
        envMapIntensity: P.road.envMapIntensity,
      });
  applyGroundSurfaceMaps(road, lib.asphalt);

  const sidewalk = new THREE.MeshStandardMaterial({
    color: detail === 'flat' ? P.sidewalk.color : 0xffffff,
    roughness: P.sidewalk.roughness,
    metalness: P.sidewalk.metalness,
  });
  applyGroundSurfaceMaps(sidewalk, lib.sidewalk);

  const curb = new THREE.MeshStandardMaterial({
    color: detail === 'flat' ? P.curb.color : 0xffffff,
    roughness: P.curb.roughness,
    metalness: P.curb.metalness,
  });
  applyGroundSurfaceMaps(curb, lib.curb);

  const gutter = new THREE.MeshStandardMaterial({
    color: P.gutter.color,
    roughness: P.gutter.roughness,
    metalness: P.gutter.metalness,
  });

  const esplanade = new THREE.MeshStandardMaterial({
    color: detail === 'flat' ? P.esplanade.color : 0xffffff,
    roughness: P.esplanade.roughness,
    metalness: P.esplanade.metalness,
    envMapIntensity: isFull ? 0.48 : 0.35,
  });
  applyGroundSurfaceMaps(esplanade, lib.esplanade);

  const quay =
    detail === 'full'
      ? new THREE.MeshPhysicalMaterial({
          color: 0xffffff,
          roughness: P.quay.roughness,
          metalness: P.quay.metalness,
          envMapIntensity: P.quay.envMapIntensity,
          sheen: P.quay.sheen,
          sheenRoughness: 0.36,
          sheenColor: new THREE.Color(0xc8e8ff),
          clearcoat: 0.12,
          clearcoatRoughness: 0.24,
        })
      : new THREE.MeshStandardMaterial({
          color: detail === 'flat' ? P.quay.color : 0xffffff,
          roughness: P.quay.roughness,
          metalness: P.quay.metalness,
          envMapIntensity: P.quay.envMapIntensity,
          emissive: new THREE.Color(0x182430),
          emissiveIntensity: detail === 'albedo' ? 0.05 : 0.02,
        });
  applyGroundSurfaceMaps(quay, lib.quay);

  const crosswalkStripe = new THREE.MeshStandardMaterial({
    color: 0xf2efe6,
    roughness: isFull ? 1 : 0.48,
    metalness: 0.08,
  });
  if (isFull) {
    crosswalkStripe.roughnessMap = lib.sidewalk.roughnessMap ?? null;
    crosswalkStripe.normalMap = lib.sidewalk.normalMap ?? null;
    if (crosswalkStripe.normalMap) {
      crosswalkStripe.normalScale = new THREE.Vector2(0.35, 0.35);
    }
  }

  return {
    road,
    sidewalk,
    curb,
    gutter,
    esplanade,
    quay,
    contactShadow: new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: GROUND_SURFACE_LEVELS.contactShadowOpacity,
      depthWrite: false,
    }),
    centerLine: new THREE.MeshBasicMaterial({
      color: 0xf8d978,
      transparent: true,
      opacity: 0.82,
    }),
    laneGlow: new THREE.MeshBasicMaterial({
      color: 0x51d7ff,
      transparent: true,
      opacity: 0.16,
    }),
    crosswalkStripe,
  };
}

export function disposeGroundMaterialSet(materials: GroundMaterialSet): void {
  const unique = new Set<THREE.Material>(Object.values(materials));
  for (const mat of unique) {
    mat.dispose();
  }
}

export function disposeGroundTextures(owner: GroundTextureOwnership): void {
  for (const tex of owner.textures) {
    tex.dispose();
  }
  owner.textures.length = 0;
}
