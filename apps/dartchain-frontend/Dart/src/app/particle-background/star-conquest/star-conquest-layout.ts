import * as THREE from 'three';
import {
  constellationForFamily,
  constellationPointToBandUv,
  STAR_CONSTELLATIONS,
  STAR_MAX_OFFSCREEN_AT_INIT,
  STAR_WORLD_OVERFLOW_RATIO,
} from './star-conquest-constellations';
import { STAR_DEPTH_LAYERS, type StarDepthLayerId } from './star-conquest-depth';
import type { StarQuest } from './star-conquest.model';
import type { StarQuestFamily } from './star-conquest-families';

export interface StarConquestBand {
  /** Limite haute = sous le bas réel de Swap (+ marge). */
  topPx: number;
  /** Limite basse ≈ sommet du floor peek (horizon). */
  bottomPx: number;
  widthPx: number;
  heightPx: number;
  viewportW: number;
  viewportH: number;
  /** Bas réel de Swap (sans marge), pour debug / clamp. */
  swapBottomPx: number;
  /** Sommet réel du floor (px écran). */
  floorTopPx: number;
  /** Débordement latéral monde (px) — hors viewport, sans scroll HTML. */
  overflowXPx: number;
  /** Bords monde (écran étendu). */
  worldLeftPx: number;
  worldRightPx: number;
}

const SAFE_MARGIN_BELOW_SWAP_PX = 10;
const MIN_LABEL_DIST_PX = 20;
/** Au plus 1 particule sous le bas du viewport à l’init. */
const MAX_BOTTOM_OFFSCREEN = 1;

/** Sommet du floor : mesure DOM du wrapper peek, sinon token. */
export function measureFloorTopPx(floorPeekPx = 220, viewportH = window.innerHeight): number {
  const floor =
    document.querySelector('app-three-floor .floor-wrapper') ??
    document.querySelector('app-three-floor');
  if (floor) {
    const r = floor.getBoundingClientRect();
    if (r.height > 4) return r.top;
  }
  return Math.max(0, viewportH - Math.max(28, floorPeekPx));
}

const ANGULAR_STACK_SELECTORS = [
  'app-navbar',
  'app-swap',
  'app-showcase-tab-showcase',
  'app-dock-tabs-dock-tabs',
  'app-graph',
] as const;

/** Bas réel de la pile Angular (dernier composant visible). */
export function measureAngularStackBottomPx(): number {
  let bottom = 0;
  for (const sel of ANGULAR_STACK_SELECTORS) {
    const el = document.querySelector(sel);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (r.height > 2 && r.width > 2) bottom = Math.max(bottom, r.bottom);
  }
  return bottom;
}

/**
 * Zone libre entre le bas des composants et l’horizon du floor
 * (emplacement croix rouge / particules basses).
 */
export function measureGapAboveFloor(floorPeekPx = 220): {
  left: number;
  right: number;
  top: number;
  bottom: number;
  midY: number;
  centerX: number;
  height: number;
  viewportW: number;
  viewportH: number;
} {
  const viewportW = Math.max(window.innerWidth, 32);
  const viewportH = Math.max(window.innerHeight, 32);
  const stackBottom = measureAngularStackBottomPx();
  const floorTop = measureFloorTopPx(floorPeekPx, viewportH);
  const top = Math.min(stackBottom + 4, floorTop - 8);
  const bottom = Math.max(top + 12, floorTop - 4);
  const height = Math.max(8, bottom - top);
  return {
    left: 8,
    right: viewportW - 8,
    top,
    bottom,
    midY: top + height * 0.5,
    centerX: viewportW * 0.5,
    height,
    viewportW,
    viewportH,
  };
}

/**
 * Zone jouable : sous Navbar+Swap → horizon du floor.
 * Monde horizontal plus large que le viewport (fenêtre sur la galaxie).
 */
