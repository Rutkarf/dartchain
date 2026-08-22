import { twinIsGameplayPlaceholder } from './marseille-building-twin.model';
import type { MarseilleBuildingTwin } from './marseille-building-twin.model';

describe('marseille-building-twin.model (ITER-014)', () => {
  it('sépare identité, footprint, overlay et collision (pas de mesh ici)', () => {
    const twin: MarseilleBuildingTwin = {
      id: 'mirror-adjacent-building-01',
      identityLabel: 'Immeuble nord-est Ombrière',
      footprintSource: 'PROJECTED',
      heightSource: 'APPROXIMATE',
      heightMeters: 20,
      roofShape: 'flat',
      facadeCategory: 'ground-storefront',
      worldAnchor: { x: 57.75, y: 0, z: -6.58 },
      cyberpunkVariant: 'none',
      lod: 'full',
      licenceProvenance: 'ODbL OSM way/67705148',
    };
    expect(twinIsGameplayPlaceholder(twin)).toBe(false);
    expect(twin.cyberpunkVariant).toBe('none');
  });
});
