import * as THREE from 'three';

/**
 * Origine scène = Ombrière du Vieux-Port (OSM way/200273945).
 * Le miroir gameplay reste à world (0, 0) — coïncide avec cette origine géographique.
 */
export const MARSEILLE_GEO_ORIGIN = {
  latitude: 43.2945995,
  longitude: 5.3741227,
  altitude: 0,
  sourceId: 'osm-way-200273945',
  name: 'Ombrière du Vieux-Port',
  confidence: 'high' as const,
};

export interface GeoReferenceConfig {
  sourceCrs: string;
  worldCrs: string;
  originLatitude: number;
  originLongitude: number;
  originAltitude: number;
  metersPerWorldUnit: number;
  northRotationRadians: number;
  axisMapping: {
    east: 'x' | '-x' | 'z' | '-z';
    north: 'x' | '-x' | 'z' | '-z';
    up: 'y' | '-y';
  };
}

export const GEO_REFERENCE_CONFIG: GeoReferenceConfig = {
  sourceCrs: 'EPSG:4326',
  worldCrs: 'local-equirectangular-meters',
  originLatitude: MARSEILLE_GEO_ORIGIN.latitude,
  originLongitude: MARSEILLE_GEO_ORIGIN.longitude,
  originAltitude: MARSEILLE_GEO_ORIGIN.altitude,
  metersPerWorldUnit: 1,
  northRotationRadians: 0,
  axisMapping: {
    east: 'x',
    north: '-z',
    up: 'y',
  },
};

export interface GeographicDataSource {
  id: string;
  type:
    | 'geojson'
    | 'osm'
    | 'dem'
    | 'glb'
    | 'gltf'
    | 'csv'
    | 'json'
    | 'vector-tile'
    | 'raster-tile'
    | 'api'
    | 'mock';
  pathOrEndpoint: string;
  coordinateSystem?: string;
  unit?: string;
  coverage?: string;
  accuracy?: string;
  license?: string;
  isAuthorized: boolean;
  isUsed: boolean;
}

/** Sources réellement présentes ou configurées dans le dépôt (inventaire Phase 3). */
export const GEOGRAPHIC_DATA_SOURCES: readonly GeographicDataSource[] = [
  {
    id: 'osm-overpass-marseille-buildings',
    type: 'osm',
    pathOrEndpoint: '/overpass (proxy) | overpass-api.de',
    coordinateSystem: 'EPSG:4326',
    unit: 'degrees',
    coverage: 'Vieux-Port bbox OSM_QUERY_BOUNDS',
    accuracy: '~2–5 m (OSM community)',
    license: 'ODbL (OpenStreetMap)',
    isAuthorized: true,
    isUsed: true,
  },
  {
    id: 'osm-overpass-wigle-footprints',
    type: 'osm',
    pathOrEndpoint: 'GeoMappingService.fetchOSMBuildings',
    coordinateSystem: 'EPSG:4326',
    coverage: 'WIGLE_OSM_QUERY_BOUNDS',
    accuracy: '~2–5 m',
    license: 'ODbL',
    isAuthorized: true,
    isUsed: true,
  },
  {
    id: 'marseille-prototype-landmarks',
    type: 'json',
    pathOrEndpoint: 'geo-reference.config.ts MARSEILLE_LANDMARK_BUILDINGS',
    coordinateSystem: 'EPSG:4326',
    coverage: 'Miroir + 4 héros bâtiments',
    accuracy: 'empreintes OSM way/* (centroïde + bbox)',
    license: 'ODbL (empreintes OSM)',
    isAuthorized: true,
    isUsed: true,
  },
  {
    id: 'marseille-harbor-layout',
    type: 'json',
    pathOrEndpoint: 'map-configuration.ts MARSEILLE_HARBOR_WATER + vieux-port-layout.util.ts',
    coordinateSystem: 'local-meters',
    coverage: 'Bassin Vieux-Port (approximation)',
    accuracy: 'estimated — aligné sur repère miroir',
    license: 'projet',
    isAuthorized: true,
    isUsed: true,
  },
  {
    id: 'world-streaming-procedural',
    type: 'mock',
    pathOrEndpoint: 'world-streaming.manager.ts',
    coordinateSystem: 'local-meters',
    coverage: '>180 m du centre',
    accuracy: 'estimated procedural',
    isAuthorized: true,
    isUsed: true,
  },
  {
    id: 'wigle-backend-mock',
    type: 'mock',
    pathOrEndpoint: 'WigleVisualizationService.java',
    coordinateSystem: 'EPSG:4326',
    coverage: 'Agrégats WiFi mock',
    accuracy: 'low — métadonnées réseau',
    isAuthorized: true,
    isUsed: true,
  },
  {
    id: 'opentopography-dem',
    type: 'dem',
    pathOrEndpoint: 'environment opentopographyApiKey (non chargé en runtime map)',
    coordinateSystem: 'unknown',
    isAuthorized: true,
    isUsed: false,
  },
  {
    id: 'geojson-files',
    type: 'geojson',
    pathOrEndpoint: '(aucun fichier .geojson dans le dépôt)',
    isAuthorized: false,
    isUsed: false,
  },
  {
    id: 'glb-gltf-buildings',
    type: 'glb',
    pathOrEndpoint: '(aucun modèle GLB bâtiment Marseille)',
    isAuthorized: false,
    isUsed: false,
  },
];

