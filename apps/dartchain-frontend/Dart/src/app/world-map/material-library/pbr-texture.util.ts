import * as THREE from 'three';

export interface TextureRegistry {
  textures: THREE.Texture[];
}

export function registerTexture(registry: TextureRegistry, texture: THREE.Texture): THREE.Texture {
  registry.textures.push(texture);
  return texture;
}

export function canvas2dAvailable(): boolean {
  if (typeof document === 'undefined') return false;
  const probe = document.createElement('canvas');
  return !!probe.getContext('2d');
}

export function createPbrCanvas(
  size: number
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  return { canvas, ctx };
}

export interface TiledTextureOptions {
  repeat?: [number, number];
  anisotropy?: number;
  colorSpace?: THREE.ColorSpace;
  wrap?: THREE.Wrapping;
}

export function finalizeCanvasTexture(
  canvas: HTMLCanvasElement,
  registry: TextureRegistry | undefined,
  options: TiledTextureOptions = {}
): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = options.colorSpace ?? THREE.SRGBColorSpace;
  texture.wrapS = options.wrap ?? THREE.RepeatWrapping;
  texture.wrapT = options.wrap ?? THREE.RepeatWrapping;
  if (options.repeat) {
    texture.repeat.set(options.repeat[0], options.repeat[1]);
  }
  texture.anisotropy = options.anisotropy ?? 4;
  texture.needsUpdate = true;
  if (registry) registerTexture(registry, texture);
  return texture;
}

/** Normal map tangent-space depuis une heightmap grayscale (canvas). */
export function normalMapFromHeightCanvas(
  heightCanvas: HTMLCanvasElement,
  registry: TextureRegistry | undefined,
  strength = 2.4,
  options: Omit<TiledTextureOptions, 'colorSpace'> = {}
): THREE.CanvasTexture {
  const w = heightCanvas.width;
  const h = heightCanvas.height;
  const srcCtx = heightCanvas.getContext('2d');
  const outSurface = createPbrCanvas(w);
  if (!srcCtx || !outSurface) {
    const fallback = createPbrCanvas(4);
    return finalizeCanvasTexture(fallback?.canvas ?? heightCanvas, registry, {
      ...options,
      colorSpace: THREE.LinearSRGBColorSpace,
    });
  }
  const src = srcCtx.getImageData(0, 0, w, h);
  const { canvas: out, ctx } = outSurface;
  const image = ctx.createImageData(w, h);

  const sample = (x: number, y: number): number => {
    const cx = Math.max(0, Math.min(w - 1, x));
    const cy = Math.max(0, Math.min(h - 1, y));
    return src.data[(cy * w + cx) * 4] / 255;
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const hL = sample(x - 1, y);
      const hR = sample(x + 1, y);
      const hD = sample(x, y - 1);
      const hU = sample(x, y + 1);
      let nx = (hL - hR) * strength;
      let ny = (hD - hU) * strength;
      let nz = 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len;
      ny /= len;
      nz /= len;
      const i = (y * w + x) * 4;
      image.data[i] = Math.round((nx * 0.5 + 0.5) * 255);
      image.data[i + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      image.data[i + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      image.data[i + 3] = 255;
    }
  }

  ctx.putImageData(image, 0, 0);
  return finalizeCanvasTexture(out, registry, {
    ...options,
    colorSpace: THREE.LinearSRGBColorSpace,
  });
}

export function roughnessMapFromHeightCanvas(
  heightCanvas: HTMLCanvasElement,
  registry: TextureRegistry | undefined,
  baseRoughness = 0.55,
  contrast = 0.35,
  options: Omit<TiledTextureOptions, 'colorSpace'> = {}
): THREE.CanvasTexture {
  const w = heightCanvas.width;
  const h = heightCanvas.height;
  const srcCtx = heightCanvas.getContext('2d');
  const outSurface = createPbrCanvas(w);
  if (!srcCtx || !outSurface) {
    const fallback = createPbrCanvas(4);
    return finalizeCanvasTexture(fallback?.canvas ?? heightCanvas, registry, {
      ...options,
      colorSpace: THREE.LinearSRGBColorSpace,
    });
  }
  const src = srcCtx.getImageData(0, 0, w, h);
  const { canvas: out, ctx } = outSurface;
  const image = ctx.createImageData(w, h);

  for (let i = 0; i < src.data.length; i += 4) {
    const height = src.data[i] / 255;
    const rough = THREE.MathUtils.clamp(baseRoughness + (0.5 - height) * contrast, 0.08, 0.98);
    const v = Math.round(rough * 255);
    image.data[i] = v;
    image.data[i + 1] = v;
    image.data[i + 2] = v;
    image.data[i + 3] = 255;
  }

  ctx.putImageData(image, 0, 0);
  return finalizeCanvasTexture(out, registry, {
    ...options,
    colorSpace: THREE.LinearSRGBColorSpace,
  });
}

/** Bruit déterministe pour textures procédurales (pas de Math.random). */
export function pbrHashNoise(x: number, y: number, seed = 1): number {
  const v = Math.sin(x * 12.9898 + y * 78.233 + seed * 43.758) * 43_758.5453;
  return v - Math.floor(v);
}