export function measurePlayableBand(floorPeekPx = 220): StarConquestBand {
  const viewportW = Math.max(window.innerWidth, 32);
  const viewportH = Math.max(window.innerHeight, 32);

  const swap = document.querySelector('app-swap');
  const navbar = document.querySelector('app-navbar');
  let swapBottom = viewportH * 0.22;
  if (swap) {
    const r = swap.getBoundingClientRect();
    if (r.height > 0) swapBottom = r.bottom;
  } else if (navbar) {
    const r = navbar.getBoundingClientRect();
    if (r.height > 0) swapBottom = r.bottom;
  }

  const floorTopPx = measureFloorTopPx(floorPeekPx, viewportH);
  const topPx = Math.min(
    viewportH - 120,
    Math.max(swapBottom + SAFE_MARGIN_BELOW_SWAP_PX, 8)
  );
  // Bas viewport : particules visibles sous le floor (z-order), quasiment au ras
  const bottomPx = Math.max(topPx + 96, viewportH - 4);

  // Débord léger uniquement — cible affichage 250×550 (presque tout visible)
  const overflowXPx = Math.round(
    Math.max(6, viewportW * STAR_WORLD_OVERFLOW_RATIO)
  );

  return {
    topPx,
    bottomPx,
    widthPx: viewportW,
    heightPx: Math.max(96, bottomPx - topPx),
    viewportW,
    viewportH,
    swapBottomPx: swapBottom,
    floorTopPx,
    overflowXPx,
    worldLeftPx: -overflowXPx,
    worldRightPx: viewportW + overflowXPx,
  };
}

/** @deprecated → measurePlayableBand */
export function measureBackgroundBand(floorPeekPx = 220): StarConquestBand {
  return measurePlayableBand(floorPeekPx);
}

/** @deprecated */
export function measureInteractiveBand(
  _graphEl: Element | null,
  floorPeekPx = 220,
  _gapBelowGraphPx = 8
): StarConquestBand {
  return measurePlayableBand(floorPeekPx);
}

export function screenToWorldOnPlane(
  clientX: number,
  clientY: number,
  camera: THREE.PerspectiveCamera,
  planeZ = 0,
  out = new THREE.Vector3()
): THREE.Vector3 {
  const ndcX = (clientX / Math.max(window.innerWidth, 1)) * 2 - 1;
  const ndcY = -(clientY / Math.max(window.innerHeight, 1)) * 2 + 1;
  const vector = new THREE.Vector3(ndcX, ndcY, 0.5).unproject(camera);
  const dir = vector.sub(camera.position).normalize();
  const distance = (planeZ - camera.position.z) / dir.z;
  return out.copy(camera.position).add(dir.multiplyScalar(distance));
}

function hash01(id: string, salt = 0): number {
  let h = (salt * 374761393) >>> 0;
  for (let i = 0; i < id.length; i++) {
    h = Math.imul(h ^ id.charCodeAt(i), 2654435761) >>> 0;
  }
  return (h >>> 0) / 4294967296;
}

function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v));
}

/**
 * Placement monde étendu : silhouettes zodiacales + gains + jitter.
 * Les UV peuvent sortir du viewport (débordement latéral Three.js).
 */
