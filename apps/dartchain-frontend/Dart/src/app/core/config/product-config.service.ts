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
   * Master Star Conquest — canvas + overlays.
   * Désactivé par défaut pour prioriser l’Arène BB floor ; code intact.
   */
  readonly starConquestEnabled = environment.starConquestEnabled ?? false;
  readonly starConquestOverlayEnabled = environment.starConquestOverlayEnabled ?? true;
  readonly starConquestKpiDebug =
    environment.starConquestKpiDebug ?? !environment.production;
  /**
   * Arène BB (ex-MetaVerseBB floor) — jouable automatiquement dans le peek bas de page.
   * Désactivable via environment si besoin ; ne contrôle pas claim / wallet.
   */
  readonly metaverseArenaEnabled = environment.metaverseArenaEnabled ?? true;
}
