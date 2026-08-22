import * as THREE from 'three';

import type { HaussmannFacadeOptions } from '../building-facade.factory';
import { stableFacadeUnit } from '../building-facade.factory';
import type { PbrDetailLevel } from './material-library.config';
import { PBR_TEXTURE_DEFAULTS } from './material-library.config';
import {
  finalizeCanvasTexture,
  createPbrCanvas,
  normalMapFromHeightCanvas,
  pbrHashNoise,
  roughnessMapFromHeightCanvas,
  type TextureRegistry,
} from './pbr-texture.util';

export interface FacadePbrMaps {
  map: THREE.CanvasTexture;
  emissiveMap: THREE.CanvasTexture;
  normalMap?: THREE.CanvasTexture;
  roughnessMap?: THREE.CanvasTexture;
}

function drawFacadeCanvases(
  options: HaussmannFacadeOptions,
  detail: PbrDetailLevel
): {
  albedo: HTMLCanvasElement;
  emissive: HTMLCanvasElement;
  height: HTMLCanvasElement;
} | null {
  const size = detail === 'full' ? 512 : 384;
  const albedoSurface = createPbrCanvas(size);
  const emissiveSurface = createPbrCanvas(size);
  const heightSurface = createPbrCanvas(size);
  if (!albedoSurface || !emissiveSurface || !heightSurface) return null;

  const albedo = albedoSurface.canvas;
  const emissive = emissiveSurface.canvas;
  const height = heightSurface.canvas;
  const ctx = albedoSurface.ctx;
  const ectx = emissiveSurface.ctx;
  const hctx = heightSurface.ctx;

  ctx.fillStyle = `#${options.baseColor.toString(16).padStart(6, '0')}`;
  ctx.fillRect(0, 0, size, size);
  ectx.fillStyle = '#000000';
  ectx.fillRect(0, 0, size, size);
  hctx.fillStyle = '#888888';
  hctx.fillRect(0, 0, size, size);

  const courseStep = Math.round(size / 8);
  for (let y = 0; y < size; y += courseStep) {
    const band = y / courseStep;
    ctx.fillStyle = band % 2 === 0 ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.06)';
    ctx.fillRect(0, y, size, Math.max(4, Math.round(courseStep * 0.12)));
    hctx.fillStyle = band % 2 === 0 ? '#949494' : '#7a7a7a';
    hctx.fillRect(0, y, size, Math.max(4, Math.round(courseStep * 0.12)));
  }

  ctx.fillStyle = 'rgba(40, 34, 28, 0.22)';
  ctx.fillRect(0, size - Math.round(size * 0.1), size, Math.round(size * 0.1));
  hctx.fillStyle = '#707070';
  hctx.fillRect(0, size - Math.round(size * 0.1), size, Math.round(size * 0.1));

  const seed = options.seed ?? 17;
  const litRatio = options.windowLitRatio ?? 0.46;
  const cols = 5;
  const rows = 6;
  const cellW = Math.floor(size / cols);
  const cellH = Math.floor(size / rows);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const padX = Math.round(cellW * 0.18);
      const padY = Math.round(cellH * 0.16);
      const x = col * cellW + padX;
      const y = row * cellH + padY;
      const wW = cellW - padX * 2;
      const wH = cellH - padY * 2;
      const lit = stableFacadeUnit(seed * 97 + row * 13 + col * 19) < litRatio;

      ctx.fillStyle = options.accentColor;
      ctx.fillRect(x - 6, y - 6, wW + 12, wH + 12);
      ctx.fillStyle = lit ? '#fff4c4' : options.windowColor;
      ctx.fillRect(x, y, wW, wH);
      ctx.fillStyle = lit ? 'rgba(255, 236, 170, 0.55)' : 'rgba(0,0,0,0.2)';
      ctx.fillRect(x + 4, y + 4, wW - 8, Math.round(wH * 0.42));

      hctx.fillStyle = '#828282';
      hctx.fillRect(x - 6, y - 6, wW + 12, wH + 12);
      hctx.fillStyle = lit ? '#b0b0b0' : '#989898';
      hctx.fillRect(x, y, wW, wH);

      if (options.shutters !== false) {
        ctx.fillStyle = 'rgba(96, 72, 54, 0.58)';
        ctx.fillRect(x - 6, y + 4, 4, wH - 8);
        ctx.fillRect(x + wW + 2, y + 4, 4, wH - 8);
      }

      if (lit) {
        ectx.fillStyle = '#ffdd88';
        ectx.fillRect(x, y, wW, wH);
        ectx.fillStyle = '#fff8d0';
        ectx.fillRect(x + 4, y + 4, wW - 8, Math.round(wH * 0.42));
      }
    }
  }

  if (detail === 'full') {
    for (let i = 0; i < 600; i++) {
      const x = pbrHashNoise(i, 1, seed) * size;
      const y = pbrHashNoise(i, 2, seed) * size;
      const bump = pbrHashNoise(i, 3, seed);
      hctx.fillStyle = `rgb(${Math.round(120 + bump * 40)},${Math.round(118 + bump * 38)},${Math.round(112 + bump * 36)})`;
      hctx.fillRect(x, y, 1, 1);
    }
  }

  return { albedo, emissive, height };
}

