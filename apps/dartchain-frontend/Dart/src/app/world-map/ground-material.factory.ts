import * as THREE from 'three';

import type { MapQuality } from './map-configuration';
import { SPAWN_CIRCLE_GROUND_COLOR, SPAWN_CIRCLE_GROUND_DEEP_COLOR } from './map-configuration';
import {
  applyGroundSurfaceMaps,
  createGroundPbrLibrary,
  pbrDetailForQuality,
} from './material-library';
import {
  GROUND_MATERIAL_PRESETS,
  GROUND_SURFACE_LEVELS,
} from './ground-surface.config';
import { METAVERSE_ARENA_PROFILE } from './arena/metaverse-arena-profile';

/** Matériau de surface sol — Standard/Physical (monde complet) ou Lambert/Basic (Arena slim). */
export type GroundSurfaceMaterial =
  | THREE.MeshStandardMaterial
  | THREE.MeshPhysicalMaterial
  | THREE.MeshLambertMaterial
  | THREE.MeshBasicMaterial;

export interface GroundMaterialSet {
  road: GroundSurfaceMaterial;
  sidewalk: GroundSurfaceMaterial;
  curb: GroundSurfaceMaterial;
  gutter: GroundSurfaceMaterial;
  esplanade: GroundSurfaceMaterial;
  quay: GroundSurfaceMaterial;
  /** Sol intérieur cercle spawn — vert bouteille exclusif, jamais partagé. */
  spawnCircleGround: GroundSurfaceMaterial;
  contactShadow: THREE.MeshBasicMaterial;
  centerLine: THREE.MeshBasicMaterial;
  laneGlow: THREE.MeshBasicMaterial;
  crosswalkStripe: GroundSurfaceMaterial;
}

/** Matériau unique du disque sol spawn (pas de map / pas de teinte réutilisée). */
export function createSpawnCircleGroundMaterial(): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({
    color: SPAWN_CIRCLE_GROUND_COLOR,
    emissive: new THREE.Color(SPAWN_CIRCLE_GROUND_DEEP_COLOR),
    emissiveIntensity: 0.18,
    fog: true,
    side: THREE.FrontSide,
  });
}

export interface GroundTextureOwnership {
  textures: THREE.Texture[];
}

/** @deprecated Utiliser createGroundMaterialSet(owner, quality). */
export function createWetAsphaltTexture(owner: GroundTextureOwnership): THREE.CanvasTexture {
  const lib = createGroundPbrLibrary(owner, 'albedo');
  return lib.asphalt.map!;
}

/**
 * Sol Arena slim — night-tech glassmorphisme + grille neon (Option 1).
 * Lambert + une texture grille partagée (pas de PBR wet tick).
 */
export function createArenaSlimGroundMaterialSet(): GroundMaterialSet {
  const P = METAVERSE_ARENA_PROFILE.palette;
  const grid = createNightTechGridTexture();

  const glass = (color: number): THREE.MeshLambertMaterial => {
    const mat = new THREE.MeshLambertMaterial({
      color,
      map: grid,
      fog: true,
      side: THREE.FrontSide,
    });
    mat.userData['disposeMapWithMaterial'] = true;
    return mat;
  };

  return {
    /** Allées — vitre teintée sombre. */
    road: glass(P.ochre),
    /** Trottoirs — verre deep. */
    sidewalk: glass(P.sand),
    curb: glass(P.warmGray),
    gutter: glass(P.glassDeep),
    /** Esplanade Ombrière — dalle glassmorphique. */
    esplanade: glass(P.offWhite),
    /** Quai — bleuté froid. */
    quay: glass(0x0d0630),
    spawnCircleGround: createSpawnCircleGroundMaterial(),
    contactShadow: new THREE.MeshBasicMaterial({
      color: 0x0d0630,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      fog: false,
    }),
    centerLine: new THREE.MeshBasicMaterial({
      color: P.neonCyan,
      transparent: true,
      opacity: 0.55,
      fog: true,
    }),
    laneGlow: new THREE.MeshBasicMaterial({
      color: P.neonMagenta,
      transparent: true,
      opacity: 0.12,
      fog: true,
    }),
    crosswalkStripe: glass(0x18314f),
  };
}

/** Terrain fond Arena slim — night-tech, grille large. */
export function createArenaSlimTerrainMaterial(): THREE.MeshLambertMaterial {
  const grid = createNightTechGridTexture(0.55);
  const mat = new THREE.MeshLambertMaterial({
    color: METAVERSE_ARENA_PROFILE.palette.sand,
    map: grid,
    fog: true,
    side: THREE.FrontSide,
  });
  mat.userData['disposeMapWithMaterial'] = true;
  return mat;
}

