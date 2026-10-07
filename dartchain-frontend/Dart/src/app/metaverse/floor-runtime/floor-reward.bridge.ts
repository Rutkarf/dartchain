import { Injectable, NgZone, inject } from '@angular/core';

import { M4t3rRewardRuntimeService } from '@world-map/m4t3r-reward-runtime.service';
import type { M4t3rTrailPickupAccepted } from '@world-map/m4t3r-trail-api.service';
import { FloorSessionAdapter } from './floor-session.adapter';

/**
 * Applique la collect validée : crédit faucet (via reward runtime) + refresh wallet UI.
 * Ne contient aucune logique de crédit — délègue à M4t3rRewardRuntimeService.
 */
@Injectable({ providedIn: 'root' })
export class FloorRewardBridge {
  private readonly rewardRuntime = inject(M4t3rRewardRuntimeService);
  private readonly session = inject(FloorSessionAdapter);
  private readonly zone = inject(NgZone);

  handleAcceptedTrail(
    accepted: M4t3rTrailPickupAccepted,
    clientSpeedEstimate: string
  ): void {
    this.zone.run(() => {
      this.rewardRuntime.onTrailAccepted(accepted, clientSpeedEstimate);
      if (accepted.rewards?.length) {
        this.session.notifyBalanceRefresh();
      }
    });
  }
}
