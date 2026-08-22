export type WigleConfidence = 'low' | 'medium' | 'high';
export type WigleNetworkType = 'wifi' | 'bluetooth' | 'unknown';
export type WigleSource = 'authorized-import' | 'authorized-api' | 'mock';

export interface WIGLEObservation {
  id: string;
  anonymizedId: string;
  latitudeApprox: number;
  longitudeApprox: number;
  altitudeApprox?: number;
  signalLevel?: number;
  channel?: number;
  frequency?: number;
  networkType?: WigleNetworkType;
  observedAt?: string;
  confidence: WigleConfidence;
  source: WigleSource;
}

export interface WIGLEBuildingAggregate {
  buildingId: string;
  observationCount: number;
  signalAverage?: number;
  signalMin?: number;
  signalMax?: number;
  networkTypeCounts: Record<string, number>;
  channelCounts: Record<string, number>;
  lastObservedAt?: string;
  confidence: WigleConfidence;
}

export interface WigleAreaAggregate {
  areaId: string;
  latitudeApprox: number;
  longitudeApprox: number;
  observationCount: number;
  signalAverage?: number;
  networkTypeCounts: Record<string, number>;
  confidence: WigleConfidence;
  source: WigleSource;
}

export interface BuildingEntrance {
  x: number;
  y: number;
  z: number;
  facingRad: number;
}

export interface BuildingReference {
  id: string;
  center: { x: number; y: number; z: number };
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  height: number;
  /** Libellé affichable (ensemble / bâtiment). */
  label?: string;
  /** Porte d'entrée — cible du mappage WiFi visuel. */
  entrance?: BuildingEntrance;
}

export interface BuildingDataAssociation {
  observationId: string;
  buildingId?: string;
  worldPosition: { x: number; y: number; z: number };
  distanceToBuilding?: number;
  confidence: WigleConfidence;
  associationType: 'inside-footprint' | 'nearest-building' | 'unmatched';
}

export interface WigleDebugStats {
  totalObservations: number;
  aggregatedBuildings: number;
  unmatchedObservations: number;
  averageAssociationDistance: number;
  lowConfidenceAssociations: number;
  visibleBuildingOverlays: number;
  activeWIGLEInstances: number;
}

export interface HorizonScaleDebugStats {
  scaleVisible: boolean;
  scaleBaseHeight: number;
  scaleMaxHeight: number;
  scaleWorldUnit: number;
  rocketVisible: boolean;
  rocketWorldPosition: { x: number; y: number; z: number };
  rocketDistanceFromCamera: number;
  rocketLod: 'off' | 'static' | 'animated';
}
