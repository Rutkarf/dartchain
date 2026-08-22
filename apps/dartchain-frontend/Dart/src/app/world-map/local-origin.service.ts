import { Injectable, inject } from '@angular/core';

import { MapConfigService } from './map-config.service';

/**
 * Origine locale autour de Marseille (Vieux-Port par défaut).
 * Évite les grandes coordonnées Three.js.
 */
@Injectable({ providedIn: 'root' })
export class LocalOriginService {
  private readonly config = inject(MapConfigService);

  get latitude(): number {
    return this.config.configuration.latitudeOrigin;
  }

  get longitude(): number {
    return this.config.configuration.longitudeOrigin;
  }

  get altitude(): number {
    return this.config.configuration.altitudeOrigin;
  }

  get worldScale(): number {
    return this.config.configuration.worldScale;
  }
}