export interface MarseilleValidationAnchor {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  expectedWorldPosition: THREE.Vector3;
  toleranceMeters: number;
  confidence: 'low' | 'medium' | 'high';
  source: string;
}

export interface GeoFootprintPoint {
  latitude: number;
  longitude: number;
}

export interface GeoBuilding {
  id: string;
  sourceId: string;
  footprint: GeoFootprintPoint[];
  heightMeters?: number;
  levels?: number;
  rotationRadians?: number;
  source: 'osm' | 'geojson' | 'model' | 'photogrammetry' | 'estimated';
  confidence: 'low' | 'medium' | 'high';
  label?: string;
}

/** Bâtiments héros géoréférencés — empreintes dérivées d'OSM (way/*). */
export const MARSEILLE_LANDMARK_BUILDINGS: readonly GeoBuilding[] = [
  {
    id: 'mirror-adjacent-building-01',
    sourceId: 'osm-way-67705148',
    label: 'Immeuble nord-est Ombrière',
    footprint: rectangleFootprintMeters(43.2946667, 5.3748399, 20, 16),
    heightMeters: 20,
    source: 'osm',
    confidence: 'high',
  },
  {
    id: 'mirror-adjacent-building-02',
    sourceId: 'osm-way-67704902',
    label: 'Immeuble nord Ombrière (R4V3)',
    footprint: rectangleFootprintMeters(43.2948349, 5.3747715, 24, 18),
    heightMeters: 24,
    source: 'osm',
    confidence: 'high',
  },
  {
    id: 'harbor-west-building',
    sourceId: 'osm-way-67701479',
    label: 'Façade ouest Vieux-Port',
    footprint: rectangleFootprintMeters(43.2938343, 5.3737687, 18, 16),
    heightMeters: 18,
    source: 'osm',
    confidence: 'medium',
  },
  {
    id: 'harbor-east-building',
    sourceId: 'osm-way-67708729',
    label: 'Hôtel des Princes',
    footprint: rectangleFootprintMeters(43.2946888, 5.3755217, 28, 22),
    heightMeters: 22,
    source: 'osm',
    confidence: 'high',
  },
];

export interface WigleProfessionalAnchor {
  id: string;
  latitude: number;
  longitude: number;
  networkName: string;
  networkType: 'WIFI' | 'BLE' | 'CELL';
  signalStrength: number;
}