export function layoutQuestsInBand(
  quests: readonly StarQuest[],
  band: StarConquestBand,
  camera: THREE.PerspectiveCamera,
  planeZ = 0
): void {
  const left = band.worldLeftPx ?? -Math.round(band.viewportW * STAR_WORLD_OVERFLOW_RATIO);
  const right =
    band.worldRightPx ??
    band.viewportW + Math.round(band.viewportW * STAR_WORLD_OVERFLOW_RATIO);
  const top = band.topPx + 4;
  // Quests peuvent descendre sous l’horizon floor (visibles derrière le peek)
  const bottom = Math.max(top + 40, band.viewportH - 8);
  const w = Math.max(40, right - left);
  const h = Math.max(40, bottom - top);

  const rewards = quests.map((q) => q.rewardM4T3R);
  const rMin = Math.min(...rewards);
  const rMax = Math.max(...rewards);
  const rSpan = Math.max(1, rMax - rMin);

  const byFamily = new Map<StarQuestFamily, StarQuest[]>();
  for (const q of quests) {
    const list = byFamily.get(q.family) ?? [];
    list.push(q);
    byFamily.set(q.family, list);
  }
  for (const list of byFamily.values()) {
    list.sort((a, b) => b.rewardM4T3R - a.rewardM4T3R);
  }

  const pts: { x: number; y: number; z: number; id: string }[] = [];

  quests.forEach((quest) => {
    const familyList = byFamily.get(quest.family) ?? [quest];
    const slotIdx = Math.max(0, familyList.findIndex((q) => q.id === quest.id));
    const c = constellationForFamily(quest.family);
    const silhouette = constellationPointToBandUv(c, slotIdx);

    const rewardT = (quest.rewardM4T3R - rMin) / rSpan;
    const vReward = 1 - rewardT;
    const v =
      silhouette.v * 0.58 +
      vReward * 0.28 +
      (hash01(quest.id, 2) - 0.5) * 0.14;
    const u =
      silhouette.u * 0.88 +
      (hash01(quest.id, 3) - 0.5) * 0.1 +
      (hash01(quest.id, 7) - 0.5) * 0.06;

    let sx = left + clamp(u, 0.02, 0.98) * w;
    let sy = top + clamp(v, 0.04, 0.96) * h;
    sx = clamp(sx, left, right);
    sy = clamp(sy, top, bottom);

    const depth = quest.slot.depth ?? hash01(quest.id, 5) * 2 - 1;
    quest.slot.depth = depth;
    const layer = STAR_DEPTH_LAYERS.interactive;
    const z =
      planeZ +
      layer.zCenter +
      depth * layer.zSpread +
      (hash01(quest.id, 6) - 0.5) * 6;
    pts.push({ x: sx, y: sy, z, id: quest.id });
  });

  const minDist = Math.min(
    MIN_LABEL_DIST_PX,
    Math.sqrt((w * h) / Math.max(quests.length, 1)) * 0.85
  );
  for (let iter = 0; iter < 28; iter++) {
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[j].x - pts[i].x;
        const dy = pts[j].y - pts[i].y;
        const d2 = dx * dx + dy * dy;
        const min2 = minDist * minDist;
        if (d2 >= min2 || d2 < 1e-4) continue;
        const d = Math.sqrt(d2);
        const push = ((minDist - d) / d) * 0.28;
        const ox = dx * push * 0.62;
        const oy = dy * push * 0.28;
        pts[i].x -= ox;
        pts[i].y -= oy;
        pts[j].x += ox;
        pts[j].y += oy;
      }
    }
    for (const p of pts) {
      p.x = clamp(p.x, left, right);
      p.y = clamp(p.y, top, bottom);
    }
  }

  const byId = new Map(pts.map((p) => [p.id, p]));
  for (const quest of quests) {
    const p = byId.get(quest.id)!;
    const rewardT = (quest.rewardM4T3R - rMin) / rSpan;
    const targetY = top + clamp(1 - rewardT, 0.04, 0.96) * h;
    p.y = p.y * 0.82 + targetY * 0.18;
    p.y = clamp(p.y, top, bottom);
  }

  // Racines interactives sous le floor — structure part de bas / axe vertical
  pinUnderFloorRoots(quests, byId, band, left, top, w, h);
  // Racines sous app-graph (replié) — toujours ancrées dans le rect Graph
  pinUnderGraphRoots(quests, byId, band);

  // Au plus 5 hors viewport (latéral/haut) ; bas d’écran : max 1
  const pinnedIds = new Set(
    quests.filter((q) => q.underFloor || q.underGraph).map((q) => q.id)
  );
  enforceMaxOffscreen(byId, band, STAR_MAX_OFFSCREEN_AT_INIT, pinnedIds);
  enforceMaxBottomOffscreen(byId, band, MAX_BOTTOM_OFFSCREEN);

  for (const quest of quests) {
    const p = byId.get(quest.id)!;
    quest.slot.u = (p.x - left) / w;
    quest.slot.v = (p.y - top) / h;
    const world = screenToWorldOnPlane(p.x, p.y, camera, p.z);
    quest.position.x = world.x;
    quest.position.y = world.y;
    quest.position.z = world.z;
  }
}

/**
 * Ramène l’excédent de points hors fenêtre pour laisser au plus `maxOff` dehors.
 */
