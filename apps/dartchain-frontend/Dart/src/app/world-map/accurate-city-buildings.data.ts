import {
  MARSEILLE_GEO_ORIGIN,
  rectangleFootprintMeters,
  type GeoBuilding,
} from './geo-reference.config';

/**
 * Massing géoréférencé Vieux-Port / Canebière.
 * Aligné Google Earth + OSM :
 * - Origine = Ombrière (43.2945995, 5.3741227)
 * - Canebière ~62° depuis le nord (NE), débouché Quai des Belges
 * - Quai du Port au nord du bassin (−Z monde), Rive Neuve au sud (+Z relatif bassin)
 * Nord monde = −Z, Est = +X.
 */
const METERS_PER_DEG_LAT = 111_320;

/** Débouché Canebière sur le Quai des Belges (est de l’Ombrière). */
export const CANEBIERE_MOUTH = { lat: 43.29512, lon: 5.37528 } as const;
/** Bearing réel Canebière (vers Noailles / Réformés), degrés depuis le nord vers l’est. */
export const CANEBIERE_BEARING_DEG = 62.3;
const CANEBIERE_BEARING_RAD = (CANEBIERE_BEARING_DEG * Math.PI) / 180;

const ALONG_EAST = Math.sin(CANEBIERE_BEARING_RAD);
const ALONG_NORTH = Math.cos(CANEBIERE_BEARING_RAD);
/** Perpendiculaire droite (SE de l’axe). */
const PERP_EAST = Math.cos(CANEBIERE_BEARING_RAD);
const PERP_NORTH = -Math.sin(CANEBIERE_BEARING_RAD);

export function offsetLatLon(
  lat: number,
  lon: number,
  eastMeters: number,
  northMeters: number
): { lat: number; lon: number } {
  const metersPerDegLon = METERS_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
  return {
    lat: lat + northMeters / METERS_PER_DEG_LAT,
    lon: lon + eastMeters / metersPerDegLon,
  };
}

export function pointAlongCanebiere(
  alongMeters: number,
  sideMeters: number
): { lat: number; lon: number } {
  const east = alongMeters * ALONG_EAST + sideMeters * PERP_EAST;
  const north = alongMeters * ALONG_NORTH + sideMeters * PERP_NORTH;
  return offsetLatLon(CANEBIERE_MOUTH.lat, CANEBIERE_MOUTH.lon, east, north);
}

export function makeGeoBlock(
  id: string,
  lat: number,
  lon: number,
  widthM: number,
  depthM: number,
  heightM: number,
  levels = Math.max(3, Math.round(heightM / 3.1))
): GeoBuilding {
  return {
    id,
    sourceId: `geo-${id}`,
    label: id,
    footprint: rectangleFootprintMeters(lat, lon, widthM, depthM),
    heightMeters: heightM,
    levels,
    source: 'osm',
    confidence: 'medium',
  };
}

/** Îlots Canebière — façades des deux côtés, hors chaussée (~28–50 m du centre). */
function buildCanebiereBlocks(alongStart: number, alongEnd: number, step = 16): GeoBuilding[] {
  const blocks: GeoBuilding[] = [];
  let i = 0;
  for (let along = alongStart; along <= alongEnd; along += step) {
    for (const side of [-1, 1] as const) {
      for (const row of [0, 1] as const) {
        const sideDist = side * (26 + row * 20);
        const p = pointAlongCanebiere(along + ((i % 5) - 2) * 0.35, sideDist);
        const width = 11 + (i % 5) * 1.7;
        const depth = 13 + (i % 4) * 2.0;
        const height = 12 + (i % 7) * 2.3;
        blocks.push(
          makeGeoBlock(
            `canebiere-${side > 0 ? 'se' : 'nw'}-r${row}-${Math.round(along)}-${i}`,
            p.lat,
            p.lon,
            width,
            depth,
            height
          )
        );
        i++;
      }
    }
  }
  return blocks;
}

/**
 * Quai du Port — rive nord du bassin (bâtiments côté terre, nord de la ligne de quai).
 * GPS typiques ~43.2954–43.2959, lon 5.369→5.374.
 */
function buildQuaiDuPortBlocks(): GeoBuilding[] {
  const blocks: GeoBuilding[] = [];
  const start = { lat: 43.29555, lon: 5.37385 };
  for (let i = 0; i < 28; i++) {
    // Vers l’ouest le long du quai (−est), légèrement au nord (terre).
    const p = offsetLatLon(start.lat, start.lon, -i * 22 - 8, 14 + (i % 3) * 5);
    blocks.push(
      makeGeoBlock(
        `quai-port-${i}`,
        p.lat,
        p.lon,
        15 + (i % 4) * 2,
        11 + (i % 3) * 2,
        14 + (i % 6) * 2.2
      )
    );
  }
  return blocks;
}