/** Grille neon glassmorphique — base sombre, traits cyan, accents magenta discrets. */
function createNightTechGridTexture(lineAlpha = 0.72): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const base = ctx.createRadialGradient(256, 256, 40, 256, 256, 340);
    base.addColorStop(0, '#0a1220');
    base.addColorStop(0.55, '#0a1220');
    base.addColorStop(1, '#0a1220');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 512, 512);

    // Soft glass sheen.
    const sheen = ctx.createLinearGradient(0, 0, 512, 512);
    sheen.addColorStop(0, 'rgba(237, 231, 217, 0.07)');
    sheen.addColorStop(0.5, 'rgba(237, 231, 217, 0.02)');
    sheen.addColorStop(1, 'rgba(123, 13, 30, 0.05)');
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, 512, 512);

    const step = 64;
    ctx.lineWidth = 1.25;
    for (let i = 0; i <= 512; i += step) {
      ctx.strokeStyle = `rgba(139, 157, 173, ${lineAlpha * 0.55})`;
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 512);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(512, i);
      ctx.stroke();
    }
    // Accents magenta tous les 4 pas — lisibilité combat, pas overload.
    ctx.strokeStyle = `rgba(123, 13, 30, ${lineAlpha * 0.35})`;
    ctx.lineWidth = 1.5;
    for (let i = 0; i <= 512; i += step * 4) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 512);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(512, i);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  tex.anisotropy = 2;
  tex.needsUpdate = true;
  return tex;
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
        color: detail === 'flat' ? 0x18314f : P.road.color,
        roughness: P.road.wetRoughness,
        metalness: P.road.wetMetalness,
        envMapIntensity: P.road.envMapIntensity,
      });
  applyGroundSurfaceMaps(road, lib.asphalt);

  const sidewalk = new THREE.MeshStandardMaterial({
    color: detail === 'flat' ? P.sidewalk.color : 0xede7d9,
    roughness: P.sidewalk.roughness,
    metalness: P.sidewalk.metalness,
  });
  applyGroundSurfaceMaps(sidewalk, lib.sidewalk);

  const curb = new THREE.MeshStandardMaterial({
    color: detail === 'flat' ? P.curb.color : 0xede7d9,
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
    color: detail === 'flat' ? P.esplanade.color : 0xede7d9,
    roughness: P.esplanade.roughness,
    metalness: P.esplanade.metalness,
    envMapIntensity: isFull ? 0.48 : 0.35,
  });
  applyGroundSurfaceMaps(esplanade, lib.esplanade);

  const quay =
    detail === 'full'
      ? new THREE.MeshPhysicalMaterial({
          color: 0xede7d9,
          roughness: P.quay.roughness,
          metalness: P.quay.metalness,
          envMapIntensity: P.quay.envMapIntensity,
          sheen: P.quay.sheen,
          sheenRoughness: 0.36,
          sheenColor: new THREE.Color(0xede7d9),
          clearcoat: 0.12,
          clearcoatRoughness: 0.24,
        })
      : new THREE.MeshStandardMaterial({
          color: detail === 'flat' ? P.quay.color : 0xede7d9,
          roughness: P.quay.roughness,
          metalness: P.quay.metalness,
          envMapIntensity: P.quay.envMapIntensity,
          emissive: new THREE.Color(0x0d0630),
          emissiveIntensity: detail === 'albedo' ? 0.05 : 0.02,
        });
  applyGroundSurfaceMaps(quay, lib.quay);

  const crosswalkStripe = new THREE.MeshStandardMaterial({
    color: 0xede7d9,
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
    spawnCircleGround: createSpawnCircleGroundMaterial(),
    contactShadow: new THREE.MeshBasicMaterial({
      color: 0x0d0630,
      transparent: true,
      opacity: GROUND_SURFACE_LEVELS.contactShadowOpacity,
      depthWrite: false,
    }),
    centerLine: new THREE.MeshBasicMaterial({
      color: 0xede7d9,
      transparent: true,
      opacity: 0.82,
    }),
    laneGlow: new THREE.MeshBasicMaterial({
      color: 0x8a95a5,
      transparent: true,
      opacity: 0.16,
    }),
    crosswalkStripe,
  };
}

export function disposeGroundMaterialSet(materials: GroundMaterialSet): void {
  const unique = new Set<THREE.Material>(Object.values(materials));
  const ownedMaps = new Set<THREE.Texture>();
  for (const mat of unique) {
    const mapped = mat as THREE.MeshLambertMaterial;
    if (mapped.userData?.['disposeMapWithMaterial'] && mapped.map) {
      ownedMaps.add(mapped.map);
    }
    mat.dispose();
  }
  for (const tex of ownedMaps) {
    tex.dispose();
  }
}

export function disposeGroundTextures(owner: GroundTextureOwnership): void {
  for (const tex of owner.textures) {
    tex.dispose();
  }
  owner.textures.length = 0;
}
