import { describe, expect, it } from 'vitest';
import * as THREE from 'three';

import {
  createBoxBuildingFromGeoData,
  createGeoBuildingMesh,
  ensureExtrudeShapeWinding,
  extrudeFootprintGeometry,
} from './geo-building.util';

describe('geo-building massing Phase 3', () => {
  const squareFootprint = [
    { latitude: 43.296, longitude: 5.374 },
    { latitude: 43.296, longitude: 5.375 },
    { latitude: 43.295, longitude: 5.375 },
    { latitude: 43.295, longitude: 5.374 },
    { latitude: 43.296, longitude: 5.374 },
  ];

  const stubGeo = {
    geoToWorld(lat: number, lon: number, alt = 0) {
      return new THREE.Vector3((lon - 5.374) * 80_000, alt, -(lat - 43.2955) * 111_000);
    },
  };

  const building = {
    id: 'test-building',
    sourceId: 'test',
    footprint: squareFootprint,
    heightMeters: 18,
    source: 'estimated' as const,
    confidence: 'medium' as const,
  };

  it('extrude avec hauteur positive (repère sol y=0)', () => {
    const shape = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(12, 0),
      new THREE.Vector2(12, 8),
      new THREE.Vector2(0, 8),
    ];
    const geometry = extrudeFootprintGeometry(ensureExtrudeShapeWinding(shape), 18);
    expect(geometry).not.toBeNull();
    geometry!.computeBoundingBox();
    expect(geometry!.boundingBox!.min.y).toBeGreaterThanOrEqual(-0.05);
    expect(geometry!.boundingBox!.max.y).toBeGreaterThan(15);
    geometry!.dispose();
  });

  it('extrude batiment GPS > box AABB en volume utile', () => {
    const wall = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const extrude = createGeoBuildingMesh(building, stubGeo as never, { wall }, { massing: 'extrude' });
    const box = createBoxBuildingFromGeoData(building, stubGeo as never, { wall });
    expect(extrude).not.toBeNull();
    expect(box).not.toBeNull();
    const extrudeBox = new THREE.Box3().setFromObject(extrude!.group);
    const aabbBox = new THREE.Box3().setFromObject(box!.group);
    expect(extrudeBox.max.y - extrudeBox.min.y).toBeGreaterThan(15);
    expect(aabbBox.max.y - aabbBox.min.y).toBeGreaterThan(15);
    extrude!.group.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh && mesh.geometry) mesh.geometry.dispose();
    });
    box!.group.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh && mesh.geometry) mesh.geometry.dispose();
    });
    wall.dispose();
  });

  it('tier cadastre ajoute socle et corniche', () => {
    const wall = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const roof = new THREE.MeshStandardMaterial({ color: 0xeeeeee, side: THREE.DoubleSide });
    const built = createGeoBuildingMesh(
      building,
      stubGeo as never,
      { wall, roof },
      { massing: 'extrude', visualTier: 'cadastre' }
    );
    expect(built).not.toBeNull();
    const childNames = built!.group.children.map((c) => c.name);
    expect(childNames.some((n) => n.endsWith('-plinth'))).toBe(true);
    expect(childNames.some((n) => n.endsWith('-cornice'))).toBe(true);
    expect(childNames.some((n) => n.endsWith('-parapet'))).toBe(true);
    expect(built!.group.userData['visualTier']).toBe('cadastre');
    built!.group.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh && mesh.geometry) mesh.geometry.dispose();
    });
    wall.dispose();
    roof.dispose();
  });
});
