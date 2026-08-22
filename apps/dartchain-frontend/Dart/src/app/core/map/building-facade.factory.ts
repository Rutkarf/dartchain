import * as THREE from 'three';

import type { MapQuality } from './map-configuration';
import {
  applyFacadePbrMaps,
  createHaussmannFacadePbrMaps,
  createHaussmannRoofPbrMaps,
  createPlinthPbrMaps,
  pbrDetailForQuality,
} from './material-library';
import { nightWindowEmissiveScale } from './night-lighting.config';

/** ~3,5 m de façade par tuile texture (fenêtres haussmanniennes). */
export const FACADE_TILE_WIDTH_M = 3.6;
export const FACADE_TILE_HEIGHT_M = 3.2;

export interface FacadeTextureOwnership {
  textures: THREE.Texture[];
}

export interface HaussmannFacadeOptions {
  baseColor: number;
  windowColor: string;
  accentColor: string;
  shutters?: boolean;
  seed?: number;
  windowLitRatio?: number;
  quality?: MapQuality;
}

export function stableFacadeUnit(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43_758.5453;
  return x - Math.floor(x);
}

/** @deprecated Phase 7 — utiliser createHaussmannFacadePbrMaps via createHaussmannWallMaterial. */
export function createHaussmannFacadeMaps(
  options: HaussmannFacadeOptions,
  owner?: FacadeTextureOwnership
): { map: THREE.CanvasTexture; emissiveMap: THREE.CanvasTexture } {
  const detail = pbrDetailForQuality(options.quality ?? 'medium');
  const maps = createHaussmannFacadePbrMaps(options, detail, owner);
  return { map: maps.map, emissiveMap: maps.emissiveMap };
}

export function createHaussmannRoofTexture(
  owner?: FacadeTextureOwnership,
  quality: MapQuality = 'medium'
): THREE.CanvasTexture {
  const maps = createHaussmannRoofPbrMaps(pbrDetailForQuality(quality), owner);
  return maps.map ?? new THREE.CanvasTexture(document.createElement('canvas'));
}

export function createHaussmannWallMaterial(
  seed: number,
  owner?: FacadeTextureOwnership,
  tint: HaussmannFacadeOptions = {
    baseColor: 0xcbbda6,
    windowColor: '#d9ebf5',
    accentColor: '#8d6f55',
    shutters: true,
    seed,
  }
): THREE.MeshStandardMaterial {
  const quality = tint.quality ?? 'medium';
  const detail = pbrDetailForQuality(quality);
  const maps = createHaussmannFacadePbrMaps({ ...tint, seed }, detail, owner);
  const windowScale = nightWindowEmissiveScale(quality);
  const baseEmissive = detail === 'full' ? 0.48 : 0.42;
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: new THREE.Color(0xffe8a8),
    emissiveIntensity: windowScale > 0 ? baseEmissive * (windowScale / 0.42) : 0,
    roughness: detail === 'full' ? 1 : 0.84,
    metalness: 0.05,
    envMapIntensity: detail === 'full' ? 0.68 : 0.55,
    fog: false,
    side: THREE.DoubleSide,
  });
  applyFacadePbrMaps(material, maps);
  return material;
}

export function createHaussmannRoofMaterial(
  owner?: FacadeTextureOwnership,
  quality: MapQuality = 'medium'
): THREE.MeshStandardMaterial {
  const detail = pbrDetailForQuality(quality);
  const maps = createHaussmannRoofPbrMaps(detail, owner);
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: detail === 'full' ? 1 : 0.93,
    metalness: 0.07,
    envMapIntensity: detail === 'full' ? 0.42 : 0.35,
    fog: false,
    side: THREE.DoubleSide,
  });
  applyFacadePbrMaps(material, maps);
  if (maps.map) {
    maps.map.repeat.set(1.4, 1.4);
    maps.map.needsUpdate = true;
  }
  return material;
}

export function createCorniceMaterial(quality: MapQuality = 'medium'): THREE.MeshStandardMaterial {
  const detail = pbrDetailForQuality(quality);
  const material = new THREE.MeshStandardMaterial({
    color: 0x8a7a68,
    roughness: detail === 'full' ? 0.72 : 0.78,
    metalness: 0.08,
    emissive: new THREE.Color(0x1a1410),
    emissiveIntensity: 0.12,
    fog: false,
    side: THREE.DoubleSide,
  });
  if (detail === 'full') {
    material.envMapIntensity = 0.45;
  }
  return material;
}