/**
 * Quai de Rive Neuve — rive sud (bâtiments au sud de la ligne de quai).
 * GPS typiques ~43.2932–43.2937.
 */
function buildRiveNeuveBlocks(): GeoBuilding[] {
  const blocks: GeoBuilding[] = [];
  const start = { lat: 43.29355, lon: 5.3737 };
  for (let i = 0; i < 26; i++) {
    const p = offsetLatLon(start.lat, start.lon, -i * 24 - 10, -12 - (i % 3) * 4);
    blocks.push(
      makeGeoBlock(
        `rive-neuve-${i}`,
        p.lat,
        p.lon,
        14 + (i % 4) * 2,
        12 + (i % 3) * 2,
        13 + (i % 5) * 2.4
      )
    );
  }
  return blocks;
}

/** Façades est du Quai de la Fraternité / Belges (immeubles face port, est du miroir). */
function buildFraterniteBlocks(): GeoBuilding[] {
  const blocks: GeoBuilding[] = [];
  // Nord-est immédiat du miroir (côté Canebière / rue).
  for (let i = 0; i < 10; i++) {
    const p = offsetLatLon(
      MARSEILLE_GEO_ORIGIN.latitude,
      MARSEILLE_GEO_ORIGIN.longitude,
      38 + (i % 5) * 18,
      28 + Math.floor(i / 5) * 22
    );
    blocks.push(makeGeoBlock(`fraternite-ne-${i}`, p.lat, p.lon, 14, 16, 18 + (i % 4) * 3));
  }
  // Sud-est (vers Rive Neuve / Cours Honoré d’Estienne d’Orves).
  for (let i = 0; i < 8; i++) {
    const p = offsetLatLon(
      MARSEILLE_GEO_ORIGIN.latitude,
      MARSEILLE_GEO_ORIGIN.longitude,
      42 + (i % 4) * 18,
      -24 - Math.floor(i / 4) * 20
    );
    blocks.push(makeGeoBlock(`fraternite-se-${i}`, p.lat, p.lon, 13, 15, 16 + (i % 3) * 3));
  }
  return blocks;
}

/** Le Panier — nord / nord-ouest de l’Ombrière. */
function buildPanierBlocks(): GeoBuilding[] {
  const blocks: GeoBuilding[] = [];
  for (let i = 0; i < 24; i++) {
    const col = i % 6;
    const row = Math.floor(i / 6);
    const p = offsetLatLon(43.2954, 5.3739, (col - 2.5) * 18 - 30, 55 + row * 22);
    blocks.push(makeGeoBlock(`panier-${i}`, p.lat, p.lon, 12, 14, 15 + (i % 5) * 2.5));
  }
  return blocks;
}

/** Catalogue initial autour du spawn (≤ ~450 m Canebière + quais). */
export const ACCURATE_CITY_BUILDINGS: readonly GeoBuilding[] = Object.freeze([
  ...buildCanebiereBlocks(20, 380, 16),
  ...buildQuaiDuPortBlocks(),
  ...buildRiveNeuveBlocks(),
  ...buildFraterniteBlocks(),
  ...buildPanierBlocks(),
]);

export const ACCURATE_CITY_BUILDING_MIN_COUNT = 100;

/**
 * Génère des îlots Canebière au-delà de la zone déjà chargée (streaming joueur).
 * `alongMin`/`alongMax` en mètres depuis CANEBIERE_MOUTH.
 */
export function generateCanebiereSegment(
  alongMin: number,
  alongMax: number,
  step = 18
): GeoBuilding[] {
  return buildCanebiereBlocks(alongMin, alongMax, step);
}

/**
 * Estime la distance le long de la Canebière (m) pour un point monde (x, z).
 * Nord = −Z, Est = +X.
 */
export function worldToCanebiereAlong(worldX: number, worldZ: number): number {
  const mouthEast =
    (CANEBIERE_MOUTH.lon - MARSEILLE_GEO_ORIGIN.longitude) *
    METERS_PER_DEG_LAT *
    Math.cos((MARSEILLE_GEO_ORIGIN.latitude * Math.PI) / 180);
  const mouthNorth =
    (CANEBIERE_MOUTH.lat - MARSEILLE_GEO_ORIGIN.latitude) * METERS_PER_DEG_LAT;
  // Monde : x = east, z = −north
  const relEast = worldX - mouthEast;
  const relNorth = -worldZ - mouthNorth;
  return relEast * ALONG_EAST + relNorth * ALONG_NORTH;
}
