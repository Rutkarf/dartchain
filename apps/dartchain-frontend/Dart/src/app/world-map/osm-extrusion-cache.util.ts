import * as THREE from 'three';
import { ShapeUtils } from 'three';

export interface ExtrudedFootprintResult {
  geometry: THREE.BufferGeometry;
  /** Position monde X du mesh (centroïde empreinte). */
  offsetX: number;
  /** Position monde Z du mesh (centroïde empreinte). */
  offsetZ: number;
}

function ensureExtrudeShapeWinding(points: THREE.Vector2[]): THREE.Vector2[] {
  if (points.length < 3) return points;
  return ShapeUtils.isClockWise(points) ? points : [...points].reverse();
}

function quantizeHeight(heightMeters: number): number {
  return Math.max(0.5, Math.round(heightMeters * 2) / 2);
}

function footprintCacheKey(shapePoints: THREE.Vector2[], heightMeters: number): string {
  const wound = ensureExtrudeShapeWinding(shapePoints);
  const coords = wound
    .map((p) => `${Math.round(p.x * 4)}_${Math.round(p.y * 4)}`)
    .join(',');
  return `${coords}|h${quantizeHeight(heightMeters)}`;
}

function rawExtrudeFootprint(
  shapePoints: THREE.Vector2[],
  heightMeters: number
): THREE.BufferGeometry | null {
  if (shapePoints.length < 3 || heightMeters <= 0) return null;
  const wound = ensureExtrudeShapeWinding(shapePoints);
  const geometry = new THREE.ExtrudeGeometry(new THREE.Shape(wound), {
    depth: heightMeters,
    bevelEnabled: true,
    bevelThickness: 0.045,
    bevelSize: 0.035,
    bevelSegments: 1,
    steps: 1,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.computeVertexNormals();
  return geometry;
}

function rawFootprintRoof(shapePoints: THREE.Vector2[]): THREE.BufferGeometry | null {
  if (shapePoints.length < 3) return null;
  const wound = ensureExtrudeShapeWinding(shapePoints);
  const geometry = new THREE.ShapeGeometry(new THREE.Shape(wound));
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

/**
 * Phase 20 — cache géométries extrudées normalisées (centroïde à l’origine).
 * Les îlots Canebière / OSM répétitifs réutilisent la même base → clone cheap.
 */
export class OsmExtrusionCache {
  private readonly wallBases = new Map<string, THREE.BufferGeometry>();
  private readonly roofBases = new Map<string, THREE.BufferGeometry>();
  private hits = 0;
  private misses = 0;

  cloneWallExtrusion(
    shapePoints: THREE.Vector2[],
    heightMeters: number
  ): ExtrudedFootprintResult | null {
    if (shapePoints.length < 3 || heightMeters <= 0) return null;

    const wound = ensureExtrudeShapeWinding(shapePoints);
    let cx = 0;
    let cy = 0;
    for (const p of wound) {
      cx += p.x;
      cy += p.y;
    }
    cx /= wound.length;
    cy /= wound.length;

    const normalized = wound.map((p) => new THREE.Vector2(p.x - cx, p.y - cy));
    const key = footprintCacheKey(normalized, heightMeters);
    let base = this.wallBases.get(key);
    if (!base) {
      const created = rawExtrudeFootprint(normalized, heightMeters);
      if (!created) return null;
      base = created;
      this.wallBases.set(key, base);
      this.misses++;
    } else {
      this.hits++;
    }

    return {
      geometry: base.clone(),
      offsetX: cx,
      offsetZ: -cy,
    };
  }

  cloneRoofFootprint(shapePoints: THREE.Vector2[]): ExtrudedFootprintResult | null {
    if (shapePoints.length < 3) return null;

    const wound = ensureExtrudeShapeWinding(shapePoints);
    let cx = 0;
    let cy = 0;
    for (const p of wound) {
      cx += p.x;
      cy += p.y;
    }
    cx /= wound.length;
    cy /= wound.length;

    const normalized = wound.map((p) => new THREE.Vector2(p.x - cx, p.y - cy));
    const key = footprintCacheKey(normalized, 0);
    let base = this.roofBases.get(key);
    if (!base) {
      const created = rawFootprintRoof(normalized);
      if (!created) return null;
      base = created;
      this.roofBases.set(key, base);
      this.misses++;
    } else {
      this.hits++;
    }

    return {
      geometry: base.clone(),
      offsetX: cx,
      offsetZ: -cy,
    };
  }

  getStats(): { hits: number; misses: number; wallEntries: number; roofEntries: number } {
    return {
      hits: this.hits,
      misses: this.misses,
      wallEntries: this.wallBases.size,
      roofEntries: this.roofBases.size,
    };
  }

  clear(): void {
    for (const geometry of this.wallBases.values()) {
      geometry.dispose();
    }
    for (const geometry of this.roofBases.values()) {
      geometry.dispose();
    }
    this.wallBases.clear();
    this.roofBases.clear();
    this.hits = 0;
    this.misses = 0;
  }
}

let sharedCache: OsmExtrusionCache | null = null;

export function getOsmExtrusionCache(): OsmExtrusionCache {
  if (!sharedCache) {
    sharedCache = new OsmExtrusionCache();
  }
  return sharedCache;
}

export function clearOsmExtrusionCache(): void {
  sharedCache?.clear();
  sharedCache = null;
}

/** Tests / perf debug — reset sans toucher aux géométries en scène. */
export function resetOsmExtrusionCacheStats(): void {
  if (!sharedCache) return;
  sharedCache['hits'] = 0;
  sharedCache['misses'] = 0;
}
