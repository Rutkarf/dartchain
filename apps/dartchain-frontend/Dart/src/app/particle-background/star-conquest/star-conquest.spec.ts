import {
  STAR_CONQUEST_MOCK_QUESTS,
  STAR_CONQUEST_QUEST_COUNT,
  STAR_CONQUEST_QUESTS_PER_FAMILY,
  STAR_CONQUEST_REMOVED_QUESTS,
  starQuestById,
} from './star-conquest.mock';
import { STAR_QUEST_FAMILIES, STAR_QUEST_FAMILY_ORDER } from './star-conquest-families';
import { StarConquestGraph, STAR_PONG_OUTER_W, STAR_PONG_OUTER_H } from './star-conquest-graph';
import { layoutQuestsInBand, measureGapAboveFloor, measurePlayableBand } from './star-conquest-layout';
import { isQuestFullyOccluded } from './star-conquest-occlusion';
import { formatRewardShort, formatRewardWithDot, sizeFromReward } from './star-conquest-visuals';
import { STAR_DEPTH_LAYERS } from './star-conquest-depth';
import { STAR_CONSTELLATIONS } from './star-conquest-constellations';
import { StarConquestWorld } from './star-conquest-world';
import { StarConquestJoystick } from './star-conquest-joystick';
import {
  placePanelClearOfJoystick,
  placeQuestPanelNearParticle,
  pointInJoystickZone,
  pushPointOutOfJoystick,
  rectOverlapsJoystick,
} from './star-conquest-joystick-zone';
import * as THREE from 'three';
import {
  STAR_CONQUEST_UNIVERSE_ORDER,
  STAR_CONQUEST_UNIVERSES,
  starConquestUniverseTheme,
} from './star-conquest-universes.config';
import { layoutPeerForUniverse } from './star-conquest-universe-layout';

describe('Star Conquest mock catalog', () => {
  it(`exposes exactly ${STAR_CONQUEST_QUEST_COUNT} interactive quests`, () => {
    expect(STAR_CONQUEST_MOCK_QUESTS.length).toBe(STAR_CONQUEST_QUEST_COUNT);
    const ids = new Set(STAR_CONQUEST_MOCK_QUESTS.map((q) => q.id));
    expect(ids.size).toBe(STAR_CONQUEST_QUEST_COUNT);

    for (const quest of STAR_CONQUEST_MOCK_QUESTS) {
      expect(quest.interactive).toBe(true);
      expect(quest.family).toBeTruthy();
      expect(STAR_QUEST_FAMILIES[quest.family]).toBeTruthy();
      expect(quest.rewardM4T3R).toBeGreaterThan(0);
      expect(formatRewardShort(quest.rewardM4T3R).startsWith('+')).toBe(true);
      expect(sizeFromReward(quest.rewardM4T3R)).toBeGreaterThan(1);
      for (const cid of quest.connections) {
        expect(ids.has(cid)).toBe(true);
      }
    }
  });

  it('keeps exactly 7 quests per family after reduction', () => {
    expect(STAR_CONQUEST_REMOVED_QUESTS.length).toBe(15);
    const counts: Record<string, number> = {};
    for (const quest of STAR_CONQUEST_MOCK_QUESTS) {
      counts[quest.family] = (counts[quest.family] ?? 0) + 1;
    }
    for (const family of STAR_QUEST_FAMILY_ORDER) {
      expect(counts[family]).toBe(STAR_CONQUEST_QUESTS_PER_FAMILY);
    }
  });

  it('covers all five visual families', () => {
    const seen = new Set(STAR_CONQUEST_MOCK_QUESTS.map((q) => q.family));
    for (const family of STAR_QUEST_FAMILY_ORDER) {
      expect(seen.has(family)).toBe(true);
    }
  });

  it('formats reward with neural dot prefix', () => {
    expect(formatRewardWithDot(25)).toBe('• +25');
  });

  it('resolves quest by id', () => {
    expect(starQuestById('sc-gamify-map')?.title).toContain('Conquest');
    expect(starQuestById('missing')).toBeUndefined();
  });
});

