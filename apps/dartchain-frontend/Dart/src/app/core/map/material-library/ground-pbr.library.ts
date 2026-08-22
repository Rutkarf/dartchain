import * as THREE from 'three';

import type { PbrDetailLevel } from './material-library.config';
import { PBR_TEXTURE_DEFAULTS } from './material-library.config';
import {
  normalMapFromHeightCanvas,
  pbrHashNoise,
  registerTexture,
  roughnessMapFromHeightCanvas,
  type TextureRegistry,
  finalizeCanvasTexture,
  createPbrCanvas,
} from './pbr-texture.util';

export interface GroundSurfacePbrMaps {
  map?: THREE.CanvasTexture;
  normalMap?: THREE.CanvasTexture;
  roughnessMap?: THREE.CanvasTexture;
}

export interface GroundPbrLibrary {
  asphalt: GroundSurfacePbrMaps;
  sidewalk: GroundSurfacePbrMaps;
  quay: GroundSurfacePbrMaps;
  esplanade: GroundSurfacePbrMaps;
  curb: GroundSurfacePbrMaps;
}

function drawAsphaltHeight(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.fillStyle = '#808890';
  ctx.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = pbrHashNoise(x, y, 3);
      const v = 118 + Math.floor(n * 38);
      ctx.fillStyle = `rgb(${v},${v + 2},${v + 6})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  ctx.fillStyle = 'rgba(210, 225, 240, 0.14)';
  for (let y = 18; y < size; y += 38) {
    ctx.fillRect(0, y, size, 2);
  }
  ctx.fillStyle = 'rgba(20, 24, 30, 0.12)';
  for (let i = 0; i < 120; i++) {
    const x = pbrHashNoise(i, 1, 9) * size;
    const y = pbrHashNoise(i, 2, 11) * size;
    ctx.fillRect(x, y, 2 + pbrHashNoise(i, 3, 13) * 3, 1);
  }
}

function drawAsphaltAlbedo(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.fillStyle = '#3a3f48';
  ctx.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = pbrHashNoise(x, y, 3);
      if (n > 0.72) {
        ctx.fillStyle = `rgba(210, 220, 230, ${0.03 + n * 0.05})`;
        ctx.fillRect(x, y, 1, 1);
      } else if (n < 0.18) {
        ctx.fillStyle = `rgba(20, 22, 26, ${0.04 + n * 0.04})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
  ctx.fillStyle = 'rgba(80, 90, 100, 0.18)';
  for (let y = 24; y < size; y += 42) {
    ctx.fillRect(0, y, size, 2);
  }
}

function createAsphaltMaps(
  registry: TextureRegistry,
  detail: PbrDetailLevel
): GroundSurfacePbrMaps {
  if (detail === 'flat') return {};

  const size = detail === 'full' ? 256 : 192;
  const albedoSurface = createPbrCanvas(size);
  if (!albedoSurface) return {};

  drawAsphaltAlbedo(albedoSurface.ctx, size);

  const map = finalizeCanvasTexture(albedoSurface.canvas, registry, {
    repeat: [...PBR_TEXTURE_DEFAULTS.asphaltRepeat],
    anisotropy: PBR_TEXTURE_DEFAULTS.anisotropy,
  });

  if (detail !== 'full') return { map };

  const heightSurface = createPbrCanvas(size);
  if (!heightSurface) return { map };

  drawAsphaltHeight(heightSurface.ctx, size);

  return {
    map,
    normalMap: normalMapFromHeightCanvas(heightSurface.canvas, registry, 2.8, {
      repeat: [...PBR_TEXTURE_DEFAULTS.asphaltRepeat],
      anisotropy: PBR_TEXTURE_DEFAULTS.anisotropy,
    }),
    roughnessMap: roughnessMapFromHeightCanvas(heightSurface.canvas, registry, 0.28, 0.42, {
      repeat: [...PBR_TEXTURE_DEFAULTS.asphaltRepeat],
      anisotropy: PBR_TEXTURE_DEFAULTS.anisotropy,
    }),
  };
}