/** Socle rez-de-chaussée — pierre plus sombre (parcelle cadastre). */
export function createCadastrePlinthMaterial(
  quality: MapQuality = 'medium',
  owner?: FacadeTextureOwnership
): THREE.MeshStandardMaterial {
  const detail = pbrDetailForQuality(quality);
  const maps = createPlinthPbrMaps(detail, owner);
  const material = new THREE.MeshStandardMaterial({
    color: detail === 'flat' ? 0x6a5c50 : 0xffffff,
    roughness: detail === 'full' ? 1 : 0.9,
    metalness: 0.04,
    emissive: new THREE.Color(0x0a0806),
    emissiveIntensity: 0.08,
    fog: false,
    side: THREE.DoubleSide,
  });
  applyFacadePbrMaps(material, maps);
  return material;
}

/** Façades cadastre — fenêtres un peu plus chaudes / lisibles près du spawn. */
export function createCadastreWallMaterial(
  seed: number,
  owner?: FacadeTextureOwnership,
  tint?: Partial<HaussmannFacadeOptions>
): THREE.MeshStandardMaterial {
  const quality = tint?.quality ?? 'medium';
  const material = createHaussmannWallMaterial(seed, owner, {
    baseColor: 0xd8ccb4,
    windowColor: '#eef4fa',
    accentColor: '#a08870',
    shutters: true,
    windowLitRatio: 0.54,
    seed,
    quality,
    ...tint,
  });
  material.emissiveIntensity =
    nightWindowEmissiveScale(quality) > 0
      ? (pbrDetailForQuality(quality) === 'full' ? 0.54 : 0.5) *
        (nightWindowEmissiveScale(quality) / 0.42)
      : 0;
  material.envMapIntensity = pbrDetailForQuality(quality) === 'full' ? 0.72 : 0.62;
  return material;
}

export function createCadastreRoofMaterial(
  owner?: FacadeTextureOwnership,
  quality: MapQuality = 'medium'
): THREE.MeshStandardMaterial {
  const material = createHaussmannRoofMaterial(owner, quality);
  material.color = new THREE.Color(0xf0f0f0);
  material.emissive = new THREE.Color(0x0c1018);
  material.emissiveIntensity = 0.06;
  return material;
}

/** Ajuste le repeat UV pour un extrude (empreinte + hauteur). Clone les maps si demandé. */
export function tuneWallMaterialForFootprint(
  material: THREE.MeshStandardMaterial,
  heightMeters: number,
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number },
  cloneMaps = false
): THREE.MeshStandardMaterial {
  const width = Math.max(2, bounds.maxX - bounds.minX);
  const depth = Math.max(2, bounds.maxZ - bounds.minZ);
  const perimeter = 2 * (width + depth);
  const uRepeat = Math.max(1.2, perimeter / FACADE_TILE_WIDTH_M);
  const vRepeat = Math.max(1.4, heightMeters / FACADE_TILE_HEIGHT_M);

  const target = cloneMaps ? material.clone() : material;
  const mapKeys = ['map', 'emissiveMap', 'normalMap', 'roughnessMap'] as const;
  for (const key of mapKeys) {
    const source = material[key];
    if (!source) continue;
    if (cloneMaps) {
      target[key] = source.clone();
      target[key]!.wrapS = THREE.RepeatWrapping;
      target[key]!.wrapT = THREE.RepeatWrapping;
    }
    target[key]!.repeat.set(uRepeat, vRepeat);
    target[key]!.needsUpdate = true;
  }
  return target;
}

export function tuneRoofMaterialForFootprint(
  material: THREE.MeshStandardMaterial,
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number },
  cloneMap = false
): THREE.MeshStandardMaterial {
  const width = Math.max(2, bounds.maxX - bounds.minX);
  const depth = Math.max(2, bounds.maxZ - bounds.minZ);
  const target = cloneMap ? material.clone() : material;
  const keys = ['map', 'normalMap', 'roughnessMap'] as const;
  for (const key of keys) {
    const source = material[key];
    if (!source) continue;
    if (cloneMap) {
      target[key] = source.clone();
      target[key]!.wrapS = THREE.RepeatWrapping;
      target[key]!.wrapT = THREE.RepeatWrapping;
    }
    if (target[key]) {
      target[key]!.repeat.set(Math.max(1, width / 5.5), Math.max(1, depth / 5.5));
      target[key]!.needsUpdate = true;
    }
  }
  return target;
}
