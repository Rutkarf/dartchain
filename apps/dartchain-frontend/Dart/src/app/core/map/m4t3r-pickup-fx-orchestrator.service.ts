import { Injectable, inject } from '@angular/core';
import * as THREE from 'three';

import { M4t3rCoinPickupFxService } from './m4t3r-coin-pickup-fx.service';
import { M4t3rPickupFxService } from './m4t3r-pickup-fx.service';
import { groupClustersByRenderCell } from './m4t3r-pickup-fx.util';

/**
 * Garantit exactement 1 pièce 3D + 1 « +1 » par token visuel ramassé (grille 1,25 m).
 */
@Injectable({ providedIn: 'root' })
export class M4t3rPickupFxOrchestratorService {
  private readonly plusOneFx = inject(M4t3rPickupFxService);
  private readonly coinFx = inject(M4t3rCoinPickupFxService);

  spawnForCollect(
    clusterIds: readonly string[],
    character: THREE.Object3D,
    groundYAt: (x: number, z: number) => number
  ): void {
    for (const cell of groupClustersByRenderCell(clusterIds)) {
      const groundY = groundYAt(cell.x, cell.z);
      this.plusOneFx.spawnOne(character, cell.renderKey);
      this.coinFx.spawnAt(cell.renderKey, cell.x, groundY, cell.z);
    }
  }
}
