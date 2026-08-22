#!/usr/bin/env node
/**
 * Phase 4 — génère public/geo/vieux-port/buildings.geojson depuis geo-source/.
 * Usage: node scripts/build-marseille-geojson.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const sourcePath = join(root, 'geo-source/vieux-port-cadastre.source.json');
const outDir = join(root, 'public/geo/vieux-port');
const outPath = join(outDir, 'buildings.geojson');

const METERS_PER_DEG_LAT = 111_320;

function offsetLatLon(lat, lon, eastMeters, northMeters) {
  const metersPerDegLon = METERS_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
  return {
    lat: lat + northMeters / METERS_PER_DEG_LAT,
    lon: lon + eastMeters / metersPerDegLon,
  };
}

function rectangleRing(lat, lon, widthM, depthM) {
  const halfW = widthM / 2;
  const halfD = depthM / 2;
  const nw = offsetLatLon(lat, lon, -halfW, halfD);
  const ne = offsetLatLon(lat, lon, halfW, halfD);
  const se = offsetLatLon(lat, lon, halfW, -halfD);
  const sw = offsetLatLon(lat, lon, -halfW, -halfD);
  return [
    [nw.lon, nw.lat],
    [ne.lon, ne.lat],
    [se.lon, se.lat],
    [sw.lon, sw.lat],
    [nw.lon, nw.lat],
  ];
}

function landmarkFeature(def) {
  const ring = def.ring.map(([lat, lon]) => [lon, lat]);
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first && last && (first[0] !== last[0] || first[1] !== last[1])) {
    ring.push([first[0], first[1]]);
  }
  return {
    type: 'Feature',
    id: def.id,
    properties: {
      id: def.id,
      sourceId: def.sourceId,
      label: def.label,
      heightMeters: def.heightMeters,
      levels: def.levels,
      confidence: def.confidence ?? 'high',
      source: 'geojson',
      heightSource: 'hardcoded',
      building: 'yes',
    },
    geometry: { type: 'Polygon', coordinates: [ring] },
  };
}

function blockFeature(def) {
  return {
    type: 'Feature',
    id: def.id,
    properties: {
      id: def.id,
      sourceId: def.sourceId ?? `cadastre-${def.id}`,
      label: def.label ?? def.id,
      heightMeters: def.heightM,
      levels: def.levels,
      confidence: 'medium',
      source: 'geojson',
      heightSource: 'levels',
      building: 'yes',
    },
    geometry: {
      type: 'Polygon',
      coordinates: [rectangleRing(def.lat, def.lon, def.widthM, def.depthM)],
    },
  };
}

const source = JSON.parse(readFileSync(sourcePath, 'utf8'));
const features = [
  ...(source.landmarks ?? []).map(landmarkFeature),
  ...(source.spawnBlocks ?? []).map(blockFeature),
];

const collection = {
  type: 'FeatureCollection',
  metadata: {
    source: 'vieux-port-cadastre-derived',
    license: 'ODbL (empreintes OSM way) + projet (parcelles spawn)',
    generated: new Date().toISOString().slice(0, 10),
    phase: '4',
  },
  features,
};

mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, `${JSON.stringify(collection, null, 2)}\n`, 'utf8');
console.info('[build-marseille-geojson] Écrit', outPath, '—', features.length, 'features');
