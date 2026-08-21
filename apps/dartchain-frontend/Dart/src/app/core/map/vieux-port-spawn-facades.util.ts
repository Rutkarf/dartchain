import * as THREE from 'three';

import type { GeoCoordinateService } from './geo-coordinate.service';
import { rectangleFootprintMeters } from './geo-reference.config';

/** Façades héros visibles depuis le spawn — démarchage B2B Vieux-Port. */
export const VIEUX_PORT_SPAWN_FACADES = {
  /** Quai du Port — arcades (gauche du spawn, face à l'esplanade). OSM zone ~43.29505/5.37365. */
  arcadesWest: {
    id: 'vieux-port-arcades-west',
    centerLat: 43.295052,
    centerLon: 5.373628,
    widthMeters: 38,
    depthMeters: 16,
    heightMeters: 22,
    facadeFacesSouth: true,
    confidence: 'medium' as const,
    source: 'osm-quai-du-port-estimated',
  },
  /** Immeuble nord-est — rangée boutiques RDC (droite du spawn). OSM way/67704902. */
  shopsEast: {
    id: 'vieux-port-shops-east',
    centerLat: 43.2948349,
    centerLon: 5.3747715,
    widthMeters: 26,
    depthMeters: 18,
    heightMeters: 20,
    facadeFacesSouth: true,
    confidence: 'high' as const,
    source: 'osm-way-67704902',
  },
} as const;

export interface SpawnFacadeBuildResult {
  group: THREE.Group;
  collider: { minX: number; maxX: number; minZ: number; maxZ: number };
}

export function buildVieuxPortSpawnFacades(
  geo: GeoCoordinateService,
  registerGeometry: (g: THREE.BufferGeometry) => void,
  registerMaterial: (m: THREE.Material) => void
): SpawnFacadeBuildResult[] {
  const results: SpawnFacadeBuildResult[] = [];
  results.push(buildArcadeBuilding(geo, registerGeometry, registerMaterial));
  results.push(buildShopRowBuilding(geo, registerGeometry, registerMaterial));
  return results;
}

function buildArcadeBuilding(
  geo: GeoCoordinateService,
  registerGeometry: (g: THREE.BufferGeometry) => void,
  registerMaterial: (m: THREE.Material) => void
): SpawnFacadeBuildResult {
  const spec = VIEUX_PORT_SPAWN_FACADES.arcadesWest;
  const footprint = rectangleFootprintMeters(
    spec.centerLat,
    spec.centerLon,
    spec.widthMeters,
    spec.depthMeters
  );
  const center = geo.geoToWorld(spec.centerLat, spec.centerLon, 0);
  const group = new THREE.Group();
  group.name = spec.id;
  group.userData = { source: spec.source, confidence: spec.confidence };

  const stoneMaterial = new THREE.MeshStandardMaterial({
    color: 0xd4c4a8,
    roughness: 0.82,
    metalness: 0.06,
  });
  const upperMaterial = new THREE.MeshStandardMaterial({
    color: 0xe8dcc8,
    roughness: 0.75,
    metalness: 0.04,
  });
  const archMaterial = new THREE.MeshStandardMaterial({
    color: 0xf5efe3,
    emissive: 0x2a2218,
    emissiveIntensity: 0.15,
    roughness: 0.55,
    metalness: 0.08,
  });
  registerMaterial(stoneMaterial);
  registerMaterial(upperMaterial);
  registerMaterial(archMaterial);

  const w = spec.widthMeters;
  const d = spec.depthMeters;
  const h = spec.heightMeters;
  const arcadeH = 4.2;

  const baseGeo = new THREE.BoxGeometry(w, arcadeH, d);
  registerGeometry(baseGeo);
  const base = new THREE.Mesh(baseGeo, stoneMaterial);
  base.position.set(center.x, arcadeH / 2, center.z);
  group.add(base);

  const upperGeo = new THREE.BoxGeometry(w * 0.96, h - arcadeH - 1.2, d * 0.92);
  registerGeometry(upperGeo);
  const upper = new THREE.Mesh(upperGeo, upperMaterial);
  upper.position.set(center.x, arcadeH + (h - arcadeH - 1.2) / 2 + 0.2, center.z);
  group.add(upper);

  const archCount = 9;
  const archSpacing = w / (archCount + 1);
  const archGeo = new THREE.CylinderGeometry(1.05, 1.05, 3.6, 12, 1, false, 0, Math.PI);
  registerGeometry(archGeo);
  for (let i = 0; i < archCount; i++) {
    const ax = center.x - w / 2 + archSpacing * (i + 1);
    const az = center.z + d / 2 - 0.35;
    const colGeo = new THREE.BoxGeometry(0.55, arcadeH, 0.55);
    registerGeometry(colGeo);
    const col = new THREE.Mesh(colGeo, archMaterial);
    col.position.set(ax, arcadeH / 2, az);
    group.add(col);

    const arch = new THREE.Mesh(archGeo, archMaterial);
    arch.rotation.y = Math.PI;
    arch.rotation.z = Math.PI / 2;
    arch.position.set(ax, 2.8, az - 0.55);
    group.add(arch);
  }

  const roofGeo = new THREE.BoxGeometry(w * 0.98, 0.65, d * 0.94);
  registerGeometry(roofGeo);
  const roof = new THREE.Mesh(roofGeo, upperMaterial);
  roof.position.set(center.x, h - 0.35, center.z);
  group.add(roof);

  addNeonTrim(group, center, w, d, h, registerGeometry, registerMaterial);

  return {
    group,
    collider: {
      minX: center.x - w / 2,
      maxX: center.x + w / 2,
      minZ: center.z - d / 2,
      maxZ: center.z + d / 2,
    },
  };
}