describe('StarConquest depth layers', () => {
  it('defines four progressive depth planes', () => {
    expect(STAR_DEPTH_LAYERS.far.zCenter).toBeLessThan(STAR_DEPTH_LAYERS.mid.zCenter);
    expect(STAR_DEPTH_LAYERS.mid.zCenter).toBeLessThan(STAR_DEPTH_LAYERS.interactive.zCenter);
    expect(STAR_DEPTH_LAYERS.interactive.zCenter).toBeLessThan(STAR_DEPTH_LAYERS.near.zCenter);
    expect(STAR_DEPTH_LAYERS.far.parallax).toBeLessThan(STAR_DEPTH_LAYERS.near.parallax);
    expect(STAR_DEPTH_LAYERS.interactive.count).toBe(35);
  });
});

describe('StarConquest zodiac constellations', () => {
  it('exposes five family-anchored silhouettes with 7 points each', () => {
    expect(STAR_CONSTELLATIONS.length).toBe(5);
    const families = new Set(STAR_CONSTELLATIONS.map((c) => c.family));
    expect(families.size).toBe(5);
    for (const c of STAR_CONSTELLATIONS) {
      expect(c.points.length).toBe(7);
      expect(c.edges.length).toBeGreaterThan(3);
    }
  });

  it('spreads constellation hubs across the full horizontal field', () => {
    const hubs = STAR_CONSTELLATIONS.map((c) => c.hubU).sort((a, b) => a - b);
    expect(hubs[0]).toBeLessThan(0.1);
    expect(hubs[hubs.length - 1]).toBeGreaterThan(0.9);
    expect(hubs[hubs.length - 1] - hubs[0]).toBeGreaterThan(0.85);
  });
});

describe('StarConquest occlusion', () => {
  it('returns false without UI hit targets in jsdom-less env', () => {
    expect(isQuestFullyOccluded(50, 50, [], 10)).toBe(false);
  });
});

describe('StarConquest playable band', () => {
  it('keeps top below mid-viewport by default', () => {
    const band = measurePlayableBand(64);
    expect(band.topPx).toBeGreaterThan(0);
    expect(band.bottomPx).toBeGreaterThan(band.topPx);
    expect(band.heightPx).toBeGreaterThan(80);
  });

  it('exposes a horizontal world wider than the viewport', () => {
    const band = measurePlayableBand(64);
    expect(band.overflowXPx).toBeGreaterThan(20);
    expect(band.worldLeftPx).toBeLessThan(0);
    expect(band.worldRightPx).toBeGreaterThan(band.viewportW);
    expect(band.floorTopPx).toBeGreaterThan(0);
  });

  it('extends the playable band near the bottom of the viewport', () => {
    const band = measurePlayableBand(64);
    expect(band.bottomPx).toBeGreaterThanOrEqual(band.viewportH - 8);
    expect(band.bottomPx).toBeGreaterThan(band.floorTopPx);
  });
});

describe('StarConquestWorld', () => {
  it('pans the camera viewpoint without moving the structure', () => {
    const world = new StarConquestWorld();
    expect(world.root.name).toBe('StarConquestWorld');
    expect(world.content.name).toBe('StarConquestContent');
    world.setTravelBounds(100, 80);
    world.setStick(1, 0);
    for (let i = 0; i < 30; i++) world.tick(16);
    const off = world.getViewOffset();
    expect(off.x).toBeGreaterThan(5);
    expect(world.content.position.x).toBe(0);
    expect(world.content.position.y).toBe(0);
    expect(world.content.rotation.z).toBe(0);
    const cam = new THREE.PerspectiveCamera(75, 1, 0.1, 2000);
    world.applyToCamera(cam, 160);
    expect(cam.position.x).toBeCloseTo(off.x, 1);
    expect(cam.position.z).toBe(160);
    const held = off.x;
    world.releaseStick();
    for (let i = 0; i < 50; i++) world.tick(16);
    // Relâchement → recentre la vue (viewport app)
    expect(Math.abs(world.getViewOffset().x)).toBeLessThan(Math.abs(held) * 0.35);
    expect(Math.abs(world.getViewOffset().x)).toBeLessThan(8);
    world.resetView(true);
    expect(world.getViewOffset().x).toBe(0);
    world.dispose();
  });

  it('bounces the viewpoint toward center when particles hit the viewport edge', () => {
    const world = new StarConquestWorld();
    world.setTravelBounds(100, 80);
    world.setStick(1, 0);
    for (let i = 0; i < 40; i++) world.tick(16);
    world.releaseStick(false); // garde l’offset pour tester le rebond
    for (let i = 0; i < 10; i++) world.tick(16);
    const settled = world.getViewOffset().x;
    expect(settled).toBeGreaterThan(10);
    const band = { topPx: 80, floorTopPx: 480, viewportW: 250, viewportH: 550 };
    for (let i = 0; i < 35; i++) {
      world.applyViewportEdgeBounce([{ x: -4, y: 200 }], band);
      world.tick(16);
    }
    expect(world.getViewOffset().x).toBeLessThan(settled - 1);
    expect(world.content.position.x).toBe(0);
    world.dispose();
  });

  it('does not move the world content when focusing a quest point', () => {
    const world = new StarConquestWorld();
    world.setTravelBounds(100, 80);
    world.focusWorldPoint(new THREE.Vector3(40, -20, 0));
    expect(world.content.position.x).toBe(0);
    expect(world.content.position.y).toBe(0);
    expect(world.content.rotation.z).toBe(0);
    for (let i = 0; i < 10; i++) world.tick(16);
    expect(world.content.position.x).toBe(0);
    expect(world.content.rotation.x).toBe(0);
    expect(world.content.rotation.y).toBe(0);
    expect(world.content.rotation.z).toBe(0);
    world.dispose();
  });

  it('allows panning far enough to reach bottom-world quests', () => {
    const world = new StarConquestWorld();
    world.setTravelBounds(80, 120);
    world.setStick(0, 1); // stick bas → caméra −Y
    for (let i = 0; i < 80; i++) world.tick(16);
    expect(world.getViewOffset().y).toBeLessThan(-40);
    expect(world.content.position.y).toBe(0);
    world.dispose();
  });
});

