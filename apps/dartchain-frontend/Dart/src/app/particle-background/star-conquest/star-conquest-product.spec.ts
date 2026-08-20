import { describe, expect, it, beforeEach } from 'vitest';

import { STAR_CONQUEST_CONTROLS } from './star-conquest-controls.config';
import { clearStarConquestDiag, countStarConquestDiag, recordStarConquestDiag } from './star-conquest-diagnostics';
import { StarConquestResourceRegistry } from './star-conquest-disposer';
import { STAR_CONQUEST_FEATURES, starConquestFeatureEnabled } from './star-conquest-features';
import { buildStarConquestHudChip } from './star-conquest-hud.view';
import { applyAxisDeadzone, idleStarConquestPanIntent, normalizeStarConquestStick } from './star-conquest-input';
import { mergeStarConquestKeyPan, starConquestKeyToPanDelta } from './star-conquest-keyboard';
import { starConquestPrefersReducedMotion } from './star-conquest-motion';
import { describeStarConquestPerfBudget } from './star-conquest-perf';
import { describeStarConquestDepth } from './star-conquest-depth-diagnostics';
import { hiveHexPoints, starConquestGalaxiesOnRing, starConquestHiveCells } from './star-conquest-hive.layout';
import {
  STAR_CONQUEST_ORBIT_DOUBLE_TAP_MS,
  screenDeltaToWorldPan,
  starConquestOrbitShouldPick,
} from './star-conquest-orbit';
import {
  STAR_CONQUEST_REST_GLOW,
  starConquestGalaxyRadius,
  starConquestMobileQuality,
  starConquestVisibleHalfExtents,
} from './star-conquest-ui-maturity.config';
import { starQuestVisualState, starQuestVisualTone } from './star-conquest-visual-state';
import {
  beginStarConquestPointerStroke,
  starConquestStrokeIsTap,
  starConquestShouldResetStickOnCancel,
  updateStarConquestPointerStroke,
} from './star-conquest-pointer-safety';
import { starConquestRuntimeError, STAR_CONQUEST_RUNTIME_IDLE } from './star-conquest-runtime-overlay';
import { buildStarConquestSelectionSnapshot } from './star-conquest-selection';
import { closeStarConquestSheet, openStarConquestSheet } from './star-conquest-sheet';
import {
  starConquestOverlayFitsDesignViewport,
  starConquestRectFitsViewport,
} from './star-conquest-viewport-fit';
import { starQuestById } from './star-conquest.mock';
import { STAR_CONQUEST_OVERLAY } from './star-conquest-scale';
import { starConquestDprCap } from './star-conquest-scale';

