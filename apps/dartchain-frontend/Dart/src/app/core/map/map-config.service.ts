import { Injectable } from '@angular/core';

import { environment } from '../../../environments/environment';
import {
  DEFAULT_MAP_CONFIGURATION,
  type MapConfiguration,
  type MapProviderId,
  type MapQuality,
} from './map-configuration';
import { readMapQualityFromUrl, resolveMapQuality } from './map-quality-resolver.util';

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

  /** Provider effectif — Marseille OSM prioritaire dès que la carte est activée. */
  effectiveProvider(): MapProviderId {
    if (!this.configuration.enabled) {
      return 'legacy-floor';
    }
    // MetaVerseBB : forcer Marseille sauf demande explicite legacy.
    if (this.configuration.provider === 'legacy-floor') {
      return 'legacy-floor';
    }
    return 'marseille-osm-three';
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

    base.quality = resolveMapQuality({
      urlQuality: readMapQualityFromUrl(),
      envQuality: base.quality,
      fallback: DEFAULT_MAP_CONFIGURATION.quality,
    });

    // Garde-fou : Marseille sans bâtiments = carte vide.
    if (base.provider === 'marseille-osm-three' && base.enabled) {
      base.enableBuildings = true;
    }

    return base;
  }
}
