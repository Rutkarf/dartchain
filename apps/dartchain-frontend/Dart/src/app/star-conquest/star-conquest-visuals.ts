import * as THREE from 'three';

/** Texture circulaire soft partagée (noyau / halo) — une seule allocation. */
export function createSoftDiscTexture(size = 64): THREE.CanvasTexture {
  return createRadialDiscTexture(size, [
    [0, 'rgba(255,255,255,1)'],
    [0.35, 'rgba(255,255,255,0.85)'],
    [0.65, 'rgba(255,255,255,0.25)'],
    [1, 'rgba(255,255,255,0)'],
  ]);
}

/** Noyau d’étoile : verre obsidienne — cœur saturé + micro-spikes de diffraction. */
export function createStarCoreTexture(size = 64): THREE.CanvasTexture {
  const tex = createRadialDiscTexture(size, [
    [0, 'rgba(255,255,255,1)'],
    [0.05, 'rgba(255,255,255,1)'],
    [0.12, 'rgba(236,248,255,0.95)'],
    [0.26, 'rgba(180,220,255,0.38)'],
    [0.48, 'rgba(140,170,255,0.08)'],
    [1, 'rgba(255,255,255,0)'],
  ]);
  paintStarCross(tex, size, 0.42);
  return tex;
}

/** Bloom local (couronne additive serrée — pas de lait). */
export function createStarBloomTexture(size = 96): THREE.CanvasTexture {
  return createRadialDiscTexture(size, [
    [0, 'rgba(220,240,255,0.55)'],
    [0.12, 'rgba(180,210,255,0.28)'],
    [0.36, 'rgba(140,180,255,0.1)'],
    [0.68, 'rgba(255,255,255,0.03)'],
    [1, 'rgba(255,255,255,0)'],
  ]);
}

function createRadialDiscTexture(
  size: number,
  stops: ReadonlyArray<readonly [number, string]>
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return configureCanvasTexture(new THREE.CanvasTexture(canvas));
  }
  const g = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2
  );
  for (const [t, color] of stops) g.addColorStop(t, color);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return configureCanvasTexture(tex);
}

function configureCanvasTexture(tex: THREE.CanvasTexture): THREE.CanvasTexture {
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

function paintStarCross(tex: THREE.CanvasTexture, size: number, alpha: number): void {
  const canvas = tex.image as HTMLCanvasElement | undefined;
  const ctx = canvas?.getContext?.('2d');
  if (!ctx) return;
  const cx = size / 2;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
  ctx.lineWidth = Math.max(1, size * 0.022);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, size * 0.16);
  ctx.lineTo(cx, size * 0.84);
  ctx.moveTo(size * 0.16, cx);
  ctx.lineTo(size * 0.84, cx);
  ctx.stroke();
  ctx.strokeStyle = `rgba(210,230,255,${alpha * 0.38})`;
  ctx.lineWidth = Math.max(1, size * 0.012);
  ctx.beginPath();
  ctx.moveTo(size * 0.28, size * 0.28);
  ctx.lineTo(size * 0.72, size * 0.72);
  ctx.moveTo(size * 0.72, size * 0.28);
  ctx.lineTo(size * 0.28, size * 0.72);
  ctx.stroke();
  ctx.restore();
  tex.needsUpdate = true;
}

/** Taille visuelle liée au gain M4T3R (discret, plan interactif). */
export function sizeFromReward(reward: number, rarityBoost = 0): number {
  const base = 1.72 + Math.min(1.48, Math.log10(Math.max(reward, 1) + 1) * 0.72);
  return base + rarityBoost;
}

/** Texte gain sans puce (la puce neuronale est un élément HTML séparé). */
export function formatRewardShort(reward: number): string {
  if (reward >= 1000) return `+${Math.round(reward / 100) / 10}k`;
  return `+${reward}`;
}

/** Libellé accessible / scanner : « • +25 ». */
export function formatRewardWithDot(reward: number): string {
  return `• ${formatRewardShort(reward)}`;
}
