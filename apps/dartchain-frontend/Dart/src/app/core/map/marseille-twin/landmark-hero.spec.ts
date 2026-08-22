import { describe, expect, it } from 'vitest';

import { buildHeroSkylineLandmarkSet } from './landmark-hero-mesh.builder';
import { HERO_SKYLINE_LANDMARKS, heroSkylineWorldAnchor } from './landmark-hero.config';

describe('landmark-hero Phase 10', () => {
  it('ancre les silhouettes loin du spawn', () => {
    for (const def of HERO_SKYLINE_LANDMARKS) {
      const anchor = heroSkylineWorldAnchor(def.id);
      expect(Math.hypot(anchor.x, anchor.z)).toBeGreaterThan(240);
    }
  });

  it('construit fort, garde, mucem et phare', () => {
    const built = buildHeroSkylineLandmarkSet('medium');
    expect(built.entries.length).toBe(4);
    expect(built.entries.map((e) => e.id).sort()).toEqual(
      HERO_SKYLINE_LANDMARKS.map((d) => d.id).sort()
    );
    for (const entry of built.entries) {
      expect(entry.group.userData['skylineLandmark']).toBe(true);
      expect(entry.group.children.length).toBeGreaterThan(0);
    }
  });

  it('réduit les fins MUCEM en ultra-low sans les supprimer', () => {
    const low = buildHeroSkylineLandmarkSet('ultra-low');
    const mucem = low.entries.find((e) => e.id === 'mucem')!;
    const finCount = mucem.group.children.filter((c) => c.name.startsWith('mucem-fin')).length;
    expect(finCount).toBeGreaterThan(0);

    const high = buildHeroSkylineLandmarkSet('high');
    const mucemHigh = high.entries.find((e) => e.id === 'mucem')!;
    expect(
      mucemHigh.group.children.filter((c) => c.name.startsWith('mucem-fin')).length
    ).toBeGreaterThan(finCount);
  });
});
