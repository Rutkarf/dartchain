import { MARSEILLE_LANDMARK_BUILDINGS } from '../geo-reference.config';
import { southFacadeEdgeFromFootprint } from './south-facade-edge';

export interface NeonSignageZone {
  id: string;
  buildingId: string;
  x: number;
  y: number;
  z: number;
  widthMeters: number;
  sourceQuality: 'PROJECTED';
  overlayOnly: true;
}

const SHOP_BAY_COUNT = 5;
const SIGN_Y = 2.15;

/**
 * Zones enseigne le long de la façade sud OSM de way/67704902.
 * N’ajoute pas de mesh tant que l’overlay n’est pas enabled.
 */
export function shopsEastNeonSignageZones(): NeonSignageZone[] {
  const landmark = MARSEILLE_LANDMARK_BUILDINGS.find(
    (item) => item.id === 'mirror-adjacent-building-02'
  );
  if (!landmark) return [];
  const edge = southFacadeEdgeFromFootprint(landmark.footprint);
  if (!edge) return [];
  const zones: NeonSignageZone[] = [];
  for (let i = 0; i < SHOP_BAY_COUNT; i++) {
    const t = (i + 0.5) / SHOP_BAY_COUNT;
    zones.push({
      id: `neon-bay-${i + 1}`,
      buildingId: landmark.id,
      x: edge.ax + (edge.bx - edge.ax) * t,
      y: SIGN_Y,
      z: edge.az + (edge.bz - edge.az) * t,
      widthMeters: edge.lengthMeters / SHOP_BAY_COUNT,
      sourceQuality: 'PROJECTED',
      overlayOnly: true,
    });
  }
  return zones;
}
