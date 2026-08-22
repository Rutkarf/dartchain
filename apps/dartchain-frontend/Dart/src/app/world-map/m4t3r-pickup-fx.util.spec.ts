import { describe, expect, it } from 'vitest';

import { R4V3_GROUND_FIELD } from './map-configuration';
import { groupClustersByRenderCell, renderCellKeyAt } from './m4t3r-pickup-fx.util';

describe('m4t3r-pickup-fx.util', () => {
  it('regroupe plusieurs clusters 14 cm en une seule pièce visuelle 1,25 m', () => {
    const cells = groupClustersByRenderCell([
      'm4t3r-cluster:0:0',
      'm4t3r-cluster:1:0',
      'm4t3r-cluster:0:1',
      'm4t3r-cluster:1:1',
    ]);
    expect(cells).toHaveLength(1);
    expect(cells[0]?.clusterIds).toHaveLength(4);
    expect(cells[0]?.x).toBe(R4V3_GROUND_FIELD.cellSize * 0.5);
    expect(cells[0]?.z).toBe(R4V3_GROUND_FIELD.cellSize * 0.5);
  });

  it('sépare les pièces visuelles sur deux cellules render', () => {
    const size = R4V3_GROUND_FIELD.cellSize;
    const farGx = Math.ceil(size / 0.14) + 2;
    const cells = groupClustersByRenderCell([
      'm4t3r-cluster:0:0',
      `m4t3r-cluster:${farGx}:0`,
    ]);
    expect(cells).toHaveLength(2);
    expect(renderCellKeyAt(cells[0]!.x, cells[0]!.z)).not.toBe(
      renderCellKeyAt(cells[1]!.x, cells[1]!.z)
    );
  });
});
