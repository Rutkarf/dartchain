/**
 * Ancres Quest — toute particule décorative Star Conquest
 * (profondeur, motes, pulse, satellites réseau) se cale sur une Quest.
 */

export interface StarQuestAnchor {
  id: string;
  x: number;
  y: number;
  z: number;
  rgb: readonly [number, number, number];
  family?: string;
}

export function hash01(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

export function questIndexForId(id: string, count: number): number {
  if (count <= 0) return 0;
  return Math.floor(hash01(id) * count) % count;
}

/** Offset stable autour d’une Quest (échos de profondeur / satellites). */
export function questEchoOffset(
  questId: string,
  salt: string,
  radius: number
): { x: number; y: number; z: number } {
  const a = hash01(`${questId}:${salt}:a`) * Math.PI * 2;
  const b = hash01(`${questId}:${salt}:b`);
  const c = hash01(`${questId}:${salt}:c`);
  return {
    x: Math.cos(a) * radius * (0.45 + b * 0.7),
    y: Math.sin(a) * radius * (0.55 + c * 0.8),
    z: (b - 0.5) * radius * 0.65,
  };
}
