import * as THREE from 'three';

import { MARSEILLE_HARBOR_WATER } from './map-configuration';

/** Trou rectangulaire (sens horaire — requis pour Shape.holes). */
function rectHolePath(minX: number, minZ: number, maxX: number, maxZ: number): THREE.Path {
  const path = new THREE.Path();
  path.moveTo(minX, minZ);
  path.lineTo(minX, maxZ);
  path.lineTo(maxX, maxZ);
  path.lineTo(maxX, minZ);
  path.lineTo(minX, minZ);
  return path;
}

/**
 * Terrain plat avec découpes bassin + bras sud — laisse voir l'eau (y négatif) depuis l'esplanade.
 * Coordonnées shape = monde X/Z (mesh.position.y = 0, rotation.x = −π/2).
 */
export function buildPrototypeTerrainGeometry(
  terrainWidth: number,
  harbor: typeof MARSEILLE_HARBOR_WATER = MARSEILLE_HARBOR_WATER
): THREE.BufferGeometry {
  const halfW = terrainWidth * 0.5;
  const minZ = harbor.landMinZ;
  const maxZ = harbor.landMaxZ;

  const shape = new THREE.Shape();
  shape.moveTo(-halfW, minZ);
  shape.lineTo(halfW, minZ);
  shape.lineTo(halfW, maxZ);
  shape.lineTo(-halfW, maxZ);
  shape.lineTo(-halfW, minZ);

  const basinMinX = Math.max(harbor.basinMinX, -halfW);
  const basinMaxX = Math.min(harbor.basinMaxX, halfW);
  if (basinMaxX > basinMinX + 4) {
    shape.holes.push(
      rectHolePath(basinMinX, harbor.basinMinZ, basinMaxX, harbor.basinMaxZ)
    );
  }

  if (maxZ > harbor.waterMinZ + 0.5) {
    shape.holes.push(rectHolePath(-102, harbor.waterMinZ, 102, maxZ));
  }

  const geometry = new THREE.ShapeGeometry(shape, 12);
  geometry.computeVertexNormals();
  return geometry;
}
