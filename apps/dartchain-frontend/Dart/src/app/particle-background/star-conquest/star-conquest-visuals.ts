import * as THREE from 'three';

/** Texture circulaire soft partagée (noyau / halo) — une seule allocation. */
export function createSoftDiscTexture(size = 64): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }
  const g = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2
  );
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.85)');
  g.addColorStop(0.65, 'rgba(255,255,255,0.25)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/** Taille visuelle liée au gain M4T3R (discret, plan interactif). */
export function sizeFromReward(reward: number, rarityBoost = 0): number {
  const base = 1.35 + Math.min(1.1, Math.log10(Math.max(reward, 1) + 1) * 0.55);
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
