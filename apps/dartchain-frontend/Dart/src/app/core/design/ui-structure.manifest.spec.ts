import {
  UI_STRUCTURE_MANIFEST,
  LEGACY_ORPHAN_COMPONENTS,
  PHASE1_SUMMARY,
  assertReadingOrderCoverage,
  countManifestElements,
  countManifestInteractions,
  getZoneById,
} from './ui-structure.manifest';
import { READING_ORDER, TARGET_VIEWPORT } from './ui-layout-zones.constants';

describe('Phase 1 — UI structure manifest', () => {
  it('documents target viewport 300×500', () => {
    expect(TARGET_VIEWPORT.width).toBe(300);
    expect(TARGET_VIEWPORT.height).toBe(500);
  });

  it('tracks redesign phase progression', () => {
    expect(PHASE1_SUMMARY.phase).toBeGreaterThanOrEqual(2);
  });

  it('covers all primary shell zones', () => {
    expect(getZoneById('navbar')).toBeDefined();
    expect(getZoneById('hub')).toBeDefined();
    expect(getZoneById('showcase')).toBeDefined();
    expect(getZoneById('bottom-stack')).toBeDefined();
    expect(getZoneById('bottom-dock')).toBeDefined();
    expect(getZoneById('background')).toBeDefined();
    expect(getZoneById('overlays')).toBeDefined();
  });

  it('preserves showcase chevron and dual tab layers in manifest', () => {
    const showcase = getZoneById('showcase')!;
    expect(showcase.notes?.some((n) => n.includes('collapse/expand'))).toBe(true);
    expect(showcase.notes?.some((n) => n.includes('niveau A'))).toBe(true);
    expect(showcase.notes?.some((n) => n.includes('niveau B'))).toBe(true);
    expect(showcase.components.some((c) => c.selector === 'showcase-toggle')).toBe(true);
    expect(showcase.components.some((c) => c.selector === 'app-showcase-tabs')).toBe(true);
    expect(showcase.components.some((c) => c.selector === 'app-showcase-news')).toBe(true);
  });

  it('lists all bottom dock tabs including gated ones', () => {
    const dock = getZoneById('bottom-dock')!.components[0];
    const ids = dock.elements.map((e) => e.id);
    expect(ids).toContain('dock-wallet');
    expect(ids).toContain('dock-faucet');
    expect(ids).toContain('dock-pending');
    expect(ids).toContain('dock-block');
    expect(ids).toContain('dock-chain');
    expect(ids).toContain('dock-quests');
    expect(ids).toContain('dock-peers');
    expect(ids).not.toContain('dock-market');
    expect(ids).toContain('dock-admin');
  });

  it('lists marché as rightmost showcase tab', () => {
    const showcase = getZoneById('showcase')!;
    const tabs = showcase.components.find((c) => c.selector === 'app-showcase-tabs')!;
    const ids = tabs.elements.map((e) => e.id);
    expect(ids).toContain('tab-market');
    expect(ids.at(-1)).toBe('tab-market');
    expect(ids).not.toContain('tab-peers');
  });

  it('documents particle background and three-floor', () => {
    const bg = getZoneById('background')!;
    expect(bg.components.some((c) => c.selector === 'app-particle-background')).toBe(true);
    expect(bg.components.some((c) => c.selector === 'app-three-floor')).toBe(true);
  });

  it('has non-zero inventory counts for redesign validation', () => {
    expect(countManifestElements()).toBeGreaterThan(80);
    expect(countManifestInteractions()).toBeGreaterThan(60);
    expect(PHASE1_SUMMARY.componentCount).toBeGreaterThan(25);
  });

  it('asserts reading order coverage', () => {
    expect(() => assertReadingOrderCoverage()).not.toThrow();
    expect(READING_ORDER[0]).toBe('navbar');
    expect(READING_ORDER.at(-2)).toBe('bottom-dock');
  });

  it('tracks legacy orphan components without mounting them', () => {
    expect(LEGACY_ORPHAN_COMPONENTS.length).toBeGreaterThan(0);
    expect(UI_STRUCTURE_MANIFEST.some((z) => z.components.some((c) => c.selector === 'app-dock-tabs'))).toBe(
      false,
    );
  });
});