export function createHaussmannFacadePbrMaps(
  options: HaussmannFacadeOptions,
  detail: PbrDetailLevel,
  registry?: TextureRegistry
): FacadePbrMaps {
  const canvases = drawFacadeCanvases(options, detail);
  if (!canvases) {
    const fallback = createPbrCanvas(4);
    const blank = fallback?.canvas ?? document.createElement('canvas');
    const map = finalizeCanvasTexture(blank, registry, { anisotropy: 4 });
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
    const emissiveMap = finalizeCanvasTexture(blank, registry, { anisotropy: 4 });
    emissiveMap.wrapS = THREE.RepeatWrapping;
    emissiveMap.wrapT = THREE.RepeatWrapping;
    return { map, emissiveMap };
  }

  const { albedo, emissive, height } = canvases;

  const map = finalizeCanvasTexture(albedo, registry, {
    anisotropy: PBR_TEXTURE_DEFAULTS.anisotropy,
  });
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;

  const emissiveMap = finalizeCanvasTexture(emissive, registry, {
    anisotropy: PBR_TEXTURE_DEFAULTS.anisotropy,
  });
  emissiveMap.wrapS = THREE.RepeatWrapping;
  emissiveMap.wrapT = THREE.RepeatWrapping;

  if (detail !== 'full') {
    return { map, emissiveMap };
  }

  return {
    map,
    emissiveMap,
    normalMap: normalMapFromHeightCanvas(height, registry, 2.1, {
      anisotropy: PBR_TEXTURE_DEFAULTS.anisotropy,
    }),
    roughnessMap: roughnessMapFromHeightCanvas(height, registry, 0.82, 0.55, {
      anisotropy: PBR_TEXTURE_DEFAULTS.anisotropy,
    }),
  };
}

export function createHaussmannRoofPbrMaps(
  detail: PbrDetailLevel,
  registry?: TextureRegistry
): GroundSurfacePbrMapsCompat {
  if (detail === 'flat') return {};

  const size = 256;
  const albedoSurface = createPbrCanvas(size);
  if (!albedoSurface) return {};
  const { canvas: albedo, ctx } = albedoSurface;
  ctx.fillStyle = '#5c636e';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= size; i += 24) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }

  const map = finalizeCanvasTexture(albedo, registry, {
    repeat: [...PBR_TEXTURE_DEFAULTS.roofRepeat],
    anisotropy: PBR_TEXTURE_DEFAULTS.anisotropy,
  });

  if (detail !== 'full') return { map };

  const heightSurface = createPbrCanvas(size);
  if (!heightSurface) return { map };
  const { canvas: height, ctx: hctx } = heightSurface;
  hctx.fillStyle = '#888888';
  hctx.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y += 24) {
    for (let x = 0; x < size; x += 24) {
      hctx.fillStyle = '#a8a8a8';
      hctx.fillRect(x + 2, y + 2, 20, 20);
    }
  }

  return {
    map,
    normalMap: normalMapFromHeightCanvas(height, registry, 1.8, {
      repeat: [...PBR_TEXTURE_DEFAULTS.roofRepeat],
    }),
    roughnessMap: roughnessMapFromHeightCanvas(height, registry, 0.9, 0.18, {
      repeat: [...PBR_TEXTURE_DEFAULTS.roofRepeat],
    }),
  };
}

export interface GroundSurfacePbrMapsCompat {
  map?: THREE.CanvasTexture;
  normalMap?: THREE.CanvasTexture;
  roughnessMap?: THREE.CanvasTexture;
}

export function applyFacadePbrMaps(
  material: THREE.MeshStandardMaterial,
  maps: FacadePbrMaps | GroundSurfacePbrMapsCompat
): void {
  if (maps.map) material.map = maps.map;
  if ('emissiveMap' in maps && maps.emissiveMap) {
    material.emissiveMap = maps.emissiveMap;
  }
  if (maps.normalMap) {
    material.normalMap = maps.normalMap;
    material.normalScale = new THREE.Vector2(0.65, 0.65);
  }
  if (maps.roughnessMap) {
    material.roughnessMap = maps.roughnessMap;
    material.roughness = 1;
  }
}

export function createPlinthPbrMaps(
  detail: PbrDetailLevel,
  registry?: TextureRegistry
): GroundSurfacePbrMapsCompat {
  if (detail === 'flat') return {};

  const size = 128;
  const albedoSurface = createPbrCanvas(size);
  if (!albedoSurface) return {};
  const { canvas: albedo, ctx } = albedoSurface;
  ctx.fillStyle = '#6a5c50';
  ctx.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y += 8) {
    ctx.fillStyle = y % 16 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
    ctx.fillRect(0, y, size, 4);
  }

  const map = finalizeCanvasTexture(albedo, registry, {
    repeat: [2, 2],
    anisotropy: 4,
  });

  if (detail !== 'full') return { map };

  const heightSurface = createPbrCanvas(size);
  if (!heightSurface) return { map };
  const { canvas: height, ctx: hctx } = heightSurface;
  hctx.fillStyle = '#707070';
  hctx.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y += 8) {
    hctx.fillStyle = y % 16 === 0 ? '#888888' : '#686868';
    hctx.fillRect(0, y, size, 4);
  }

  return {
    map,
    normalMap: normalMapFromHeightCanvas(height, registry, 1.6, { repeat: [2, 2] }),
    roughnessMap: roughnessMapFromHeightCanvas(height, registry, 0.9, 0.15, { repeat: [2, 2] }),
  };
}
