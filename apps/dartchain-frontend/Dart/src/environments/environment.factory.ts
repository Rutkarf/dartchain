export interface ProductEnvironment {
  commercial: boolean;
  faucetEnabled: boolean;
  showcaseEnabled: boolean;
  /**
   * Master kill-switch Star Conquest (canvas + overlays).
   * false = non monté ; code intact, réactivation = true.
   */
  starConquestEnabled?: boolean;
  /** Overlays panel + scanner. Nécessite starConquestEnabled. */
  starConquestOverlayEnabled?: boolean;
  /** Ligne KPI R&D dans le scanner — pas un UX utilisateur. */
  starConquestKpiDebug?: boolean;
  /**
   * Arène BB (ex-MetaVerseBB) — combat + profil map dans le floor bas de page.
   * Activé par défaut : jouable automatiquement (guest OK).
   */
  metaverseArenaEnabled?: boolean;
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
  /** Q2=B — WebSocket arène dédié (fallback mock si indisponible). */
  arenaWsUrl?: string;
}

const DEFAULT_PRODUCT: ProductEnvironment = {
  commercial: true,
  faucetEnabled: true,
  showcaseEnabled: true,
  starConquestEnabled: false,
  starConquestOverlayEnabled: true,
  starConquestKpiDebug: false,
  metaverseArenaEnabled: true,
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

export function buildEnvironment(
  overrides: Pick<AppEnvironment, 'production' | 'apiUrl' | 'liveWsUrl' | 'chatWsUrl'> &
    Partial<ProductEnvironment & MapEnvironment> &
    Partial<Pick<AppEnvironment, 'arenaWsUrl'>>,
): AppEnvironment {
  const base = {
    ...DEFAULT_PRODUCT,
    ...DEFAULT_MAP,
    ...overrides,
  };
  return {
    ...base,
    arenaWsUrl:
      overrides.arenaWsUrl ??
      (overrides.production
        ? overrides.liveWsUrl.replace(/\/ws\/live\/?$/, '/ws/metaverse-arena')
        : typeof overrides.liveWsUrl === 'string'
          ? overrides.liveWsUrl.replace(/\/ws\/live\/?$/, '/ws/metaverse-arena')
          : undefined),
  };
}