function createSidewalkMaps(
  registry: TextureRegistry,
  detail: PbrDetailLevel
): GroundSurfacePbrMaps {
  if (detail === 'flat') return {};

  const size = 128;
  const albedoSurface = createPbrCanvas(size);
  if (!albedoSurface) return {};
  const { canvas: albedo, ctx } = albedoSurface;
  ctx.fillStyle = '#bfb7ab';
  ctx.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y += 16) {
    for (let x = 0; x < size; x += 16) {
      const n = pbrHashNoise(x, y, 5);
      ctx.fillStyle = `rgba(${220 + n * 20},${214 + n * 18},${200 + n * 16},0.35)`;
      ctx.fillRect(x + 1, y + 1, 14, 14);
    }
  }
  ctx.strokeStyle = 'rgba(90, 82, 72, 0.28)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= size; i += 16) {
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
    repeat: [...PBR_TEXTURE_DEFAULTS.sidewalkRepeat],
    anisotropy: PBR_TEXTURE_DEFAULTS.anisotropy,
  });

  if (detail !== 'full') return { map };

  const heightSurface = createPbrCanvas(size);
  if (!heightSurface) return { map };
  const { canvas: height, ctx: hctx } = heightSurface;
  hctx.fillStyle = '#a0a0a0';
  hctx.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y += 16) {
    for (let x = 0; x < size; x += 16) {
      hctx.fillStyle = '#c8c8c8';
      hctx.fillRect(x + 2, y + 2, 12, 12);
    }
  }

  return {
    map,
    normalMap: normalMapFromHeightCanvas(height, registry, 3.2, {
      repeat: [...PBR_TEXTURE_DEFAULTS.sidewalkRepeat],
    }),
    roughnessMap: roughnessMapFromHeightCanvas(height, registry, 0.88, 0.22, {
      repeat: [...PBR_TEXTURE_DEFAULTS.sidewalkRepeat],
    }),
  };
}

function createQuayMaps(registry: TextureRegistry, detail: PbrDetailLevel): GroundSurfacePbrMaps {
  if (detail === 'flat') return {};

  const size = 128;
  const albedoSurface = createPbrCanvas(size);
  if (!albedoSurface) return {};
  const { canvas: albedo, ctx } = albedoSurface;
  ctx.fillStyle = '#a8b0bc';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(70, 78, 88, 0.32)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= size; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }
  for (let y = 0; y <= size; y += 16) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }
  for (let i = 0; i < 180; i++) {
    const x = pbrHashNoise(i, 4, 7) * size;
    const y = pbrHashNoise(i, 5, 8) * size;
    ctx.fillStyle = `rgba(255,255,255,${0.02 + pbrHashNoise(i, 6, 9) * 0.05})`;
    ctx.fillRect(x, y, 2, 1);
  }

  const map = finalizeCanvasTexture(albedo, registry, {
    repeat: [...PBR_TEXTURE_DEFAULTS.quayRepeat],
    anisotropy: PBR_TEXTURE_DEFAULTS.anisotropy,
  });

  if (detail !== 'full') return { map };

  const heightSurface = createPbrCanvas(size);
  if (!heightSurface) return { map };
  const { canvas: height, ctx: hctx } = heightSurface;
  hctx.fillStyle = '#909090';
  hctx.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y += 16) {
    for (let x = 0; x < size; x += 16) {
      hctx.fillStyle = '#b8b8b8';
      hctx.fillRect(x + 1, y + 1, 14, 14);
    }
  }

  return {
    map,
    normalMap: normalMapFromHeightCanvas(height, registry, 2.6, {
      repeat: [...PBR_TEXTURE_DEFAULTS.quayRepeat],
    }),
    roughnessMap: roughnessMapFromHeightCanvas(height, registry, 0.32, 0.38, {
      repeat: [...PBR_TEXTURE_DEFAULTS.quayRepeat],
    }),
  };
}