function enforceMaxOffscreen(
  byId: Map<string, { x: number; y: number; z: number; id: string }>,
  band: StarConquestBand,
  maxOff: number,
  protectedIds: ReadonlySet<string> = new Set()
): void {
  const vw = band.viewportW;
  const vh = band.viewportH;
  const top = Math.max(0, band.topPx);
  const margin = 6;
  const inView = (p: { x: number; y: number }) =>
    p.x >= margin &&
    p.x <= vw - margin &&
    p.y >= top + margin &&
    p.y <= vh - margin;

  const pts = [...byId.values()];
  const off = pts
    .filter((p) => !inView(p) && !protectedIds.has(p.id))
    .map((p) => {
      const dx = p.x < margin ? margin - p.x : p.x > vw - margin ? p.x - (vw - margin) : 0;
      const dy =
        p.y < top + margin
          ? top + margin - p.y
          : p.y > vh - margin
            ? p.y - (vh - margin)
            : 0;
      return { p, dist: Math.hypot(dx, dy) };
    })
    .sort((a, b) => b.dist - a.dist);

  const excess = Math.max(0, off.length - maxOff);
  for (let i = 0; i < excess; i++) {
    const p = off[i]!.p;
    p.x = clamp(p.x, margin, vw - margin);
    p.y = clamp(p.y, top + margin, vh - margin);
  }
}

/**
 * Au plus `maxBottom` particules sous le bas du viewport à l’init.
 * Les autres sont remontées juste au-dessus du bord (atteignables au stick).
 */
function enforceMaxBottomOffscreen(
  byId: Map<string, { x: number; y: number; z: number; id: string }>,
  band: StarConquestBand,
  maxBottom: number
): void {
  const vh = band.viewportH;
  const limit = vh - 8;
  const below = [...byId.values()]
    .filter((p) => p.y > limit)
    .sort((a, b) => b.y - a.y);
  const excess = Math.max(0, below.length - maxBottom);
  for (let i = 0; i < excess; i++) {
    below[i]!.y = limit - 2 - i * 3;
  }
  // La (éventuelle) unique hors-bas reste proche : max +28px sous le bord
  if (below.length > excess) {
    const keep = below[excess]!;
    keep.y = Math.min(keep.y, vh + 28);
  }
}

const UNDER_FLOOR_X_OFFSETS = [-28, 0, 28] as const;
/** Dans le peek floor, proche de l’horizon — visibles / atteignables (pas hors bas d’écran). */
const UNDER_FLOOR_V_IN_PEEK = [0.12, 0.28, 0.44] as const;
const UNDER_GRAPH_X_T = [0.22, 0.5, 0.78] as const;
const UNDER_GRAPH_Y_T = [0.35, 0.55, 0.72] as const;

/** Rectangle écran de app-graph (replié ou déplié). */
export function measureGraphRect(): {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
} | null {
  const el = document.querySelector('app-graph');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width < 8 || r.height < 6) return null;
  return {
    left: r.left,
    top: r.top,
    right: r.right,
    bottom: r.bottom,
    width: r.width,
    height: r.height,
  };
}

/**
 * Place exactement 3 quests interactives sous le floor (peek Three.js).
 * Indépendant de l’état replié/déplié des composants Angular.
 */
