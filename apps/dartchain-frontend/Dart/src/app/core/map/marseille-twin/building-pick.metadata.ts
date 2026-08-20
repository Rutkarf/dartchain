/**
 * Métadonnées de pick — distinctes du mesh collision et du mesh visuel.
 * Les placements RDC existants restent la source d interaction commerciale.
 */
export interface BuildingPickMetadata {
  buildingId: string;
  pickable: boolean;
  raycastLayer: 'visual' | 'collision' | 'placement-hit' | 'overlay';
  blocksGameplayRaycast: boolean;
}

export const DEFAULT_OVERLAY_PICK: BuildingPickMetadata = {
  buildingId: 'marseille-cyberpunk-overlay',
  pickable: false,
  raycastLayer: 'overlay',
  blocksGameplayRaycast: false,
};

export function overlayShouldBlockPlacementRaycast(meta: BuildingPickMetadata): boolean {
  return meta.raycastLayer === 'overlay' && meta.blocksGameplayRaycast;
}
