/** Palette UI — Gris informatique · Porcelain · Baltic Blue · Violet ultra-sombre · Black */
export const BRAND = {
  infoGrey: { hex: '#8B9DAD', rgb: '139, 157, 173' },
  porcelain: { hex: '#FDFFFC', rgb: '253, 255, 252' },
  balticBlue: { hex: '#235789', rgb: '35, 87, 137' },
  ultraPurple: { hex: '#120A1E', rgb: '18, 10, 30' },
  black: { hex: '#020100', rgb: '2, 1, 0' },
} as const;

/** Accents UI — graphiques, logo navbar, sparklines */
export const ELECTRIC_PALETTE_STOPS = [
  { hex: BRAND.balticBlue.hex, rgb: BRAND.balticBlue.rgb },
  { hex: BRAND.infoGrey.hex, rgb: BRAND.infoGrey.rgb },
  { hex: BRAND.ultraPurple.hex, rgb: BRAND.ultraPurple.rgb },
  { hex: '#4A87AD', rgb: '74, 135, 173' },
] as const;

/** Palette site — profondeur noir → bleu → porcelaine */
export const BG_PALETTE_STOPS = [
  { hex: BRAND.black.hex, rgb: BRAND.black.rgb },
  { hex: '#0A1018', rgb: '10, 16, 24' },
  { hex: '#121F2E', rgb: '18, 31, 46' },
  { hex: '#1A3048', rgb: '26, 48, 72' },
  { hex: BRAND.balticBlue.hex, rgb: BRAND.balticBlue.rgb },
  { hex: '#3D6F9E', rgb: '61, 111, 158' },
  { hex: '#6A95B8', rgb: '106, 149, 184' },
  { hex: '#A8C4D8', rgb: '168, 196, 216' },
  { hex: BRAND.porcelain.hex, rgb: BRAND.porcelain.rgb },
] as const;

/** Palette boutons */
export const BTN_PALETTE_STOPS = [
  { hex: '#020100', rgb: '2, 1, 0' },
  { hex: '#0D1824', rgb: '13, 24, 36' },
  { hex: '#152535', rgb: '21, 37, 53' },
  { hex: '#1C3550', rgb: '28, 53, 80' },
  { hex: BRAND.balticBlue.hex, rgb: BRAND.balticBlue.rgb },
  { hex: '#2D6A94', rgb: '45, 106, 148' },
  { hex: '#4A87AD', rgb: '74, 135, 173' },
  { hex: '#6BA3C4', rgb: '107, 163, 196' },
  { hex: '#8FC0DC', rgb: '143, 192, 220' },
] as const;

/** @deprecated Utiliser BG_PALETTE_STOPS */
export const PALETTE_STOPS = BG_PALETTE_STOPS;

/** Clic logo — bleu · gris · or */
export const LOGO_ELECTRIC_CLICK_INDICES = [0, 1, 2] as const;

/**
 * Couleurs Three.js sol + particules — inchangées (retrowave legacy).
 * Ne pas dériver de BRAND / ELECTRIC_PALETTE_STOPS.
 */
const THREE_LEGACY = {
  sceneBg: '#0A0612',
  floorLight: '#00F5FF',
  floorGlow: '#FF2D9A',
} as const;

export interface CardPaletteColors {
  lineStart: string;
  lineEnd: string;
  fillStart: string;
  fillEnd: string;
  accentRgb: string;
}

const CHART_ACCENT_INDICES = [0, 1, 2] as const;

export function paletteForCardIndex(index: number): CardPaletteColors {
  const slot = index % CHART_ACCENT_INDICES.length;
  const i = CHART_ACCENT_INDICES[slot];
  const next = CHART_ACCENT_INDICES[(slot + 1) % CHART_ACCENT_INDICES.length];
  const current = ELECTRIC_PALETTE_STOPS[i];
  const following = ELECTRIC_PALETTE_STOPS[next];

  return {
    lineStart: current.hex,
    lineEnd: following.hex,
    fillStart: `rgba(${current.rgb}, 0.18)`,
    fillEnd: `rgba(${following.rgb}, 0.02)`,
    accentRgb: ELECTRIC_PALETTE_STOPS[0].rgb,
  };
}

export function hexToThree(hex: string): number {
  return Number.parseInt(hex.replace('#', ''), 16);
}

export interface ThreeMaterialPalette {
  color: number;
  emissive: number;
  rim: number;
  core: number;
}

