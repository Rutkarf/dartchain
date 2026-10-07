import { Injectable } from '@angular/core';
import type { BufferGeometry } from 'three';

const LOGO_URL = '/logo.stl';

declare global {
  interface Window {
    /** Prefetch HTML (index.html) — ArrayBuffer logo.stl, sans Three.js. */
    __DARTCHAIN_LOGO_STL__?: Promise<ArrayBuffer | null>;
  }
}

/**
 * Charge logo.stl une seule fois ; chaque viewer clone la géométrie.
 * Prefetch réseau possible avant Angular ; Three.js seulement au parse.
 * Pas de weld CPU (trop lent sur 7.8 Mo) — normals seules pour un 1er frame < 1 s.
 */
@Injectable({ providedIn: 'root' })
export class LogoStlCacheService {
  private geometryPromise?: Promise<BufferGeometry>;
  private bytesPromise?: Promise<ArrayBuffer | null>;
  private threePromise?: Promise<typeof import('three')>;
  private loaderPromise?: Promise<typeof import('three/examples/jsm/loaders/STLLoader.js')>;

  /** Démarre le fetch STL sans charger Three (non bloquant). */
  prefetchNetwork(): void {
    void this.ensureBytes();
  }

  /** Prefetch Three + STLLoader en parallèle du réseau. */
  prefetchRuntime(): void {
    void this.ensureThree();
    void this.ensureLoader();
    void this.ensureBytes();
  }

  load(): Promise<BufferGeometry> {
    if (!this.geometryPromise) {
      this.geometryPromise = this.buildGeometry();
    }
    return this.geometryPromise.then((geo) => geo.clone());
  }

  private ensureThree(): Promise<typeof import('three')> {
    if (!this.threePromise) {
      this.threePromise = import('three');
    }
    return this.threePromise;
  }

  private ensureLoader(): Promise<typeof import('three/examples/jsm/loaders/STLLoader.js')> {
    if (!this.loaderPromise) {
      this.loaderPromise = import('three/examples/jsm/loaders/STLLoader.js');
    }
    return this.loaderPromise;
  }

  private ensureBytes(): Promise<ArrayBuffer | null> {
    if (!this.bytesPromise) {
      const early =
        typeof window !== 'undefined' ? window.__DARTCHAIN_LOGO_STL__ : undefined;
      this.bytesPromise = (early ?? this.fetchBytes()).then((buf) => buf);
    }
    return this.bytesPromise;
  }

  private async fetchBytes(): Promise<ArrayBuffer | null> {
    try {
      const res = await fetch(LOGO_URL, {
        credentials: 'same-origin',
        priority: 'high',
      } as RequestInit);
      if (!res.ok) return null;
      return await res.arrayBuffer();
    } catch {
      return null;
    }
  }

  private async buildGeometry(): Promise<BufferGeometry> {
    const [THREE, { STLLoader }, bytes] = await Promise.all([
      this.ensureThree(),
      this.ensureLoader(),
      this.ensureBytes(),
    ]);

    let geometry: BufferGeometry;
    if (bytes && bytes.byteLength > 0) {
      geometry = new STLLoader().parse(bytes);
    } else {
      geometry = await new Promise<BufferGeometry>((resolve, reject) => {
        new STLLoader().load(LOGO_URL, resolve, undefined, reject);
      });
    }

    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    if (box) {
      const center = new THREE.Vector3();
      box.getCenter(center);
      geometry.translate(-center.x, -center.y, -center.z);
    }
    // Normals seulement — le weld 162k→30k coûtait trop cher au boot appel.
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    return geometry;
  }
}