function createEsplanadeMaps(
  registry: TextureRegistry,
  detail: PbrDetailLevel
): GroundSurfacePbrMaps {
  if (detail === 'flat') return {};

  const size = 128;
  const albedoSurface = createPbrCanvas(size);
  if (!albedoSurface) return {};
  const { canvas: albedo, ctx } = albedoSurface;
  ctx.fillStyle = '#c8c0b4';
  ctx.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y += 32) {
    for (let x = 0; x < size; x += 32) {
      const n = pbrHashNoise(x, y, 12);
      ctx.fillStyle = `rgba(${210 + n * 18},${204 + n * 16},${192 + n * 14},0.45)`;
      ctx.fillRect(x + 2, y + 2, 28, 28);
    }
  }
  ctx.strokeStyle = 'rgba(100, 92, 82, 0.25)';
  for (let i = 0; i <= size; i += 32) {
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
    repeat: [...PBR_TEXTURE_DEFAULTS.esplanadeRepeat],
    anisotropy: PBR_TEXTURE_DEFAULTS.anisotropy,
  });

  if (detail !== 'full') return { map };

  const heightSurface = createPbrCanvas(size);
  if (!heightSurface) return { map };
  const { canvas: height, ctx: hctx } = heightSurface;
  hctx.fillStyle = '#989898';
  hctx.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y += 32) {
    for (let x = 0; x < size; x += 32) {
      hctx.fillStyle = '#c0c0c0';
      hctx.fillRect(x + 3, y + 3, 26, 26);
    }
  }

  return {
    map,
    normalMap: normalMapFromHeightCanvas(height, registry, 2.2, {
      repeat: [...PBR_TEXTURE_DEFAULTS.esplanadeRepeat],
    }),
    roughnessMap: roughnessMapFromHeightCanvas(height, registry, 0.76, 0.2, {
      repeat: [...PBR_TEXTURE_DEFAULTS.esplanadeRepeat],
    }),
  };
}

function createCurbMaps(registry: TextureRegistry, detail: PbrDetailLevel): GroundSurfacePbrMaps {
  if (detail === 'flat') return {};

  const size = 128;
  const albedoSurface = createPbrCanvas(size);
  if (!albedoSurface) return {};
  const { canvas: albedo, ctx } = albedoSurface;
  ctx.fillStyle = '#9aa3ad';
  ctx.fillRect(0, 0, size, size);
  for (let x = 0; x < size; x++) {
    const n = pbrHashNoise(x, 0, 21);
    ctx.fillStyle = `rgba(255,255,255,${0.02 + n * 0.04})`;
    ctx.fillRect(x, 0, 1, size);
  }

  const map = finalizeCanvasTexture(albedo, registry, {
    repeat: [...PBR_TEXTURE_DEFAULTS.curbRepeat],
    anisotropy: 4,
  });

  if (detail !== 'full') return { map };

  const heightSurface = createPbrCanvas(size);
  if (!heightSurface) return { map };
  const { canvas: height, ctx: hctx } = heightSurface;
  hctx.fillStyle = '#a8a8a8';
  hctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(pbrHashNoise(i, 1, 31) * size);
    hctx.fillStyle = '#c0c0c0';
    hctx.fillRect(x, 0, 2, size);
  }

  return {
    map,
    normalMap: normalMapFromHeightCanvas(height, registry, 2, {
      repeat: [...PBR_TEXTURE_DEFAULTS.curbRepeat],
    }),
    roughnessMap: roughnessMapFromHeightCanvas(height, registry, 0.52, 0.28, {
      repeat: [...PBR_TEXTURE_DEFAULTS.curbRepeat],
    }),
  };
}

export function createGroundPbrLibrary(
  registry: TextureRegistry,
  detail: PbrDetailLevel
): GroundPbrLibrary {
  return {
    asphalt: createAsphaltMaps(registry, detail),
    sidewalk: createSidewalkMaps(registry, detail),
    quay: createQuayMaps(registry, detail),
    esplanade: createEsplanadeMaps(registry, detail),
    curb: createCurbMaps(registry, detail),
  };
}

export function applyGroundSurfaceMaps(
  material: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial,
  maps: GroundSurfacePbrMaps
): void {
  if (maps.map) material.map = maps.map;
  if (maps.normalMap) {
    material.normalMap = maps.normalMap;
    material.normalScale = new THREE.Vector2(0.85, 0.85);
  }
  if (maps.roughnessMap) {
    material.roughnessMap = maps.roughnessMap;
    material.roughness = 1;
  }
}