describe('StarConquestJoystick', () => {
  it('creates a light-chrome HorizonJoystick with aria label', () => {
    const joy = new StarConquestJoystick();
    expect(joy.group.name).toBe('HorizonJoystick');
    expect(joy.getAriaLabel()).toContain('univers de particules');
    joy.pulseTap();
    joy.tick(16);
    joy.dispose();
  });
});

describe('StarConquest gap band', () => {
  it('exposes a free band between stack and floor', () => {
    const gap = measureGapAboveFloor(64);
    expect(gap.centerX).toBeGreaterThan(0);
    expect(gap.bottom).toBeGreaterThanOrEqual(gap.top);
  });
});

describe('StarConquest under-floor & under-graph interactive roots', () => {
  it('exposes exactly 3 underFloor and 3 underGraph interactive quests', () => {
    const floorRoots = STAR_CONQUEST_MOCK_QUESTS.filter((q) => q.underFloor);
    const graphRoots = STAR_CONQUEST_MOCK_QUESTS.filter((q) => q.underGraph);
    expect(floorRoots.length).toBe(3);
    expect(graphRoots.length).toBe(3);
    for (const q of [...floorRoots, ...graphRoots]) {
      expect(q.interactive).toBe(true);
    }
  });

  it('pins underFloor quests under the floor on the center axis', () => {
    const quests = STAR_CONQUEST_MOCK_QUESTS.map((q) => ({
      ...q,
      position: { ...q.position },
      slot: { ...q.slot },
      connections: [...q.connections],
    }));
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 2000);
    camera.position.z = 160;
    const band = measurePlayableBand(64);
    layoutQuestsInBand(quests, band, camera, 0);
    const roots = quests.filter((q) => q.underFloor);
    expect(roots.length).toBe(3);
    for (const q of roots) {
      const sy =
        band.topPx + q.slot.v * Math.max(40, band.viewportH - 8 - band.topPx);
      // Dans / juste sous le peek floor, pas perdu hors bas d’écran
      expect(sy).toBeGreaterThanOrEqual(band.floorTopPx - 8);
      expect(sy).toBeLessThanOrEqual(band.viewportH + 30);
    }
    const mid = band.viewportW * 0.5;
    const xs = roots.map(
      (q) => band.worldLeftPx + q.slot.u * (band.worldRightPx - band.worldLeftPx)
    );
    const avgX = xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(Math.abs(avgX - mid)).toBeLessThan(40);

    const bottomOff = quests.filter((q) => {
      const sy =
        band.topPx + q.slot.v * Math.max(40, band.viewportH - 8 - band.topPx);
      return sy > band.viewportH - 6;
    });
    expect(bottomOff.length).toBeLessThanOrEqual(1);
  });

  it('pins underGraph quests into the graph band (or fallback above floor)', () => {
    const quests = STAR_CONQUEST_MOCK_QUESTS.map((q) => ({
      ...q,
      position: { ...q.position },
      slot: { ...q.slot },
      connections: [...q.connections],
    }));
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 2000);
    camera.position.z = 160;
    const band = measurePlayableBand(64);
    layoutQuestsInBand(quests, band, camera, 0);
    const roots = quests.filter((q) => q.underGraph);
    expect(roots.length).toBe(3);
    for (const q of roots) {
      const sy =
        band.topPx + q.slot.v * Math.max(40, band.viewportH - 8 - band.topPx);
      // Au-dessus du floor, dans la zone Graph / fallback
      expect(sy).toBeLessThan(band.floorTopPx + 8);
      expect(sy).toBeGreaterThan(band.topPx - 20);
    }
  });
});

