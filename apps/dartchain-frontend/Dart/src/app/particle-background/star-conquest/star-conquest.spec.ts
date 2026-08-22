import {
  STAR_CONQUEST_MOCK_QUESTS,
  STAR_CONQUEST_QUEST_COUNT,
  STAR_CONQUEST_QUESTS_PER_FAMILY,
  STAR_CONQUEST_REMOVED_QUESTS,
  starQuestById,
} from './star-conquest.mock';
import {
  cloneStarQuest,
  starQuestClaimKind,
  STAR_QUEST_STATUS_LABEL,
} from './star-conquest.model';
import {
  claimStarQuest,
  emptyStarConquestProgress,
  hydrateStarQuestCatalog,
  incrementStarConquestFunnel,
  markStarQuestsClaimed,
  parseStarConquestProgress,
  previewM4T3RTotal,
} from './star-conquest-progress';
import { STAR_QUEST_FAMILIES, STAR_QUEST_FAMILY_ORDER } from './star-conquest-families';
import {
  STAR_CONQUEST_OVERLAY,
  STAR_CONQUEST_SCALE,
  STAR_CONQUEST_SCALE_PROFILES,
  STAR_CONQUEST_SCALE_TIER,
  nextStarConquestScaleTier,
  starConquestDepthDensity,
  starConquestDprCap,
  starConquestOverlayBox,
  starConquestPongSize,
} from './star-conquest-scale';
import { StarConquestGraph, STAR_PONG_OUTER_W, STAR_PONG_OUTER_H } from './star-conquest-graph';
import { layoutQuestsInBand, measureGapAboveFloor, measurePlayableBand } from './star-conquest-layout';
import { isQuestFullyOccluded } from './star-conquest-occlusion';
import {
  createStarCoreTexture,
  formatRewardShort,
  formatRewardWithDot,
  sizeFromReward,
} from './star-conquest-visuals';
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
import {
  createFilamentCoreLineMaterial,
  createFilamentRibbonMaterial,
} from './shaders/star-conquest-filament.shader';
import { createStarConquestAuroraMaterial } from './shaders/star-conquest-aurora.shader';
import {
  STAR_CONQUEST_LIVE_HUB_ID,
  STAR_CONQUEST_LIVE_LINKS,
  isStarConquestLiveQuest,
  starConquestLiveLink,
  starQuestIdsCompletedByLiveTasks,
} from './star-conquest-live';
import {
  STAR_CONQUEST_COMMERCIAL_THRESHOLDS,
  evaluateStarConquestCommercial,
  formatStarConquestKpiLine,
  starConquestKpis,
} from './star-conquest-commercial';
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { StarConquestProgressService } from '../../core/services/star-conquest-progress.service';
import { StarConquestFacade } from '../../core/services/star-conquest.facade';
import { QuestsPanelService } from '../../features/quests-panel/quests-panel.service';
import type { QuestPersistedState, QuestTaskView } from '../../features/quests-panel/quests-panel.model';

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
    expect(STAR_CONQUEST_REMOVED_QUESTS.length).toBe(19);
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

  it('covers current product surfaces in the catalog', () => {
    expect(starQuestById('sc-map-wigle')?.family).toBe('three');
    expect(starQuestById('sc-map-pickup')?.family).toBe('blockchain');
    expect(starQuestById('sc-dock-peers')?.family).toBe('quality');
    expect(starQuestById('sc-r4v3-market')?.family).toBe('quality');
    expect(starQuestById('sc-showcase-chat')?.title).toContain('Showcase');
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
    expect(STAR_DEPTH_LAYERS.interactive.count).toBe(STAR_CONQUEST_QUEST_COUNT);
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

  it('keeps constellation hubs inside the 250×550 frame', () => {
    const hubs = STAR_CONSTELLATIONS.map((c) => c.hubU).sort((a, b) => a - b);
    expect(hubs[0]).toBeGreaterThanOrEqual(0.18);
    expect(hubs[hubs.length - 1]).toBeLessThanOrEqual(0.82);
    expect(hubs[hubs.length - 1] - hubs[0]).toBeGreaterThan(0.4);
    for (const c of STAR_CONSTELLATIONS) {
      expect(c.hubU - c.halfW).toBeGreaterThanOrEqual(0.02);
      expect(c.hubU + c.halfW).toBeLessThanOrEqual(0.98);
      expect(c.hubV - c.halfH).toBeGreaterThanOrEqual(0.02);
      expect(c.hubV + c.halfH).toBeLessThanOrEqual(0.98);
    }
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

  it('keeps horizontal world nearly within the 250×550 viewport', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 250 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 550 });
    const band = measurePlayableBand(64);
    expect(band.overflowXPx).toBeLessThanOrEqual(20);
    expect(band.worldLeftPx).toBeGreaterThanOrEqual(-20);
    expect(band.worldRightPx).toBeLessThanOrEqual(band.viewportW + 20);
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

  it('keeps canvas orbit pan after release without recenter', () => {
    const world = new StarConquestWorld();
    world.setTravelBounds(100, 80);
    world.panByDelta(40, 0);
    for (let i = 0; i < 20; i++) world.tick(16);
    const held = world.getViewOffset().x;
    expect(held).toBeGreaterThan(8);
    world.releaseStick(false);
    for (let i = 0; i < 20; i++) world.tick(16);
    expect(world.getViewOffset().x).toBeGreaterThan(held * 0.7);
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
    expect(graph.questCoreCount).toBe(STAR_CONQUEST_QUEST_COUNT);
    expect(graph.questCoreCount).toBe(graph.questCount);
    for (const quest of STAR_CONQUEST_MOCK_QUESTS) {
      expect(graph.getQuest(quest.id)?.interactive).toBe(true);
    }
    expect(graph.linkEdgeCount).toBeGreaterThan(40);
    expect(graph.haloPoints).toBeTruthy();
    expect(graph.bloomPoints).toBeTruthy();
    expect(graph.ghostPoints).toBeTruthy();
    expect(graph.filamentRibbon).toBeTruthy();
    expect(graph.energyPackets).toBeTruthy();
    expect(graph.constellationGuides).toBeTruthy();
    // Guides zodiac : masqués au repos, visibles au focus (hiérarchie)
    expect(graph.constellationGuides.visible).toBe(false);
    // Ruche : pulse + motes (pas d’anneaux / hex décoratifs)
    expect(graph.effects.group.children.length).toBeGreaterThanOrEqual(1);
    const first = STAR_CONQUEST_MOCK_QUESTS[0];
    graph.setFocus(first.id);
    expect(graph.getFocusId()).toBe(first.id);
    expect(graph.constellationGuides.visible).toBe(true);
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 2000);
    camera.position.z = 160;
    graph.tick(16, camera);
    // Toutes les arêtes ont des positions finies (pas de lien fantôme)
    const pos = graph.connectionLines.geometry.getAttribute('position') as THREE.BufferAttribute;
    expect(pos.count).toBeGreaterThanOrEqual(graph.linkEdgeCount * 2);
    for (let i = 0; i < pos.count; i++) {
      expect(Number.isFinite(pos.getX(i))).toBe(true);
      expect(Number.isFinite(pos.getY(i))).toBe(true);
      expect(Number.isFinite(pos.getZ(i))).toBe(true);
    }
    graph.dispose();
  });

  it('accepts a catalog of any length and applies player statuses', () => {
    const quests = STAR_CONQUEST_MOCK_QUESTS.slice(0, 2).map((q) => ({
      ...q,
      position: { ...q.position },
      slot: { ...q.slot },
      connections: [] as string[],
    }));
    const graph = new StarConquestGraph(quests);
    expect(graph.questCount).toBe(2);
    graph.applyQuestStatuses([{ ...quests[0], status: 'completed' }, quests[1]]);
    expect(graph.getQuest(quests[0].id)?.status).toBe('completed');
    graph.dispose();
  });

  it('keeps idle energy packets and dims unlinked nodes on focus', () => {
    const graph = new StarConquestGraph(STAR_CONQUEST_MOCK_QUESTS);
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 2000);
    camera.position.z = 160;
    graph.tick(16, camera);
    expect(graph.energyPackets.visible).toBe(true);
    const first = STAR_CONQUEST_MOCK_QUESTS[0];
    graph.setFocus(first.id);
    const colors = graph.questPoints.geometry.getAttribute('color') as THREE.BufferAttribute;
    const focusIdx = STAR_CONQUEST_MOCK_QUESTS.findIndex((q) => q.id === first.id);
    const linkedIds = new Set([first.id, ...first.connections]);
    let dimIdx = -1;
    for (let i = 0; i < STAR_CONQUEST_MOCK_QUESTS.length; i++) {
      if (!linkedIds.has(STAR_CONQUEST_MOCK_QUESTS[i].id)) {
        dimIdx = i;
        break;
      }
    }
    expect(dimIdx).toBeGreaterThanOrEqual(0);
    const focusLum = colors.getX(focusIdx) + colors.getY(focusIdx) + colors.getZ(focusIdx);
    const dimLum = colors.getX(dimIdx) + colors.getY(dimIdx) + colors.getZ(dimIdx);
    expect(focusLum).toBeGreaterThan(dimLum * 3);
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

  it('ping-pongs particles on the scaled outer border', () => {
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
    graph.setUniverse(starConquestUniverseTheme('synaptic-cortex'));
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
    const { w: outerW, h: outerH } = starConquestPongSize(250, 550);
    expect(STAR_PONG_OUTER_W).toBe(outerW);
    expect(STAR_PONG_OUTER_H).toBe(outerH);
    const left = (250 - outerW) * 0.5;
    const right = left + outerW;
    const top = (550 - outerH) * 0.5;
    const bottom = top + outerH;
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

  it('keeps the quest panel inside 250×550 above floor chrome', () => {
    const box = starConquestOverlayBox(250, 550);
    const placed = placeQuestPanelNearParticle(
      120,
      470,
      box.panelW,
      box.panelH,
      zone,
      250,
      550
    );
    const w = placed.compact ? box.compactW : box.panelW;
    const h = placed.compact ? box.compactH : box.panelH;
    expect(placed.x).toBeGreaterThanOrEqual(box.margin);
    expect(placed.x + w).toBeLessThanOrEqual(250 - box.margin);
    expect(placed.y).toBeGreaterThanOrEqual(box.margin);
    expect(placed.y + h).toBeLessThanOrEqual(box.usableBottom);
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

  it('keeps Ruche on a near-black void with visible neural links', () => {
    const theme = starConquestUniverseTheme('agent-swarm');
    expect(theme.bgCenter).toBe('#040308');
    expect(theme.showNeuralLinks).toBe(true);
    expect(theme.linkOpacity).toBeGreaterThan(0.5);
    expect(theme.coreOpacity).toBeGreaterThan(0.9);
    expect(theme.haloSizeMult).toBeGreaterThan(3);
    expect(theme.showConstellations).toBe(true);
    expect(theme.constellationOpacity).toBeGreaterThan(0.1);
    expect(theme.coreSizeMult).toBeGreaterThan(1.5);
  });
});

describe('Star Conquest product scale', () => {
  it('runs at the product palier with company as visual ceiling', () => {
    expect(STAR_CONQUEST_SCALE_TIER).toBe('product');
    expect(STAR_CONQUEST_SCALE.visual).toBe(
      STAR_CONQUEST_SCALE_PROFILES.product.visual
    );
    expect(STAR_CONQUEST_SCALE_PROFILES.product.visual).toBeGreaterThan(
      STAR_CONQUEST_SCALE_PROFILES.rd.visual
    );
    expect(STAR_CONQUEST_SCALE_PROFILES.company.visual).toBeGreaterThan(
      STAR_CONQUEST_SCALE_PROFILES.product.visual
    );
    expect(nextStarConquestScaleTier('rd')).toBe('product');
    expect(nextStarConquestScaleTier('product')).toBe('company');
    expect(nextStarConquestScaleTier('company')).toBe('company');
  });

  it('caps GPU density and DPR on low quality', () => {
    expect(starConquestDepthDensity('low')).toBeLessThan(starConquestDepthDensity('medium'));
    expect(starConquestDprCap('low')).toBeLessThan(starConquestDprCap('high'));
  });

  it('is visually viable: sprites, filaments and atmosphere read as a product', () => {
    expect(STAR_CONQUEST_SCALE.visual).toBeGreaterThanOrEqual(2.3);
    expect(STAR_CONQUEST_SCALE.filamentWidthPx).toBeGreaterThanOrEqual(10);
    expect(STAR_CONQUEST_SCALE.ui).toBe(1);
    expect(STAR_DEPTH_LAYERS.far.opacity).toBeGreaterThan(0.12);
    expect(STAR_DEPTH_LAYERS.mid.opacity).toBeGreaterThan(0.18);
    expect(STAR_DEPTH_LAYERS.near.size).toBeGreaterThan(STAR_DEPTH_LAYERS.far.size);
    expect(STAR_DEPTH_LAYERS.far.zCenter).toBeLessThan(STAR_DEPTH_LAYERS.mid.zCenter);
  });

  it('fits every overlay inside the exclusive 250×550 viewport', () => {
    const box = starConquestOverlayBox(250, 550);
    expect(box.panelW + box.margin * 2).toBeLessThanOrEqual(250);
    expect(box.compactW + box.margin * 2).toBeLessThanOrEqual(250);
    expect(box.scannerW + box.margin * 2).toBeLessThanOrEqual(250);
    expect(box.panelH + box.floorChromeH + box.margin * 2).toBeLessThanOrEqual(550);
    expect(box.scannerH + box.floorChromeH + box.margin * 2).toBeLessThanOrEqual(550);
    expect(STAR_CONQUEST_OVERLAY.panelW).toBeLessThanOrEqual(90);
    expect(STAR_CONQUEST_OVERLAY.scannerW).toBeLessThanOrEqual(176);
    expect(STAR_CONQUEST_OVERLAY.joystickHitPx * 2).toBeLessThanOrEqual(72);
  });

  it('keeps ping-pong extents above the 250×550 design viewport', () => {
    const pong = starConquestPongSize(250, 550);
    expect(pong.w).toBeGreaterThan(250);
    expect(pong.h).toBeGreaterThan(550);
    expect(STAR_PONG_OUTER_W).toBe(pong.w);
    expect(STAR_PONG_OUTER_H).toBe(pong.h);
  });

  it('applies unclamped scaled particle sizes on tick', () => {
    const quests = STAR_CONQUEST_MOCK_QUESTS.slice(0, 2).map((q) => ({
      ...q,
      position: { ...q.position },
      slot: { ...q.slot },
      connections: [] as string[],
    }));
    const graph = new StarConquestGraph(quests);
    graph.setUniverse(starConquestUniverseTheme('agent-swarm'));
    const camera = new THREE.PerspectiveCamera(75, 250 / 550, 0.1, 2000);
    camera.position.z = STAR_CONQUEST_SCALE.cameraZ;
    graph.tick(16, camera);
    const core = graph.questPoints.material as THREE.PointsMaterial;
    expect(core.size).toBeGreaterThan(0.48);
    expect(core.size).toBeGreaterThan(STAR_CONQUEST_SCALE.visual);
    graph.dispose();
  });
});

describe('Star Conquest render materials', () => {
  it('builds filament ribbons with a screen-space width and traveling spark uniforms', () => {
    const ribbon = createFilamentRibbonMaterial();
    const core = createFilamentCoreLineMaterial();
    expect(ribbon.uniforms['uWidthPx'].value).toBe(STAR_CONQUEST_SCALE.filamentWidthPx);
    expect(ribbon.uniforms['uTime']).toBeTruthy();
    expect(ribbon.blending).toBe(THREE.AdditiveBlending);
    expect(ribbon.vertexColors).toBe(true);
    expect(ribbon.vertexShader).not.toMatch(/attribute\s+vec3\s+color\s*;/);
    expect(core.vertexColors).toBe(true);
    expect(core.vertexShader).not.toMatch(/attribute\s+vec3\s+color\s*;/);
    expect(core.uniforms['uOpacity'].value).toBeGreaterThan(0.7);
    ribbon.dispose();
    core.dispose();
  });

  it('keeps aurora as sparse nebula wisps instead of a milky plane', () => {
    const mat = createStarConquestAuroraMaterial();
    expect(mat.uniforms['uIntensity'].value).toBeLessThanOrEqual(0.6);
    expect(mat.blending).toBe(THREE.AdditiveBlending);
    expect(mat.fragmentShader).toContain('fbm');
    mat.dispose();
  });

  it('paints a star core disc', () => {
    const tex = createStarCoreTexture(32);
    expect(tex).toBeTruthy();
    expect(tex.image.width).toBe(32);
    tex.dispose();
  });
});

describe('Star Conquest product progress', () => {
  it('hydrates claimed quests and unlocks locked neighbors', () => {
    const available = STAR_CONQUEST_MOCK_QUESTS.find((q) => q.id === 'sc-swap-confirm');
    const locked = STAR_CONQUEST_MOCK_QUESTS.find((q) => q.id === 'sc-security-tx');
    expect(available?.status).toBe('available');
    expect(locked?.status).toBe('locked');

    const claimed = claimStarQuest(
      STAR_CONQUEST_MOCK_QUESTS,
      emptyStarConquestProgress(),
      'sc-swap-confirm',
      1
    );
    expect(claimed.ok).toBe(true);
    if (!claimed.ok) return;
    expect(claimed.quest.status).toBe('completed');
    expect(previewM4T3RTotal(claimed.snapshot)).toBe(available?.rewardM4T3R);

    const hydrated = hydrateStarQuestCatalog(STAR_CONQUEST_MOCK_QUESTS, claimed.snapshot);
    expect(hydrated.find((q) => q.id === 'sc-security-tx')?.status).toBe('available');
    expect(starQuestClaimKind(hydrated.find((q) => q.id === 'sc-data-persist')!.status)).toBe(
      'future'
    );
  });

  it('rejects locked, future and already claimed quests', () => {
    const locked = claimStarQuest(
      STAR_CONQUEST_MOCK_QUESTS,
      emptyStarConquestProgress(),
      'sc-security-tx'
    );
    expect(locked.ok).toBe(false);
    if (locked.ok) return;
    expect(locked.reason).toBe('locked');

    const future = claimStarQuest(
      STAR_CONQUEST_MOCK_QUESTS,
      emptyStarConquestProgress(),
      'sc-data-persist'
    );
    expect(future.ok).toBe(false);
    if (future.ok) return;
    expect(future.reason).toBe('future');

    const first = claimStarQuest(
      STAR_CONQUEST_MOCK_QUESTS,
      emptyStarConquestProgress(),
      'sc-swap-confirm'
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const again = claimStarQuest(STAR_CONQUEST_MOCK_QUESTS, first.snapshot, 'sc-swap-confirm');
    expect(again.ok).toBe(false);
    if (again.ok) return;
    expect(again.reason).toBe('already-claimed');
  });

  it('records funnel steps and ignores invalid snapshots', () => {
    const next = incrementStarConquestFunnel(emptyStarConquestProgress(), 'views');
    expect(next.funnel.views).toBe(1);
    expect(parseStarConquestProgress({ version: 2 }).funnel.views).toBe(0);
    expect(STAR_QUEST_STATUS_LABEL.completed).toBe('Conquise');
    expect(cloneStarQuest(STAR_CONQUEST_MOCK_QUESTS[0]).connections).not.toBe(
      STAR_CONQUEST_MOCK_QUESTS[0].connections
    );
  });
});

describe('Star Conquest live Dock mapping', () => {
  it('maps catalog stars onto Dock tasks, hub and product surfaces', () => {
    expect(STAR_CONQUEST_LIVE_LINKS.length).toBe(10);
    expect(STAR_CONQUEST_LIVE_LINKS.length / STAR_CONQUEST_QUEST_COUNT).toBeGreaterThanOrEqual(
      STAR_CONQUEST_COMMERCIAL_THRESHOLDS.minLiveCoverage
    );
    expect(isStarConquestLiveQuest('sc-security-auth')).toBe(true);
    expect(isStarConquestLiveQuest('sc-dock-faucet')).toBe(true);
    expect(isStarConquestLiveQuest('sc-swap-confirm')).toBe(true);
    expect(isStarConquestLiveQuest('sc-dock-chain')).toBe(true);
    expect(isStarConquestLiveQuest(STAR_CONQUEST_LIVE_HUB_ID)).toBe(true);
    expect(isStarConquestLiveQuest('sc-wallet-copy')).toBe(true);
    expect(isStarConquestLiveQuest('sc-dock-mempool')).toBe(true);
    expect(isStarConquestLiveQuest('sc-showcase-chat')).toBe(true);
    expect(isStarConquestLiveQuest('sc-dock-peers')).toBe(true);
    expect(isStarConquestLiveQuest('sc-r4v3-market')).toBe(true);
    expect(starConquestLiveLink('sc-dock-faucet')?.kind).toBe('task');
    expect(starConquestLiveLink(STAR_CONQUEST_LIVE_HUB_ID)?.kind).toBe('hub');
    expect(starConquestLiveLink('sc-wallet-copy')?.kind).toBe('navigate');
    expect(starConquestLiveLink('sc-dock-peers')?.action).toBe('peers');
    expect(starConquestLiveLink('sc-r4v3-market')?.action).toBe('market');
    expect(starQuestById(STAR_CONQUEST_LIVE_HUB_ID)?.status).toBe('available');
    for (const link of STAR_CONQUEST_LIVE_LINKS) {
      expect(starQuestById(link.starQuestId)).toBeTruthy();
    }
  });

  it('completes task stars from Dock ids and the hub only when all four are done', () => {
    expect(starQuestIdsCompletedByLiveTasks(new Set(['faucet-claim']))).toEqual([
      'sc-dock-faucet',
    ]);
    expect(starQuestIdsCompletedByLiveTasks(new Set(['daily-login']))).not.toContain(
      STAR_CONQUEST_LIVE_HUB_ID
    );

    const allFour = starQuestIdsCompletedByLiveTasks(
      new Set(['daily-login', 'faucet-claim', 'swap-tokens', 'explore-blocks'])
    );
    expect(allFour).toContain('sc-security-auth');
    expect(allFour).toContain('sc-dock-faucet');
    expect(allFour).toContain('sc-swap-confirm');
    expect(allFour).toContain('sc-dock-chain');
    expect(allFour).toContain(STAR_CONQUEST_LIVE_HUB_ID);
    expect(allFour).toHaveLength(5);
  });

  it('marks live stars claimed without a magic click', () => {
    const next = markStarQuestsClaimed(
      STAR_CONQUEST_MOCK_QUESTS,
      emptyStarConquestProgress(),
      starQuestIdsCompletedByLiveTasks(new Set(['faucet-claim']))
    );
    expect(next.claimed['sc-dock-faucet']).toBeTruthy();
    expect(next.claimed[STAR_CONQUEST_LIVE_HUB_ID]).toBeUndefined();
    expect(next.funnel.claims).toBe(1);

    const unchanged = markStarQuestsClaimed(
      STAR_CONQUEST_MOCK_QUESTS,
      next,
      starQuestIdsCompletedByLiveTasks(new Set(['faucet-claim']))
    );
    expect(unchanged).toBe(next);
  });
});

describe('StarConquestProgressService live gate', () => {
  const emptyState: QuestPersistedState = {
    dayKey: 'test',
    tasks: {},
    missionClaimed: false,
    weeklyClaimed: false,
    totalXp: 0,
    pendingMts: 0,
  };

  function taskView(id: string, complete: boolean): QuestTaskView {
    return {
      id,
      title: id,
      description: '',
      target: 1,
      rewardMts: 1,
      rewardXp: 10,
      action: 'login',
      progress: complete ? 1 : 0,
      complete,
      claimable: false,
      progressLabel: complete ? '1/1' : '0/1',
      autoHooked: true,
      autoClaimed: complete,
      pendingWallet: false,
    };
  }

  afterEach(() => {
    localStorage.removeItem('star-conquest-progress-v1');
    TestBed.resetTestingModule();
  });

  it('blocks magic claims on live stars until Dock tasks complete', async () => {
    localStorage.removeItem('star-conquest-progress-v1');
    const state$ = new BehaviorSubject(emptyState);
    let views: QuestTaskView[] = [];

    await TestBed.configureTestingModule({
      providers: [
        StarConquestProgressService,
        {
          provide: QuestsPanelService,
          useValue: {
            state$: state$.asObservable(),
            buildTaskViews: () => views,
          },
        },
      ],
    }).compileComponents();

    const service = TestBed.inject(StarConquestProgressService);
    service.resetForTests();

    const blocked = service.claim('sc-swap-confirm');
    expect(blocked.ok).toBe(false);
    if (blocked.ok) return;
    expect(blocked.reason).toBe('action-required');

    views = [
      taskView('daily-login', true),
      taskView('faucet-claim', true),
      taskView('swap-tokens', true),
      taskView('explore-blocks', true),
    ];
    state$.next(emptyState);

    expect(service.snapshot().claimed['sc-swap-confirm']).toBeTruthy();
    expect(service.snapshot().claimed[STAR_CONQUEST_LIVE_HUB_ID]).toBeTruthy();
    expect(service.liveCompletedCount()).toBe(5);
    expect(service.claim('sc-swap-confirm').ok).toBe(false);
  });

  it('completes navigate stars only after opening the product surface', async () => {
    localStorage.removeItem('star-conquest-progress-v1');
    const state$ = new BehaviorSubject(emptyState);

    await TestBed.configureTestingModule({
      providers: [
        StarConquestProgressService,
        {
          provide: QuestsPanelService,
          useValue: {
            state$: state$.asObservable(),
            buildTaskViews: () => [],
          },
        },
      ],
    }).compileComponents();

    const service = TestBed.inject(StarConquestProgressService);
    service.resetForTests();

    const blocked = service.claim('sc-wallet-copy');
    expect(blocked.ok).toBe(false);
    if (blocked.ok) return;
    expect(blocked.reason).toBe('action-required');

    const opened = service.completeNavigate('sc-wallet-copy');
    expect(opened.ok).toBe(true);
    expect(service.snapshot().claimed['sc-wallet-copy']).toBeTruthy();
    expect(service.completeNavigate('sc-dock-faucet').ok).toBe(false);
    expect(service.completeNavigate('sc-wallet-copy').ok).toBe(false);
  });

  it('preview claim does not issue HTTP and stays on localStorage', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    localStorage.removeItem('star-conquest-progress-v1');
    const state$ = new BehaviorSubject(emptyState);

    await TestBed.configureTestingModule({
      providers: [
        StarConquestProgressService,
        StarConquestFacade,
        {
          provide: QuestsPanelService,
          useValue: {
            state$: state$.asObservable(),
            buildTaskViews: () => [],
          },
        },
      ],
    }).compileComponents();

    const service = TestBed.inject(StarConquestProgressService);
    service.resetForTests();
    const result = service.claim('sc-swap-slippage');
    expect(result.ok).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(localStorage.getItem('star-conquest-progress-v1')).toContain('sc-swap-slippage');
    fetchSpy.mockRestore();
  });
});

describe('Star Conquest commercial process', () => {
  it('measures KPIs and waits for session volume once live coverage holds', () => {
    const empty = emptyStarConquestProgress();
    const kpis = starConquestKpis(empty, STAR_CONQUEST_QUEST_COUNT);
    expect(kpis.liveLinkCount).toBe(STAR_CONQUEST_LIVE_LINKS.length);
    expect(kpis.liveCoverage).toBeGreaterThanOrEqual(
      STAR_CONQUEST_COMMERCIAL_THRESHOLDS.minLiveCoverage
    );

    const report = evaluateStarConquestCommercial(empty, STAR_CONQUEST_QUEST_COUNT);
    expect(report.stage).toBe('instrumented');
    expect(report.canLevelUp).toBe(false);
    expect(report.blockers[0]).toBe('sample');
    expect(report.nextMethod).toContain('vues session');
    expect(formatStarConquestKpiLine(report)).toContain('instrumented');
  });

  it('authorizes commercial level-up only when KPI gates hold', () => {
    const snapshot = {
      version: 1 as const,
      claimed: {
        'sc-dock-faucet': { claimedAt: 1, rewardM4T3R: 1 },
        'sc-swap-confirm': { claimedAt: 2, rewardM4T3R: 1 },
        'sc-security-auth': { claimedAt: 3, rewardM4T3R: 1 },
      },
      funnel: { views: 10, picks: 5, panels: 4, claims: 3 },
    };
    const covered = evaluateStarConquestCommercial(snapshot, 35, 8);
    expect(covered.kpis.liveCoverage).toBeGreaterThanOrEqual(
      STAR_CONQUEST_COMMERCIAL_THRESHOLDS.minLiveCoverage
    );
    expect(covered.kpis.ctr).toBe(0.5);
    expect(covered.kpis.liveShare).toBe(1);
    expect(covered.stage).toBe('commercial');
    expect(covered.canLevelUp).toBe(true);
    expect(covered.blockers).toEqual([]);
    expect(formatStarConquestKpiLine(covered)).toContain('CTR 50%');
  });
});
