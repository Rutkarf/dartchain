import { Injectable } from '@angular/core';

import { VIEUX_PORT_GEOJSON_PATHS } from './geojson-cadastre.config';
import { parseCadastralGeoJson } from './geojson-building.parser';
import type { CadastralGeoJsonCollection, ParsedCadastralBuilding } from './geojson-building.types';

@Injectable({ providedIn: 'root' })
export class GeoJsonBuildingProvider {
  private cache: ParsedCadastralBuilding[] | null = null;
  private loadPromise: Promise<ParsedCadastralBuilding[]> | null = null;

  async loadVieuxPortBuildings(): Promise<ParsedCadastralBuilding[]> {
    if (this.cache) return this.cache;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = this.fetchBuildings(VIEUX_PORT_GEOJSON_PATHS.buildings);
    try {
      this.cache = await this.loadPromise;
      return this.cache;
    } finally {
      this.loadPromise = null;
    }
  }

  getCached(): ParsedCadastralBuilding[] {
    return this.cache ?? [];
  }

  clearCache(): void {
    this.cache = null;
  }

  private async fetchBuildings(url: string): Promise<ParsedCadastralBuilding[]> {
    const response = await fetch(url, { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error(`GeoJSON cadastre HTTP ${response.status} (${url})`);
    }
    const json = (await response.json()) as CadastralGeoJsonCollection;
    const parsed = parseCadastralGeoJson(json);
    if (!parsed.length) {
      throw new Error(`GeoJSON cadastre vide (${url})`);
    }
    return parsed;
  }
}