/** Fine bande lumineuse en corniche — signal cyberpunk sans surcharge. */
function addNeonTrim(
  group: THREE.Group,
  center: { x: number; y: number; z: number },
  width: number,
  depth: number,
  height: number,
  registerGeometry: (g: THREE.BufferGeometry) => void,
  registerMaterial: (m: THREE.Material) => void
): void {
  const neonMat = new THREE.MeshBasicMaterial({
    color: 0x40e0ff,
    transparent: true,
    opacity: 0.85,
  });
  registerMaterial(neonMat);

  const stripH = 0.12;
  const y = height - 1.05;
  const frontGeo = new THREE.BoxGeometry(width * 0.94, stripH, 0.08);
  registerGeometry(frontGeo);
  const front = new THREE.Mesh(frontGeo, neonMat);
  front.position.set(center.x, y, center.z + depth / 2 + 0.04);
  group.add(front);

  const sideGeo = new THREE.BoxGeometry(0.08, stripH, depth * 0.9);
  registerGeometry(sideGeo);
  for (const side of [-1, 1] as const) {
    const strip = new THREE.Mesh(sideGeo, neonMat);
    strip.position.set(center.x + side * (width / 2 + 0.02), y, center.z);
    group.add(strip);
  }
}

function buildShopRowBuilding(
  geo: GeoCoordinateService,
  registerGeometry: (g: THREE.BufferGeometry) => void,
  registerMaterial: (m: THREE.Material) => void
): SpawnFacadeBuildResult {
  const spec = VIEUX_PORT_SPAWN_FACADES.shopsEast;
  const center = geo.geoToWorld(spec.centerLat, spec.centerLon, 0);
  const group = new THREE.Group();
  group.name = spec.id;
  group.userData = { source: spec.source, confidence: spec.confidence };

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0xc9b59a,
    roughness: 0.78,
    metalness: 0.05,
  });
  const shopColors = [0xb8a888, 0xc4b49a, 0xa89878, 0xd0c0a4, 0xbcac8c];
  registerMaterial(bodyMaterial);

  const w = spec.widthMeters;
  const d = spec.depthMeters;
  const h = spec.heightMeters;

  const bodyGeo = new THREE.BoxGeometry(w, h, d);
  registerGeometry(bodyGeo);
  const body = new THREE.Mesh(bodyGeo, bodyMaterial);
  body.position.set(center.x, h / 2, center.z);
  group.add(body);

  const shopCount = 5;
  const bayW = w / shopCount;
  for (let i = 0; i < shopCount; i++) {
    const sx = center.x - w / 2 + bayW * (i + 0.5);
    const sz = center.z + d / 2 + 0.08;

    const winMat = new THREE.MeshStandardMaterial({
      color: shopColors[i % shopColors.length],
      roughness: 0.55,
      metalness: 0.12,
    });
    registerMaterial(winMat);
    const winGeo = new THREE.PlaneGeometry(bayW * 0.72, 2.8);
    registerGeometry(winGeo);
    const win = new THREE.Mesh(winGeo, winMat);
    win.position.set(sx, 2.1, sz);
    group.add(win);

    const awningMat = new THREE.MeshStandardMaterial({
      color: 0x4a4038,
      roughness: 0.7,
      metalness: 0.08,
      side: THREE.DoubleSide,
    });
    registerMaterial(awningMat);
    const awningGeo = new THREE.PlaneGeometry(bayW * 0.82, 1.4);
    registerGeometry(awningGeo);
    const awning = new THREE.Mesh(awningGeo, awningMat);
    awning.position.set(sx, 3.65, sz + 0.55);
    awning.rotation.x = -0.42;
    group.add(awning);
  }

  return {
    group,
    collider: {
      minX: center.x - w / 2,
      maxX: center.x + w / 2,
      minZ: center.z - d / 2,
      maxZ: center.z + d / 2,
    },
  };
}
