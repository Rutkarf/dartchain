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
  /**
   * Master Conquête stellaire — canvas + overlays au-dessus du floor MetaVerseBB.
   */
  readonly starConquestEnabled = environment.starConquestEnabled ?? true;
  readonly starConquestOverlayEnabled = environment.starConquestOverlayEnabled ?? true;
  readonly starConquestKpiDebug =
    environment.starConquestKpiDebug ?? !environment.production;
  /**
   * MetaVerseBB floor — jouable automatiquement dans le peek bas de page.
   * Désactivable via environment si besoin ; ne contrôle pas claim / wallet.
   */
  readonly metaverseArenaEnabled = environment.metaverseArenaEnabled ?? true;
}
