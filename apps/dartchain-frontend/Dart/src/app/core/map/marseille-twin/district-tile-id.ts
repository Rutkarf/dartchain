import { MARSEILLE_TILE_STRATEGY, type MarseilleDistrictId } from './marseille-district.types';

export function districtTileId(
  district: MarseilleDistrictId,
  worldX: number,
  worldZ: number
): string {
  const size = MARSEILLE_TILE_STRATEGY.chunkSizeMeters;
  const gridX = Math.floor(worldX / size);
  const gridZ = Math.floor(worldZ / size);
  return `${district}:${gridX}:${gridZ}`;
}
