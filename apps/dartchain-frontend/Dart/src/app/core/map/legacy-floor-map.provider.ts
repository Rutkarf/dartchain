import { Injectable, inject } from '@angular/core';
import * as THREE from 'three';

import { RunnerWorldService } from '../services/runner/runner-world.service';
import type { MapProvider, SurfaceProvider } from './map-provider.interface';
import {
  createLegacyFloorMeshes,
  disposeLegacyFloorMeshes,
  type LegacyFloorMeshes,
} from './legacy-floor-mesh.util';

const LEGACY_FLOOR_Y = 0;

/**
 * Fournisseur historique : sol neon-grid + monde runner (segments, bâtiments, échelle).
 */
@Injectable({ providedIn: 'root' })
export class LegacyFloorMapProvider implements MapProvider {
  readonly id = 'legacy-floor' as const;

  private readonly runnerWorld = inject(RunnerWorldService);

  private scene: THREE.Scene | null = null;
  private floorMeshes: LegacyFloorMeshes | null = null;

  private readonly surfaceProvider: SurfaceProvider = {
    getSurfaceHeight: async () => LEGACY_FLOOR_Y,
    getSurfaceHeightSync: () => LEGACY_FLOOR_Y,
    isWalkable: (x, z, radius) => this.runnerWorld.isWalkable(x, z, radius),
  };

  async initialize(scene: THREE.Scene, _camera: THREE.Camera): Promise<void> {
    this.scene = scene;
    this.floorMeshes = createLegacyFloorMeshes(scene);
    this.runnerWorld.start(scene);
  }

  update(_cameraPosition: THREE.Vector3): void {
    // Le streaming runner est piloté par CharacterControlService via runnerState.progress.
  }

  async getSurfaceHeight(_worldPosition: THREE.Vector3): Promise<number> {
    return LEGACY_FLOOR_Y;
  }

  getSurfaceProvider(): SurfaceProvider {
    return this.surfaceProvider;
  }

  dispose(): void {
    if (this.scene) {
      this.runnerWorld.dispose(this.scene);
      disposeLegacyFloorMeshes(this.scene, this.floorMeshes);
    }
    this.floorMeshes = null;
    this.scene = null;
  }
}
