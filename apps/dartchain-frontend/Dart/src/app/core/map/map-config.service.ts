import { Injectable } from '@angular/core';

import { environment } from '../../../environments/environment';
import {
  DEFAULT_MAP_CONFIGURATION,
  type MapConfiguration,
  type MapProviderId,
  type MapQuality,
} from './map-configuration';

/** Sous-ensemble des variables d'environnement liées à la carte. */
export interface MapEnvironment {
  mapEnabled?: boolean;
  mapProvider?: MapProviderId;
  enableOsmBuildings?: boolean;
  enableTerrain?: boolean;
  mapDebug?: boolean;
  mapQuality?: MapQuality;
  opentopographyApiKey?: string;
}

/**
 * Lit la configuration carte depuis l'environnement Angular
 * et expose une MapConfiguration normalisée.
 */
@Injectable({ providedIn: 'root' })
export class MapConfigService {
  private readonly env = environment as typeof environment & MapEnvironment;

  readonly configuration: MapConfiguration = this.buildConfiguration();

  /** Provider effectif (legacy si carte désactivée). */
  effectiveProvider(): MapProviderId {
    if (!this.configuration.enabled) {
      return 'legacy-floor';
    }
    return this.configuration.provider;
  }

  isLegacyProvider(): boolean {
    return this.effectiveProvider() === 'legacy-floor';
  }

  private buildConfiguration(): MapConfiguration {
    const base = { ...DEFAULT_MAP_CONFIGURATION };

    if (this.env.mapEnabled !== undefined) {
      base.enabled = this.env.mapEnabled;
    }
    if (this.env.mapProvider !== undefined) {
      base.provider = this.env.mapProvider;
    }
    if (this.env.enableOsmBuildings !== undefined) {
      base.enableBuildings = this.env.enableOsmBuildings;
    }
    if (this.env.enableTerrain !== undefined) {
      base.enableTerrain = this.env.enableTerrain;
    }
    if (this.env.mapDebug !== undefined) {
      base.enableDebug = this.env.mapDebug;
    }
    if (this.env.mapQuality !== undefined) {
      base.quality = this.env.mapQuality;
    }

    return base;
  }
}
