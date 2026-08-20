import { Injectable } from '@angular/core';

import { environment } from '../../../environments/environment';

/**
 * Phase Z — configuration produit (commercial vs pédagogique).
 * Alignée sur les flags backend {@code dartchain.product.*}.
 */
@Injectable({ providedIn: 'root' })
export class ProductConfigService {
  readonly commercial = environment.commercial ?? false;
  /** Toujours actif (dev, prod, déploiement Cloudflare/Render). */
  readonly faucetEnabled = true;
  readonly showcaseEnabled = environment.showcaseEnabled ?? true;
  readonly starConquestOverlayEnabled = environment.starConquestOverlayEnabled ?? true;
  readonly starConquestKpiDebug =
    environment.starConquestKpiDebug ?? !environment.production;
}
