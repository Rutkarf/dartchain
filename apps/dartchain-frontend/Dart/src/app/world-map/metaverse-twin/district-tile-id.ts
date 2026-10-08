import { METAVERSE_TILE_STRATEGY, type MetaverseDistrictId } from './metaverse-district.types';

export function districtTileId(
  district: MetaverseDistrictId,
  worldX: number,
  worldZ: number
): string {
  const size = METAVERSE_TILE_STRATEGY.chunkSizeMeters;
  const gridX = Math.floor(worldX / size);
  const gridZ = Math.floor(worldZ / size);
  return `${district}:${gridX}:${gridZ}`;
}
