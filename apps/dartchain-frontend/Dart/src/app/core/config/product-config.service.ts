import { Injectable } from '@angular/core';

import { environment } from '../../../environments/environment';

/**
 * Phase Z — configuration produit (commercial vs pédagogique).
 * Alignée sur les flags backend {@code dartchain.product.*}.
 */
@Injectable({ providedIn: 'root' })
export class ProductConfigService {
  readonly commercial = environment.commercial ?? false;
  readonly faucetEnabled = environment.faucetEnabled ?? true;
  readonly showcaseEnabled = environment.showcaseEnabled ?? true;
}
