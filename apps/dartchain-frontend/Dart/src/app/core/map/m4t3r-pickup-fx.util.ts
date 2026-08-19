import { R4V3_GROUND_FIELD } from './map-configuration';
import { clusterWorldCenter } from './m4t3r-trail.util';

/** Une pièce visuelle au sol = cellule R4V3 (1,25 m), pas un cluster 14 cm. */
export interface RenderCellPickup {
  renderKey: string;
  clusterIds: string[];
  x: number;
  z: number;
}

export function renderCellKeyAt(x: number, z: number): string {
  const size = R4V3_GROUND_FIELD.cellSize;
  const gx = Math.floor(x / size);
  const gz = Math.floor(z / size);
  return `m4t3r-render:${gx}:${gz}`;
}

export function renderCellCenter(gx: number, gz: number): { x: number; z: number } {
  const size = R4V3_GROUND_FIELD.cellSize;
  return { x: (gx + 0.5) * size, z: (gz + 0.5) * size };
}

/** Regroupe les clusters collectés par pièce visuelle (1 effet / token instancié). */
export function groupClustersByRenderCell(clusterIds: readonly string[]): RenderCellPickup[] {
  const map = new Map<string, RenderCellPickup>();
  for (const clusterId of clusterIds) {
    if (!clusterId) continue;
    const center = clusterWorldCenter(clusterId);
    if (!center) continue;
    const renderKey = renderCellKeyAt(center.x, center.z);
    const existing = map.get(renderKey);
    if (existing) {
      existing.clusterIds.push(clusterId);
      continue;
    }
    const size = R4V3_GROUND_FIELD.cellSize;
    const gx = Math.floor(center.x / size);
    const gz = Math.floor(center.z / size);
    const cellCenter = renderCellCenter(gx, gz);
    map.set(renderKey, {
      renderKey,
      clusterIds: [clusterId],
      x: cellCenter.x,
      z: cellCenter.z,
    });
  }
  return [...map.values()];
}
