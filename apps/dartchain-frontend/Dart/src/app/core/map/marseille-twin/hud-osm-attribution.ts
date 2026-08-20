import { OSM_ODBL_ATTRIBUTION } from './osm-attribution';

/** Ligne courte pour panneaux exclusifs three-floor (pas le HUD principal). */
export function osmAttributionLine(): string {
  return `${OSM_ODBL_ATTRIBUTION.text} · ${OSM_ODBL_ATTRIBUTION.licence}`;
}