export function threePaletteVariant(index: number): ThreeMaterialPalette {
  const i = index % BG_PALETTE_STOPS.length;
  const rim = BG_PALETTE_STOPS[(i + 2) % BG_PALETTE_STOPS.length];
  const core = BG_PALETTE_STOPS[(i + 4) % BG_PALETTE_STOPS.length];
  const base = BG_PALETTE_STOPS[i];
  const emissive = ELECTRIC_PALETTE_STOPS[i % ELECTRIC_PALETTE_STOPS.length];

  return {
    color: hexToThree(lightenHex(base.hex, 0.48)),
    emissive: hexToThree(emissive.hex),
    rim: hexToThree(rim.hex),
    core: hexToThree(core.hex),
  };
}

export function threeElectricLogoPalette(clickIndex: number): ThreeMaterialPalette {
  const i =
    LOGO_ELECTRIC_CLICK_INDICES[
      clickIndex % LOGO_ELECTRIC_CLICK_INDICES.length
    ];
  const hot = ELECTRIC_PALETTE_STOPS[i];
  const rim = ELECTRIC_PALETTE_STOPS[1];
  const core = ELECTRIC_PALETTE_STOPS[0];

  return {
    color: hexToThree(lightenHex(hot.hex, 0.45)),
    emissive: hexToThree(hot.hex),
    rim: hexToThree(rim.hex),
    core: hexToThree(core.hex),
  };
}

export const THREE_GLASS_MATERIAL = {
  emissiveIntensity: 0.38,
  metalness: 0.35,
  roughness: 0.28,
  clearcoat: 0.62,
  clearcoatRoughness: 0.18,
  transmission: 0.32,
  thickness: 1,
  transparent: true,
  opacity: 0.58,
  ior: 1.38,
} as const;

export const THREE_LOGO_GLASS = {
  ...THREE_GLASS_MATERIAL,
  emissiveIntensity: 0.62,
  metalness: 0.22,
  roughness: 0.22,
  transmission: 0.36,
  opacity: 1,
  transparent: true,
  clearcoat: 0.68,
} as const;

export interface ThreeNavbarPalette {
  base: number;
  emissive: number;
  rim: number;
  core: number;
  pulse: number;
}

export function threeNavbarPalette(index: number): ThreeNavbarPalette {
  const i = index % BTN_PALETTE_STOPS.length;
  const base = BTN_PALETTE_STOPS[i];
  const emissive = ELECTRIC_PALETTE_STOPS[i % ELECTRIC_PALETTE_STOPS.length];
  const rim = ELECTRIC_PALETTE_STOPS[(i + 1) % ELECTRIC_PALETTE_STOPS.length];
  const core = BTN_PALETTE_STOPS[(i + 2) % BTN_PALETTE_STOPS.length];
  const pulse = ELECTRIC_PALETTE_STOPS[(i + 3) % ELECTRIC_PALETTE_STOPS.length];

  return {
    base: hexToThree(base.hex),
    emissive: hexToThree(emissive.hex),
    rim: hexToThree(rim.hex),
    core: hexToThree(core.hex),
    pulse: hexToThree(pulse.hex),
  };
}

function parseHex(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex(r: number, g: number, b: number): string {
  const c = (clamp(r) << 16) | (clamp(g) << 8) | clamp(b);
  return `#${c.toString(16).padStart(6, '0')}`;
}

function clamp(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function lightenHex(hex: string, amount: number): string {
  const [r, g, b] = parseHex(hex);
  return toHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
}

/** Fond CSS / scène — gris bleuté calme (aligné shell organique) */
export const THEME_BG_BASE = '#718291';

/** Scène particules — même fond gris bleuté */
export const THREE_SCENE_BG = hexToThree(THEME_BG_BASE);
export const THREE_AMBIENT_DARK = hexToThree('#61717f');
export const THREE_SCENE_CLEAR_LIGHT = hexToThree(THEME_BG_BASE);
export const THREE_RIM_DEFAULT = hexToThree(THREE_LEGACY.floorLight);
export const THREE_CORE_DEFAULT = hexToThree(THREE_LEGACY.floorGlow);

/** Particules — blanc pur */
export const THREE_PARTICLE_WHITE = 0xffffff;
export const THREE_PARTICLE_STAR = THREE_PARTICLE_WHITE;

/** Sol Three.js — néons legacy (inchangé) */
export const THREE_FLOOR_GLOW = hexToThree(THREE_LEGACY.floorGlow);
export const THREE_FLOOR_LIGHT = hexToThree(THREE_LEGACY.floorLight);