describe('Star Conquest product modules', () => {
  beforeEach(() => {
    clearStarConquestDiag();
  });

  it('normalizes stick with dead-zone and diagonal clamp', () => {
    expect(normalizeStarConquestStick(0.01, 0).active).toBe(false);
    const diag = normalizeStarConquestStick(1, 1);
    expect(diag.magnitude).toBeLessThanOrEqual(1.0001);
    expect(applyAxisDeadzone(0.02, 0.04)).toBe(0);
    expect(applyAxisDeadzone(0.5, 0.04)).toBe(0.5);
  });

  it('keeps historical control defaults', () => {
    expect(STAR_CONQUEST_CONTROLS.stickDeadzone).toBe(0.04);
    expect(STAR_CONQUEST_CONTROLS.tapDragThresholdPx).toBe(7);
    expect(STAR_CONQUEST_CONTROLS.recenterOnRelease).toBe(true);
  });

  it('detects reduced motion from a query', () => {
    expect(starConquestPrefersReducedMotion({ matches: true })).toBe(true);
    expect(starConquestPrefersReducedMotion({ matches: false })).toBe(false);
  });

  it('records diagnostics in a capped ring', () => {
    recordStarConquestDiag('select', 'sc-a');
    expect(countStarConquestDiag('select')).toBe(1);
  });

  it('keeps gameplay flags on and the top HUD off', () => {
    expect(STAR_CONQUEST_FEATURES.overlayHud).toBe(false);
    expect(starConquestFeatureEnabled('panStick')).toBe(true);
    expect(starConquestFeatureEnabled('canvasOrbit')).toBe(true);
    expect(starConquestFeatureEnabled('keyboardPan')).toBe(true);
  });

  it('builds a DOM selection snapshot from a quest', () => {
    const quest = starQuestById('sc-angular-layout');
    expect(quest).toBeTruthy();
    if (!quest) return;
    const snap = buildStarConquestSelectionSnapshot(quest);
    expect(snap.questId).toBe(quest.id);
    expect(snap.title).toBe(quest.title);
    expect(snap.actionHint.length).toBeGreaterThan(0);
  });

  it('disposes tracked resources', () => {
    const registry = new StarConquestResourceRegistry();
    let n = 0;
    registry.track({ dispose: () => { n += 1; } });
    registry.disposeAll();
    expect(n).toBe(1);
    expect(registry.size).toBe(0);
  });

  it('fits overlay boxes inside 250×550', () => {
    expect(starConquestOverlayFitsDesignViewport()).toBe(true);
    expect(
      starConquestRectFitsViewport({ x: 6, y: 6, w: 148, h: 136 }, 250, 550, 0)
    ).toBe(true);
    expect(
      starConquestRectFitsViewport({ x: 0, y: 0, w: 260, h: 10 }, 250, 550, 0)
    ).toBe(false);
  });

  it('maps keyboard codes to pan intent', () => {
    expect(starConquestKeyToPanDelta('KeyW')?.y).toBeLessThan(0);
    expect(starConquestKeyToPanDelta('Escape')).toBeNull();
    const merged = mergeStarConquestKeyPan(idleStarConquestPanIntent(), new Set(['KeyA', 'KeyW']));
    expect(merged.active).toBe(true);
    expect(merged.magnitude).toBeLessThanOrEqual(1);
  });

  it('models runtime overlay and help sheet without replacing HUD', () => {
    expect(STAR_CONQUEST_RUNTIME_IDLE.phase).toBe('ready');
    expect(starConquestRuntimeError('x').phase).toBe('error');
    expect(openStarConquestSheet('help').open).toBe(true);
    expect(closeStarConquestSheet().kind).toBe('none');
  });

  it('classifies tap versus drag from pointer stroke', () => {
    let stroke = beginStarConquestPointerStroke(1, 10, 10);
    stroke = updateStarConquestPointerStroke(stroke, 11, 10, 7);
    expect(starConquestStrokeIsTap(stroke)).toBe(true);
    stroke = updateStarConquestPointerStroke(stroke, 30, 10, 7);
    expect(starConquestStrokeIsTap(stroke)).toBe(false);
    expect(starConquestShouldResetStickOnCancel('pointercancel')).toBe(true);
  });

  it('describes the known perf budget without invented FPS', () => {
    const snap = describeStarConquestPerfBudget(
      starConquestDprCap('medium'),
      STAR_CONQUEST_OVERLAY.scannerW,
      STAR_CONQUEST_OVERLAY.scannerMaxH
    );
    expect(snap.rendererCount).toBe(1);
    expect(snap.idleSimHz).toBe(30);
    expect(snap.overlayMaxW).toBeLessThanOrEqual(176);
  });

  it('builds a compact HUD chip for 250×550', () => {
    const empty = buildStarConquestHudChip(null, 2, 35);
    expect(empty.visible).toBe(true);
    expect(empty.meta).toBe('2/35');
    const quest = starQuestById('sc-angular-layout');
    if (!quest) return;
    const selected = buildStarConquestHudChip(quest, 2, 35);
    expect(selected.title).toBe(quest.title);
  });

  it('keeps rest glow below focus and hive cells at five families', () => {
    expect(STAR_CONQUEST_REST_GLOW.coreMul).toBeLessThan(0.4);
    expect(STAR_CONQUEST_REST_GLOW.vertexMul).toBeLessThan(0.55);
    expect(STAR_CONQUEST_REST_GLOW.labelRestMul).toBe(0);
    expect(starConquestGalaxyRadius()).toBeGreaterThan(30);
    const { halfW, halfH } = starConquestVisibleHalfExtents();
    const cells = starConquestHiveCells();
    expect(cells).toHaveLength(5);
    const ring = starConquestGalaxiesOnRing(0);
    expect(ring).toHaveLength(5);
    for (const g of ring) {
      expect(Math.abs(g.x)).toBeLessThan(halfW * 0.98);
      expect(Math.abs(g.y)).toBeLessThan(halfH * 0.98);
    }
    // Biais : bas du cercle (+Y négatif) = près joueur (+Z) ; haut = fond (−Z)
    const bottom = ring.reduce((a, b) => (a.y < b.y ? a : b));
    const top = ring.reduce((a, b) => (a.y > b.y ? a : b));
    expect(bottom.z).toBeGreaterThan(top.z);
    expect(bottom.depthT).toBeGreaterThan(top.depthT);
    const near = [...ring].sort((a, b) => b.depthT - a.depthT)[0];
    const far = [...ring].sort((a, b) => a.depthT - b.depthT)[0];
    expect(near.z).toBeGreaterThan(far.z);
    expect(hiveHexPoints(0, 0, 0, 8)).toHaveLength(7);
    const idle = starQuestVisualTone(starQuestVisualState({
      status: 'available',
      focused: false,
      hovered: false,
      linked: false,
    }));
    const selected = starQuestVisualTone('selected');
    expect(idle.vertex).toBeLessThan(selected.vertex);
    expect(starQuestVisualState({
      status: 'locked',
      focused: false,
      hovered: false,
      linked: false,
    })).toBe('locked');
  });

  it('maps canvas drag to world pan without recentering on the helper', () => {
    const pan = screenDeltaToWorldPan(25, 0, 90, 70, 250, 550);
    expect(pan.dxWorld).toBeLessThan(0);
    expect(STAR_CONQUEST_ORBIT_DOUBLE_TAP_MS).toBeGreaterThan(200);
    const stroke = beginStarConquestPointerStroke(1, 10, 10);
    expect(starConquestOrbitShouldPick(stroke)).toBe(true);
    const dragged = updateStarConquestPointerStroke(stroke, 40, 10, 7);
    expect(starConquestOrbitShouldPick(dragged)).toBe(false);
    expect(starConquestMobileQuality('low').restMul).toBeLessThan(1);
    const depth = describeStarConquestDepth();
    expect(depth.zSpan).toBeGreaterThan(100);
    expect(depth.farZ).toBeLessThan(depth.nearZ);
  });
});
