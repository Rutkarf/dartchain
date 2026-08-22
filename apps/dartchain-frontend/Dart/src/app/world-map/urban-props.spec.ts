import { describe, expect, it } from 'vitest';

import { mapQualityTier } from './map-configuration';
import { buildQuayHarborExtras } from './quay-props.util';
import {
  corridorStreetPropPlacements,
  buildVieuxPortStreetProps,
} from './street-props.util';
import { VIEUX_PORT_GROUND_CORRIDORS } from './ground-layout.data';
import {
  urbanPropsBudget,
  urbanPropsScope,
} from './urban-props.config';

describe('urban-props Phase 14', () => {
  it('scope full sur tous les tiers (parité visuelle)', () => {
    expect(urbanPropsScope('ultra-low')).toBe('full');
    expect(urbanPropsScope('low')).toBe('full');
    expect(urbanPropsScope('medium')).toBe('full');
    expect(urbanPropsScope('high')).toBe('full');
  });

  it('budget full identique pour tous les tiers', () => {
    expect(urbanPropsBudget('full').boats).toBe(6);
    expect(urbanPropsBudget('full').trees).toBe(72);
    expect(mapQualityTier('medium').urbanPropsScope).toBe('full');
    expect(mapQualityTier('high').urbanPropsScope).toBe('full');
  });

  it('place des props le long des corridors sans eau', () => {
    const placements = corridorStreetPropPlacements(VIEUX_PORT_GROUND_CORRIDORS, 'full');
    expect(placements.length).toBeGreaterThan(6);
    expect(placements.some((p) => p.kind === 'tree')).toBe(true);
  });

  it('construit des InstancedMesh trottoir', () => {
    const built = buildVieuxPortStreetProps('full', 'ultra-low');
    expect(built.group.name).toBe('marseille-street-props');
    expect(built.counts.tree).toBeGreaterThan(0);
    expect(built.group.children.some((c) => c.name === 'marseille-street-trees')).toBe(true);
  });

  it('ajoute bateaux et bouées au quai des Belges', () => {
    const extras = buildQuayHarborExtras('full', 'ultra-low');
    expect(extras).not.toBeNull();
    expect(extras!.boatCount).toBe(6);
    expect(extras!.buoyCount).toBeGreaterThan(0);
    expect(extras!.group.getObjectByName('marseille-quay-boats')).toBeDefined();

    expect(buildQuayHarborExtras('none', 'medium')).toBeNull();
  });
});