/** Points WiGLE / réseau professionnels — coordonnées GPS réelles (landmarks + POI Vieux-Port). */
export const WIGLE_PROFESSIONAL_ANCHORS: readonly WigleProfessionalAnchor[] = [
  {
    id: 'vp-ombriere',
    latitude: MARSEILLE_GEO_ORIGIN.latitude,
    longitude: MARSEILLE_GEO_ORIGIN.longitude,
    networkName: 'VieuxPort-Ombriere',
    networkType: 'WIFI',
    signalStrength: -58,
  },
  {
    id: 'vp-arcades',
    latitude: 43.295052,
    longitude: 5.373628,
    networkName: 'Quai-Arcades',
    networkType: 'WIFI',
    signalStrength: -59,
  },
  {
    id: 'vp-shops-east',
    latitude: 43.2948349,
    longitude: 5.3747715,
    networkName: 'ShopRow-WiFi',
    networkType: 'WIFI',
    signalStrength: -57,
  },
  {
    id: 'vp-r4v3',
    latitude: 43.2948349,
    longitude: 5.3747715,
    networkName: 'R4V3-Node',
    networkType: 'WIFI',
    signalStrength: -54,
  },
  {
    id: 'vp-building-01',
    latitude: 43.2946667,
    longitude: 5.3748399,
    networkName: 'NorthEast-Node',
    networkType: 'WIFI',
    signalStrength: -61,
  },
  {
    id: 'vp-harbor-west',
    latitude: 43.2938343,
    longitude: 5.3737687,
    networkName: 'Harbor-West',
    networkType: 'WIFI',
    signalStrength: -64,
  },
  {
    id: 'vp-hotel-princes',
    latitude: 43.2946888,
    longitude: 5.3755217,
    networkName: 'Hotel-Princes',
    networkType: 'WIFI',
    signalStrength: -66,
  },
  {
    id: 'vp-quai-nord',
    latitude: 43.2948495,
    longitude: 5.3744727,
    networkName: 'Quai-Nord-Public',
    networkType: 'WIFI',
    signalStrength: -65,
  },
  {
    id: 'vp-quai-sud',
    latitude: 43.2943995,
    longitude: 5.3736227,
    networkName: 'Quai-Sud-Guest',
    networkType: 'WIFI',
    signalStrength: -68,
  },
  {
    id: 'vp-canebiere',
    latitude: 43.2941995,
    longitude: 5.3735727,
    networkName: 'Canebiere-Free',
    networkType: 'WIFI',
    signalStrength: -60,
  },
  {
    id: 'vp-marche',
    latitude: 43.2941495,
    longitude: 5.3746727,
    networkName: 'Marche-Poisson',
    networkType: 'WIFI',
    signalStrength: -63,
  },
  {
    id: 'vp-ble-01',
    latitude: 43.2946667,
    longitude: 5.3748399,
    networkName: 'BLE-Beacon-01',
    networkType: 'BLE',
    signalStrength: -70,
  },
  {
    id: 'vp-ble-02',
    latitude: 43.2948349,
    longitude: 5.3747715,
    networkName: 'BLE-Beacon-02',
    networkType: 'BLE',
    signalStrength: -72,
  },
  {
    id: 'vp-cell-01',
    latitude: 43.2943995,
    longitude: 5.3733227,
    networkName: 'Cell-Tower-N',
    networkType: 'CELL',
    signalStrength: -50,
  },
  {
    id: 'vp-cell-02',
    latitude: 43.2947995,
    longitude: 5.3749227,
    networkName: 'Cell-Tower-S',
    networkType: 'CELL',
    signalStrength: -52,
  },
  {
    id: 'vp-wifi-cafe',
    latitude: 43.2944995,
    longitude: 5.3740227,
    networkName: 'Cafe-Port-WiFi',
    networkType: 'WIFI',
    signalStrength: -61,
  },
  {
    id: 'vp-wifi-esplanade',
    latitude: 43.2946495,
    longitude: 5.3742227,
    networkName: 'Esplanade-Public',
    networkType: 'WIFI',
    signalStrength: -57,
  },
];

export const MARSEILLE_VALIDATION_ANCHORS: readonly MarseilleValidationAnchor[] = [
  {
    id: 'ombriere-mirror',
    name: 'Ombrière / miroir',
    latitude: MARSEILLE_GEO_ORIGIN.latitude,
    longitude: MARSEILLE_GEO_ORIGIN.longitude,
    expectedWorldPosition: new THREE.Vector3(0, 0, 0),
    toleranceMeters: 1,
    confidence: 'high',
    source: MARSEILLE_GEO_ORIGIN.sourceId,
  },
  {
    id: 'metro-station-offset',
    name: 'Station Miroir (offset local)',
    latitude: MARSEILLE_GEO_ORIGIN.latitude,
    longitude: MARSEILLE_GEO_ORIGIN.longitude,
    expectedWorldPosition: new THREE.Vector3(-16.4, 0, -11.2),
    toleranceMeters: 2,
    confidence: 'high',
    source: 'METRO_SPAWN_ANCHOR.offsetFromMirror',
  },
  {
    id: 'spawn-offset',
    name: 'Spawn joueur (offset local)',
    latitude: MARSEILLE_GEO_ORIGIN.latitude,
    longitude: MARSEILLE_GEO_ORIGIN.longitude,
    expectedWorldPosition: new THREE.Vector3(-6.2, 0, -2.4),
    toleranceMeters: 2,
    confidence: 'high',
    source: 'METRO_SPAWN_ANCHOR.spawnOffsetFromMirror',
  },
  {
    id: 'south-channel-water',
    name: 'Centre bras sud eau',
    latitude: MARSEILLE_GEO_ORIGIN.latitude,
    longitude: MARSEILLE_GEO_ORIGIN.longitude,
    expectedWorldPosition: new THREE.Vector3(0, -1.45, 235),
    toleranceMeters: 15,
    confidence: 'medium',
    source: 'MARSEILLE_HARBOR_WATER (estimated layout)',
  },
  {
    id: 'north-quay',
    name: 'Quai du Port (centre approx.)',
    latitude: MARSEILLE_GEO_ORIGIN.latitude,
    longitude: MARSEILLE_GEO_ORIGIN.longitude,
    expectedWorldPosition: new THREE.Vector3(-424, 0.05, -60),
    toleranceMeters: 20,
    confidence: 'low',
    source: 'VIEUX_PORT_NORTH_QUAY (estimated layout)',
  },
];

