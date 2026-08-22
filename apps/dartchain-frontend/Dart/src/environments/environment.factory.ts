export interface ProductEnvironment {
  commercial: boolean;
  faucetEnabled: boolean;
  showcaseEnabled: boolean;
  /** Overlays panel + scanner. Le canvas WebGL reste monté. */
  starConquestOverlayEnabled?: boolean;
  /** Ligne KPI R&D dans le scanner — pas un UX utilisateur. */
  starConquestKpiDebug?: boolean;
}

export interface MapEnvironment {
  mapEnabled?: boolean;
  mapProvider?: 'legacy-floor' | 'marseille-osm-three';
  enableOsmBuildings?: boolean;
  enableTerrain?: boolean;
  mapDebug?: boolean;
  mapQuality?: 'ultra-low' | 'low' | 'medium' | 'high';
  opentopographyApiKey?: string;
}

export interface AppEnvironment extends ProductEnvironment, MapEnvironment {
  production: boolean;
  apiUrl: string;
  liveWsUrl: string;
  chatWsUrl: string;
}

const DEFAULT_PRODUCT: ProductEnvironment = {
  commercial: true,
  faucetEnabled: true,
  showcaseEnabled: true,
  starConquestOverlayEnabled: true,
  starConquestKpiDebug: false,
};

const DEFAULT_MAP: MapEnvironment = {
  mapEnabled: true,
  mapProvider: 'marseille-osm-three',
  enableOsmBuildings: true,
  enableTerrain: true,
  mapDebug: false,
  mapQuality: 'ultra-low',
  opentopographyApiKey: '',
};

export function runtimeWsUrl(path: string): string {
  if (typeof globalThis !== 'undefined' && 'location' in globalThis) {
    const location = globalThis.location as Location;
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    return `${protocol}://${location.host}${path}`;
  }

  return `ws://localhost${path}`;
}

export function devWsUrl(path: string): string {
  if (typeof globalThis !== 'undefined' && 'location' in globalThis) {
    const location = globalThis.location as Location;
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    return `${protocol}://${location.host}${path}`;
  }
  return `ws://localhost:4200${path}`;
}

/** Fusionne les défauts produit/carte avec les overrides du profil de build. */
export function buildEnvironment(
  overrides: Pick<AppEnvironment, 'production' | 'apiUrl' | 'liveWsUrl' | 'chatWsUrl'> &
    Partial<ProductEnvironment & MapEnvironment>,
): AppEnvironment {
  return {
    ...DEFAULT_PRODUCT,
    ...DEFAULT_MAP,
    ...overrides,
  };
}