describe('StarConquestGraph', () => {
  it('builds graph with halo and energy layers', () => {
    const graph = new StarConquestGraph(STAR_CONQUEST_MOCK_QUESTS);
    expect(graph.questCount).toBe(STAR_CONQUEST_QUEST_COUNT);
    expect(graph.linkEdgeCount).toBeGreaterThan(40);
    expect(graph.haloPoints).toBeTruthy();
    expect(graph.energyPackets).toBeTruthy();
    expect(graph.constellationGuides).toBeTruthy();
    expect(graph.constellationGuides.visible).toBe(false);
    const first = STAR_CONQUEST_MOCK_QUESTS[0];
    graph.setFocus(first.id);
    expect(graph.getFocusId()).toBe(first.id);
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 2000);
    camera.position.z = 160;
    graph.tick(16, camera);
    // Toutes les arêtes ont des positions finies (pas de lien fantôme)
    const pos = graph.connectionLines.geometry.getAttribute('position') as THREE.BufferAttribute;
    expect(pos.count).toBe(graph.linkEdgeCount * 2);
    for (let i = 0; i < pos.count; i++) {
      expect(Number.isFinite(pos.getX(i))).toBe(true);
      expect(Number.isFinite(pos.getY(i))).toBe(true);
      expect(Number.isFinite(pos.getZ(i))).toBe(true);
    }
    graph.dispose();
  });

  it('moves quest positions over time (real spatial drift)', () => {
    const quests = STAR_CONQUEST_MOCK_QUESTS.map((q) => ({
      ...q,
      position: { x: 0, y: 0, z: 0 },
      slot: { ...q.slot },
      connections: [...q.connections],
    }));
    const graph = new StarConquestGraph(quests);
    graph.applyPositions(
      quests.map((q, i) => ({
        ...q,
        position: { x: i * 2, y: i, z: (i % 3) - 1 },
      }))
    );
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 2000);
    camera.position.z = 160;
    const before = graph.getWorldPosition(quests[0].id, new THREE.Vector3())!;
    const bx = before.x;
    const by = before.y;
    const bz = before.z;
    for (let f = 0; f < 120; f++) {
      graph.tick(16, camera);
    }
    const after = graph.getWorldPosition(quests[0].id, new THREE.Vector3())!;
    const moved = Math.hypot(after.x - bx, after.y - by, after.z - bz);
    expect(moved).toBeGreaterThan(0.15);
    graph.dispose();
  });

  it('restores layout homes after drift (joystick release recenter)', () => {
    const quests = STAR_CONQUEST_MOCK_QUESTS.map((q) => ({
      ...q,
      position: { ...q.position },
      slot: { ...q.slot },
      connections: [...q.connections],
    }));
    const graph = new StarConquestGraph(quests);
    graph.applyPositions(
      quests.map((q, i) => ({
        ...q,
        position: { x: i * 3, y: -i * 2, z: 0 },
      }))
    );
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 2000);
    camera.position.z = 160;
    const home = graph.getWorldPosition(quests[0].id, new THREE.Vector3())!.clone();
    for (let f = 0; f < 60; f++) graph.tick(16, camera);
    const drifted = graph.getWorldPosition(quests[0].id, new THREE.Vector3())!;
    expect(Math.hypot(drifted.x - home.x, drifted.y - home.y)).toBeGreaterThan(0.2);
    graph.restoreLayoutHomes();
    const back = graph.getWorldPosition(quests[0].id, new THREE.Vector3())!;
    expect(back.x).toBeCloseTo(home.x, 4);
    expect(back.y).toBeCloseTo(home.y, 4);
    graph.dispose();
  });

  it('ping-pongs particles on the outer 260×560 border', () => {
    const prevW = window.innerWidth;
    const prevH = window.innerHeight;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 250 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 550 });

    const quests = STAR_CONQUEST_MOCK_QUESTS.slice(0, 3).map((q) => ({
      ...q,
      underFloor: false,
      underGraph: false,
      position: { x: 0, y: 0, z: 0 },
      slot: { ...q.slot },
      connections: [] as string[],
    }));
    const graph = new StarConquestGraph(quests);
    // Hors cadre à gauche — doit rebondir vers l’intérieur
    graph.applyPositions([
      { ...quests[0], position: { x: -120, y: 0, z: 0 } },
      { ...quests[1], position: { x: 0, y: 0, z: 0 } },
      { ...quests[2], position: { x: 40, y: 0, z: 0 } },
    ]);
    const camera = new THREE.PerspectiveCamera(75, 250 / 550, 0.1, 2000);
    camera.position.set(0, 0, 160);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();

    for (let f = 0; f < 8; f++) graph.tick(16, camera);

    const projected = graph.projectAllToScreen(camera);
    const p0 = projected.find((p) => p.id === quests[0].id);
    expect(p0).toBeTruthy();
    const left = (250 - STAR_PONG_OUTER_W) * 0.5;
    const right = left + STAR_PONG_OUTER_W;
    const top = (550 - STAR_PONG_OUTER_H) * 0.5;
    const bottom = top + STAR_PONG_OUTER_H;
    expect(p0!.x).toBeGreaterThanOrEqual(left - 0.5);
    expect(p0!.x).toBeLessThanOrEqual(right + 0.5);
    expect(p0!.y).toBeGreaterThanOrEqual(top - 0.5);
    expect(p0!.y).toBeLessThanOrEqual(bottom + 0.5);

    graph.dispose();
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: prevW });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: prevH });
  });
});