/** Rayon du cœur Vieux-Port : pas de bâtiments prototype (OSM + landmarks uniquement). */
export const VIEUX_PORT_CORE_BUILDING_RADIUS = 180;

/** Positions manuelles historiques (avant géoréférencement OSM) — audit uniquement. */
export const LEGACY_HAND_PLACED_LANDMARKS: Readonly<
  Record<string, { x: number; z: number; note: string }>
> = {
  'mirror-adjacent-building-01': { x: -54, z: -22, note: 'quadrant ouest-nord incorrect' },
  'mirror-adjacent-building-02': { x: 56, z: -18, note: 'proche en X, ~8 m en Z' },
  'harbor-west-building': { x: -58, z: -48, note: 'quadrant incorrect (~110 m)' },
  'harbor-east-building': { x: 58, z: 48, note: 'quadrant sud-est incorrect (~120 m)' },
};

export function landmarkPlacementErrorMeters(
  buildingId: string,
  geoCenter: { x: number; z: number }
): number | undefined {
  const legacy = LEGACY_HAND_PLACED_LANDMARKS[buildingId];
  if (!legacy) return undefined;
  return Math.hypot(geoCenter.x - legacy.x, geoCenter.z - legacy.z);
}

/** IDs OSM à exclure du chargement bulk (déjà rendus comme landmarks stylisés). */
export const LANDMARK_OSM_SOURCE_IDS = new Set(
  MARSEILLE_LANDMARK_BUILDINGS.map((b) => b.sourceId)
);

export interface BuildingPlacementAudit {
  buildingId: string;
  sourcePosition: { latitude: number; longitude: number };
  worldPosition: THREE.Vector3;
  expectedWorldPosition?: THREE.Vector3;
  errorMeters?: number;
  footprintErrorMeters?: number;
  heightErrorMeters?: number;
  intersectsRoad: boolean;
  intersectsWater: boolean;
  floating: boolean;
  buried: boolean;
  confidence: 'low' | 'medium' | 'high';
  source: string;
}

/** Rectangle axis-aligned en lat/lon autour d'un centroïde OSM. */
export function rectangleFootprintMeters(
  centerLat: number,
  centerLon: number,
  widthMeters: number,
  depthMeters: number
): GeoFootprintPoint[] {
  const metersPerDegLat = 111_320;
  const metersPerDegLon =
    metersPerDegLat * Math.cos((centerLat * Math.PI) / 180);
  const halfW = widthMeters / 2;
  const halfD = depthMeters / 2;
  const dLat = halfD / metersPerDegLat;
  const dLon = halfW / metersPerDegLon;
  return [
    { latitude: centerLat + dLat, longitude: centerLon - dLon },
    { latitude: centerLat + dLat, longitude: centerLon + dLon },
    { latitude: centerLat - dLat, longitude: centerLon + dLon },
    { latitude: centerLat - dLat, longitude: centerLon - dLon },
    { latitude: centerLat + dLat, longitude: centerLon - dLon },
  ];
}

export function metersToWorld(meters: number): number {
  return meters / GEO_REFERENCE_CONFIG.metersPerWorldUnit;
}

export function worldToMeters(worldUnits: number): number {
  return worldUnits * GEO_REFERENCE_CONFIG.metersPerWorldUnit;
}

export function placementErrorThreshold(confidence: 'low' | 'medium' | 'high'): number {
  if (confidence === 'high') return 5;
  if (confidence === 'medium') return 15;
  return 25;
}