function pinUnderFloorRoots(
  quests: readonly StarQuest[],
  byId: Map<string, { x: number; y: number; z: number; id: string }>,
  band: StarConquestBand,
  left: number,
  top: number,
  w: number,
  h: number
): void {
  const roots = quests.filter((q) => q.underFloor).slice(0, 3);
  if (roots.length < 1) return;

  const floorTop = band.floorTopPx;
  // Peek utile = zone floor encore dans le viewport (pas sous le bas d’écran)
  const peekBottom = Math.min(band.viewportH - 10, Math.max(floorTop + 20, floorTop + 36));
  const peekH = Math.max(14, peekBottom - floorTop);
  const centerX = band.viewportW * 0.5;
  const pinned = new Set(roots.map((r) => r.id));

  roots.forEach((quest, i) => {
    const p = byId.get(quest.id);
    if (!p) return;
    const ox = UNDER_FLOOR_X_OFFSETS[i] ?? (i - 1) * 28;
    const vv = UNDER_FLOOR_V_IN_PEEK[i] ?? 0.28;
    p.x = centerX + ox;
    p.y = floorTop + vv * peekH;
    p.z = 4 + i * 2;
  });

  for (const root of roots) {
    const rp = byId.get(root.id);
    if (!rp) continue;
    for (const cid of root.connections) {
      if (pinned.has(cid)) continue;
      const q = quests.find((x) => x.id === cid);
      if (q?.underGraph) continue;
      const p = byId.get(cid);
      if (!p) continue;
      const horizon = floorTop - 14;
      p.y = p.y * 0.52 + horizon * 0.48;
      p.x = p.x * 0.78 + rp.x * 0.22;
      p.x = clamp(p.x, left, left + w);
      p.y = clamp(p.y, top, Math.min(peekBottom, band.viewportH - 10));
    }
  }

  // Nuage dans la bande jouable — jamais sous le bas d’écran
  const maxY = band.viewportH - 10;
  for (const p of byId.values()) {
    if (pinned.has(p.id)) continue;
    const q = quests.find((x) => x.id === p.id);
    if (q?.underGraph) continue;
    const v = (p.y - top) / Math.max(1, h);
    const lifted = 0.18 + v * 0.72;
    p.y = top + clamp(lifted, 0.06, 0.92) * h;
    p.y = clamp(p.y, top, Math.min(band.bottomPx, maxY));
  }
}

/**
 * Place exactement 3 quests sous le rect app-graph (cible : shell replié).
 * Si Graph absent, fallback juste au-dessus du floor dans la bande centrale.
 */
function pinUnderGraphRoots(
  quests: readonly StarQuest[],
  byId: Map<string, { x: number; y: number; z: number; id: string }>,
  band: StarConquestBand
): void {
  const roots = quests.filter((q) => q.underGraph).slice(0, 3);
  if (roots.length < 1) return;

  const graph = measureGraphRect();
  let left: number;
  let top: number;
  let width: number;
  let height: number;
  if (graph && graph.height >= 8) {
    const insetX = Math.max(6, graph.width * 0.08);
    const insetY = Math.max(4, graph.height * 0.12);
    left = graph.left + insetX;
    top = graph.top + insetY;
    width = Math.max(24, graph.width - insetX * 2);
    height = Math.max(10, graph.height - insetY * 2);
  } else {
    // Fallback 250×550 replié : bande type Graph au-dessus du floor
    const floorTop = band.floorTopPx;
    height = Math.max(28, Math.min(56, floorTop - band.topPx) * 0.22);
    top = Math.max(band.topPx + 8, floorTop - height - 10);
    left = 16;
    width = Math.max(40, band.viewportW - 32);
  }

  roots.forEach((quest, i) => {
    const p = byId.get(quest.id);
    if (!p) return;
    const xt = UNDER_GRAPH_X_T[i] ?? 0.5;
    const yt = UNDER_GRAPH_Y_T[i] ?? 0.5;
    p.x = left + xt * width;
    p.y = top + yt * height;
    p.z = 2 + i * 1.5;
  });
}