describe('Joystick exclusion zone', () => {
  const zone = {
    x: 125,
    y: 480,
    r: 50,
    left: 85,
    top: 440,
    right: 165,
    bottom: 520,
  };

  it('pushes points and panels outside the hitbox', () => {
    expect(pointInJoystickZone(125, 480, zone)).toBe(true);
    const out = pushPointOutOfJoystick(125, 480, zone, 8);
    expect(pointInJoystickZone(out.x, out.y, zone, 8)).toBe(false);
    const panel = placePanelClearOfJoystick(100, 450, 140, 100, zone, 250, 550, 6, 8);
    expect(rectOverlapsJoystick(panel.x, panel.y, 140, 100, zone, 8)).toBe(false);
  });

  it('places quest panel near particle without overlapping joystick', () => {
    const placed = placeQuestPanelNearParticle(
      120,
      470,
      140,
      100,
      zone,
      250,
      550,
      6,
      8,
      null
    );
    expect(rectOverlapsJoystick(placed.x, placed.y, 140, 100, zone, 8)).toBe(false);
  });
});

describe('Star Conquest universes', () => {
  it('uses Ruche as the sole global universe', () => {
    expect(STAR_CONQUEST_UNIVERSE_ORDER.length).toBe(1);
    expect(STAR_CONQUEST_UNIVERSE_ORDER[0]).toBe('agent-swarm');
    for (const id of STAR_CONQUEST_UNIVERSE_ORDER) {
      expect(STAR_CONQUEST_UNIVERSES[id]).toBeTruthy();
      expect(STAR_CONQUEST_UNIVERSES[id].id).toBe(id);
    }
  });

  it('layouts peers per universe without geo coordinates', () => {
    const ring = layoutPeerForUniverse('ring', {
      seed: 'peer-a',
      index: 0,
      total: 3,
      syncPercent: 90,
      latencyMs: 50,
    });
    expect(Number.isFinite(ring.x)).toBe(true);
    expect(Number.isFinite(ring.y)).toBe(true);
    expect(Number.isFinite(ring.z)).toBe(true);

    const grid = layoutPeerForUniverse('grid', {
      seed: 'peer-b',
      index: 1,
      total: 4,
    });
    expect(grid.x).not.toBe(ring.x);
  });

  it('applies universe theme to StarConquestGraph', () => {
    const quests = STAR_CONQUEST_MOCK_QUESTS.map((q) => ({
      ...q,
      position: { ...q.position },
      slot: { ...q.slot },
      connections: [...q.connections],
    }));
    const graph = new StarConquestGraph(quests);
    const theme = starConquestUniverseTheme('agent-swarm');
    graph.setUniverse(theme);
    expect(graph.getUniverse().id).toBe('agent-swarm');
    expect(graph.getUniverse().effectKind).toBe('agent-swarm');
    graph.dispose();
  });
});
