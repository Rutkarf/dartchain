/**
 * Cycle 3 — point d'entrée WiGLE geo-mapping pour le métavers Three.js.
 * Alias vers les services et managers du module wigle/.
 */
export { WigleVisualizationService as WigleIntegrationService } from './wigle-visualization.service';
export { WigleGeoService as WigleService } from './wigle-geo.service';
export { GeoMappingService } from './geo-mapping.service';
export { WigleBuildingManager, createBuildingFromWigle } from './wigle-building.manager';
export { WigleOsmFootprintManager } from './wigle-osm-footprint.manager';
export { WaveEffectSystem, WaveEffectPool, createWaveEffect } from './wave-effects';
export { WigleApiService } from './wigle-api.service';
export type { WigleGeoPoint, WaveEffectType } from './wigle-point.types';