/** Positions monde des arêtes de silhouette zodiacale (décor niveau 3). */
export function buildConstellationGuidePositions(
  quests: readonly StarQuest[],
  band: StarConquestBand,
  camera: THREE.PerspectiveCamera,
  planeZ = -8
): { positions: Float32Array; edgeCount: number } {
  const left = band.worldLeftPx ?? 0;
  const right = band.worldRightPx ?? band.viewportW;
  const top = band.topPx + 6;
  const bottom = band.bottomPx - 8;
  const w = Math.max(40, right - left);
  const h = Math.max(40, bottom - top);

  const byFamily = new Map<StarQuestFamily, StarQuest[]>();
  for (const q of quests) {
    const list = byFamily.get(q.family) ?? [];
    list.push(q);
    byFamily.set(q.family, list);
  }
  for (const list of byFamily.values()) {
    list.sort((a, b) => b.rewardM4T3R - a.rewardM4T3R);
  }

  const segs: number[] = [];
  for (const c of STAR_CONSTELLATIONS) {
    const list = byFamily.get(c.family) ?? [];
    if (list.length < 2) continue;
    for (const [ia, ib] of c.edges) {
      if (ia >= list.length || ib >= list.length) continue;
      const a = list[ia];
      const b = list[ib];
      const ax = left + a.slot.u * w;
      const ay = top + a.slot.v * h;
      const bx = left + b.slot.u * w;
      const by = top + b.slot.v * h;
      const wa = screenToWorldOnPlane(ax, ay, camera, planeZ + (a.slot.depth ?? 0) * 10);
      const wb = screenToWorldOnPlane(bx, by, camera, planeZ + (b.slot.depth ?? 0) * 10);
      segs.push(wa.x, wa.y, wa.z, wb.x, wb.y, wb.z);
    }
  }
  return {
    positions: new Float32Array(segs),
    edgeCount: segs.length / 6,
  };
}

/** Décoratives uniquement dans la bande jouable (jamais Navbar/Swap). */
export function buildDecorativePositions(
  band: StarConquestBand,
  camera: THREE.PerspectiveCamera,
  count: number,
  planeZ = -55
): Float32Array {
  return buildLayerPositions(band, camera, count, planeZ, planeZ * 0.15);
}

/** Positions pour une couche de profondeur nommée — monde élargi. */
export function buildLayerPositions(
  band: StarConquestBand,
  camera: THREE.PerspectiveCamera,
  count: number,
  zCenter: number,
  zSpread: number,
  salt = 0
): Float32Array {
  const positions = new Float32Array(count * 3);
  const left = band.worldLeftPx ?? 0;
  const right = band.worldRightPx ?? band.viewportW;
  const spanX = Math.max(40, right - left);
  const top = band.topPx + 2;
  const h = Math.max(20, band.heightPx - 4);

  for (let i = 0; i < count; i++) {
    const u = (i * 0.6180339887 + 0.17 + salt * 0.07) % 1;
    const vRaw = (i * 0.3819660113 + 0.11 + salt * 0.13) % 1;
    // Densité artistique zone basse (sous floor → bord) : ~55 % biaisés vers le bas
    const v =
      i % 5 < 3
        ? 0.58 + vRaw * 0.42
        : i % 4 === 0
          ? 0.82 + vRaw * 0.18
          : vRaw;
    const sx = left + u * spanX;
    const sy = top + v * h;
    const z = zCenter + ((hash01(`d${salt}-${i}`, 1) - 0.5) * 2) * zSpread;
    const world = screenToWorldOnPlane(sx, sy, camera, z);
    const i3 = i * 3;
    positions[i3] = world.x;
    positions[i3 + 1] = world.y;
    positions[i3 + 2] = world.z;
  }
  return positions;
}

export function layerPositionsFromConfig(
  band: StarConquestBand,
  camera: THREE.PerspectiveCamera,
  layerId: StarDepthLayerId
): Float32Array {
  const layer = STAR_DEPTH_LAYERS[layerId];
  return buildLayerPositions(
    band,
    camera,
    layer.count,
    layer.zCenter,
    layer.zSpread,
    layerId === 'far' ? 0 : layerId === 'mid' ? 1 : 2
  );
}

/** Répulsion douce des labels 2D (affichage uniquement). */
export function separateLabelPositions(
  labels: { id: string; x: number; y: number }[],
  minDist = 18,
  iterations = 10
): void {
  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < labels.length; i++) {
      for (let j = i + 1; j < labels.length; j++) {
        const dx = labels[j].x - labels[i].x;
        const dy = labels[j].y - labels[i].y;
        const d2 = dx * dx + dy * dy;
        const min2 = minDist * minDist;
        if (d2 >= min2 || d2 < 1e-4) continue;
        const d = Math.sqrt(d2);
        const push = ((minDist - d) / d) * 0.35;
        labels[i].x -= dx * push * 0.5;
        labels[i].y -= dy * push * 0.5;
        labels[j].x += dx * push * 0.5;
        labels[j].y += dy * push * 0.5;
      }
    }
  }
}
