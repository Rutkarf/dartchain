/** Phase 4 — chemins assets cadastre / GeoJSON (servis depuis `public/`). */
export const VIEUX_PORT_GEOJSON_PATHS = {
  buildings: '/geo/vieux-port/buildings.geojson',
  parcels: '/geo/vieux-port/parcels.geojson',
  streets: '/geo/vieux-port/streets.geojson',
  water: '/geo/vieux-port/water.geojson',
} as const;

export const CADASTRAL_BUILDING_SOURCE = 'geojson' as const;

/** IDs cadastre — priorité sur OSM bulk / streaming. */
export const CADASTRAL_PRIORITY_CONFIDENCE = ['high', 'medium'] as const;
