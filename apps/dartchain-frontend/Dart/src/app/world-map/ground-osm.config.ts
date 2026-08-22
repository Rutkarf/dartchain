import { MARSEILLE_GEO_ORIGIN, VIEUX_PORT_CORE_BUILDING_RADIUS } from './geo-reference.config';
import {
  METERS_PER_DEGREE_LATITUDE,
  metersPerDegreeLongitude,
} from './geo-projection.constants';

/** Bbox Overpass routes — rayon cœur Vieux-Port (~420 m autour de l'Ombrière). */
export const VIEUX_PORT_OSM_STREET_BOUNDS = (() => {
  const lat = MARSEILLE_GEO_ORIGIN.latitude;
  const lon = MARSEILLE_GEO_ORIGIN.longitude;
  const radius = VIEUX_PORT_CORE_BUILDING_RADIUS;
  const dLat = radius / METERS_PER_DEGREE_LATITUDE;
  const dLon = radius / metersPerDegreeLongitude(lat);
  return {
    south: lat - dLat,
    north: lat + dLat,
    west: lon - dLon,
    east: lon + dLon,
  } as const;
})();

/** Cap soft de polygones route/trottoir OSM rendus en Phase 1.5. */
export const OSM_STREET_POLYGON_CAP = 600;

/** Longueur minimale d'un way OSM pour être rendu (m). */
export const OSM_STREET_MIN_WAY_LENGTH_M = 3;

/** Demi-largeur max miter (évite pics aux angles aigus). */
export const OSM_STREET_MITER_LIMIT = 3.5;
