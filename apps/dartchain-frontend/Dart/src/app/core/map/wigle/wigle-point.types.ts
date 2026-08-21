export type WigleNetworkKind = 'WIFI' | 'CELL' | 'BLE' | 'UNKNOWN';
export type WaveEffectType =
  | 'ripple-circular'
  | 'pulse-glow'
  | 'wave-spiral'
  | 'radial-burst'
  | 'em-field'
  | 'signal-bars'
  | 'data-stream'
  | 'holo-dome'
  | 'frequency-wave'
  | 'network-mesh';

/** Effets sol uniquement — les variantes holographiques ne sont plus assignées. */
export const WAVE_EFFECT_TYPES: readonly WaveEffectType[] = [
  'ripple-circular',
  'network-mesh',
] as const;

export interface WigleGeoPoint {
  id: string;
  latitude: number;
  longitude: number;
  networkName: string;
  networkType: WigleNetworkKind;
  signalStrength: number;
  source: 'authorized-api' | 'mock';
  /** Position monde Three.js (mètres) — remplie après conversion GPS. */
  worldX: number;
  worldY: number;
  worldZ: number;
  /** Type d'effet d'onde assigné (0-9). */
  waveEffect: WaveEffectType;
  /** Footprint OSM associée (Cycle 4). */
  osmBuildingId?: string;
  /** Bâtiment registry associé après mappage porte d'entrée. */
  buildingId?: string;
  buildingLabel?: string;
  mappedAtEntrance?: boolean;
}

export interface WiglePointsResponse {
  type: string;
  source: string;
  centerLatitude: number;
  centerLongitude: number;
  radiusMeters: number;
  points: Array<{
    id: string;
    latitude: number;
    longitude: number;
    networkName: string;
    networkType: string;
    signalStrength: number;
    source: string;
  }>;
}

export interface WigleGeoDebugStats {
  totalPoints: number;
  visiblePoints: number;
  activeBuildings: number;
  activeWaveEffects: number;
  drawCallsEstimate: number;
  loadRadiusMeters: number;
  effectsEnabled: boolean;
  osmFootprintsActive: number;
  osmMatchedPoints: number;
  entranceMappedPoints: number;
  buildingEnsembles: string[];
}
