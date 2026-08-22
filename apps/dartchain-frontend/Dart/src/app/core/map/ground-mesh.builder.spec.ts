import { beforeEach, describe, expect, it } from 'vitest';
import * as THREE from 'three';

import type { GeoCoordinateService } from './geo-coordinate.service';
import {
  appendOsmStreetPolygons,
  buildCityGroundMeshes,
  highwayWidthMeters,
  osmWayToPolygonDefs,
} from './ground-mesh.builder';
import type { GroundMaterialSet } from './ground-material.factory';
import {
  VIEUX_PORT_CROSSWALKS,
  VIEUX_PORT_GROUND_CORRIDORS,
  VIEUX_PORT_GROUND_PLATES,
} from './ground-layout.data';

function stubGroundMaterials(): GroundMaterialSet {
  return {
    road: new THREE.MeshStandardMaterial({ color: 0x333333 }),
    sidewalk: new THREE.MeshStandardMaterial({ color: 0xaaaaaa }),
    curb: new THREE.MeshStandardMaterial({ color: 0x888888 }),
    gutter: new THREE.MeshStandardMaterial({ color: 0x222222 }),
    esplanade: new THREE.MeshStandardMaterial({ color: 0xcccccc }),
    quay: new THREE.MeshPhysicalMaterial({ color: 0xaaaaaa }),
    contactShadow: new THREE.MeshBasicMaterial({ color: 0x000000 }),
    centerLine: new THREE.MeshBasicMaterial({ color: 0xffff00 }),
    laneGlow: new THREE.MeshBasicMaterial({ color: 0x00ffff }),
    crosswalkStripe: new THREE.MeshStandardMaterial({ color: 0xffffff }),
  };
}

function stubGeo(): GeoCoordinateService {
  const origin = { latitude: 43.2945995, longitude: 5.3741227, altitude: 0 };
  return {
    geoToWorld(latitude: number, longitude: number, altitude = 0) {
      const dLat = latitude - origin.latitude;
      const dLon = longitude - origin.longitude;
      const metersLon = 111_320 * Math.cos((origin.latitude * Math.PI) / 180);
      return new THREE.Vector3(dLon * metersLon, altitude, -dLat * 111_320);
    },
  } as GeoCoordinateService;
}

describe('ground-mesh.builder (Phase 1)', () => {
  it('construit route + trottoirs + esplanade', () => {
    const materials = stubGroundMaterials();
    const built = buildCityGroundMeshes(
      VIEUX_PORT_GROUND_CORRIDORS,
      VIEUX_PORT_GROUND_PLATES,
      VIEUX_PORT_CROSSWALKS,
      materials
    );

    expect(built.group.name).toBe('marseille-city-ground');
    const names = built.group.children.map((c) => c.name);
    expect(names.some((n) => n.includes('ground-road-canebiere'))).toBe(true);
    expect(names.some((n) => n.includes('ground-sidewalk-canebiere'))).toBe(true);
    expect(names.some((n) => n.includes('ground-plate-ombriere-esplanade'))).toBe(true);
    expect(names.some((n) => n.includes('ground-plate-quai-belges-walk'))).toBe(true);
    expect(built.geometries.length).toBeGreaterThan(10);

    for (const geo of built.geometries) geo.dispose();
    for (const mat of built.materials) mat.dispose();
  });

  it('assigne des largeurs cohérentes par type highway', () => {
    expect(highwayWidthMeters('primary').road).toBeGreaterThan(highwayWidthMeters('residential').road);
    expect(highwayWidthMeters('footway').sidewalk).toBeGreaterThan(0);
  });

  it('ajoute des polygones OSM bufferisés', () => {
    const geo = stubGeo();
    const materials = stubGroundMaterials();
    const group = new THREE.Group();
    const geometries: THREE.BufferGeometry[] = [];

    const polygons = osmWayToPolygonDefs(
      'osm-highway-test',
      [
        { latitude: 43.2946, longitude: 5.3741 },
        { latitude: 43.2948, longitude: 5.3745 },
      ],
      'residential',
      geo
    );
    expect(polygons.length).toBe(1);
    expect(polygons[0].ring.length).toBeGreaterThanOrEqual(4);

    const added = appendOsmStreetPolygons(group, polygons, materials, geometries, 10);
    expect(added).toBe(1);
    expect(group.children[0]?.name).toContain('ground-osm-poly');

    for (const geoMesh of geometries) geoMesh.dispose();
    for (const mat of Object.values(materials)) mat.dispose();
  });
});
