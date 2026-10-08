import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import * as THREE from 'three';

import { MapConfigService } from './map-config.service';
import { mapPerfProfile } from './metaverse-perf.config';
import { shouldRunSimTick } from './metaverse-sim-throttle.util';
import { LegacyFloorMapProvider } from './legacy-floor-map.provider';
import { MetaverseMapProvider } from './metaverse-map.provider';
import { WigleVisualizationService } from './wigle/wigle-visualization.service';
import { PlacementAnchorLayer } from './placements/placement-anchor.layer';
import type { MapProvider } from './map-provider.interface';
import type { MapProviderId } from './map-configuration';
import { ProductConfigService } from '@core/config/product-config.service';
import { isArenaSlimWorld } from './arena/metaverse-arena-profile';

export interface MapLoadState {
  activeProviderId: MapProviderId;
  fallbackActive: boolean;
  lastError: string | null;
}

/**
 * Résout le fournisseur de carte, gère le fallback legacy et l'état de chargement.
 * La couche réseau est attachée à la scène floor indépendamment du provider (Metaverse ou legacy).
 */
@Injectable({ providedIn: 'root' })
export class MapLoadingService {
  private readonly config = inject(MapConfigService);
  private readonly legacyProvider = inject(LegacyFloorMapProvider);
  private readonly metaverseProvider = inject(MetaverseMapProvider);
  private readonly wigleVisualization = inject(WigleVisualizationService);
  private readonly placementLayer = inject(PlacementAnchorLayer);
  private readonly product = inject(ProductConfigService);

  private activeProvider: MapProvider | null = null;
  private initialized = false;
  private scene: THREE.Scene | null = null;
  private networkRoot: THREE.Group | null = null;
  private lastNetworkUpdateMs = 0;
  private networkFrameIndex = 0;
  private lastNetworkCameraX = Number.NaN;
  private lastNetworkCameraZ = Number.NaN;

  private readonly stateSubject = new BehaviorSubject<MapLoadState>({
    activeProviderId: 'legacy-floor',
    fallbackActive: false,
    lastError: null,
  });

  readonly state$ = this.stateSubject.asObservable();

  getState(): MapLoadState {
    return this.stateSubject.value;
  }

  getActiveProvider(): MapProvider | null {
    return this.activeProvider;
  }

  private isSlimWorld(): boolean {
    return isArenaSlimWorld(this.product.metaverseArenaEnabled);
  }

  /**
   * Initialise le fournisseur demandé. En cas d'échec, bascule automatiquement sur legacy-floor.
   */
  async initialize(scene: THREE.Scene, camera: THREE.Camera): Promise<void> {
    if (this.initialized) return;

    this.scene = scene;
    const requested = this.config.effectiveProvider();

    if (requested === 'legacy-floor') {
      await this.switchTo(this.legacyProvider, false, null, scene, camera);
      this.attachNetworkLayer(scene, camera);
      this.initialized = true;
      return;
    }

    try {
      await this.switchTo(this.metaverseProvider, false, null, scene, camera);
      if (!this.isSlimWorld()) {
        this.metaverseProvider.ensureCityMassing?.();
        const massing = this.metaverseProvider.getCityMassingCount?.() ?? 0;
        if (massing < 50) {
          console.error(
            '[MapLoadingService] Massing Metaverse trop faible (',
            massing,
            ') — ensureCityMassing relancé.'
          );
          this.metaverseProvider.ensureCityMassing?.();
        } else {
          console.info('[MapLoadingService] Massing Metaverse OK:', massing, 'meshes');
        }
      } else {
        console.info('[MapLoadingService] Arena slim world — massing bâtiments désactivé');
      }
      this.attachNetworkLayer(scene, camera);
      void this.attachPlacementLayer(scene);
      this.initialized = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        '[MapLoadingService] Échec Metaverse — tentative recovery avant legacy.',
        message
      );
      if (error instanceof Error) {
        console.warn('[MapLoadingService] stack:', error.stack);
      }
      // Dernier essai Metaverse (init partiel possible) avant fallback legacy.
      try {
        if (!this.isSlimWorld()) {
          this.metaverseProvider.ensureCityMassing?.();
          if ((this.metaverseProvider.getCityMassingCount?.() ?? 0) >= 50) {
            this.activeProvider = this.metaverseProvider;
            this.stateSubject.next({
              activeProviderId: 'metaverse-osm-three',
              fallbackActive: false,
              lastError: message,
            });
            this.attachNetworkLayer(scene, camera);
            void this.attachPlacementLayer(scene);
            this.initialized = true;
            console.info('[MapLoadingService] Recovery Metaverse réussie malgré erreur init.');
            return;
          }
        } else {
          this.activeProvider = this.metaverseProvider;
          this.stateSubject.next({
            activeProviderId: 'metaverse-osm-three',
            fallbackActive: false,
            lastError: message,
          });
          this.attachNetworkLayer(scene, camera);
          this.initialized = true;
          console.info('[MapLoadingService] Recovery slim world malgré erreur init.');
          return;
        }
      } catch {
        /* continue fallback */
      }
      await this.switchTo(this.legacyProvider, true, message, scene, camera);
      this.attachNetworkLayer(scene, camera);
      this.initialized = true;
    }
  }

  update(cameraPosition: THREE.Vector3): void {
    this.activeProvider?.update(cameraPosition);

    if (this.networkRoot && this.scene) {
      this.networkFrameIndex++;
      const perf = mapPerfProfile(this.config.configuration.quality);
      const idle =
        Number.isFinite(this.lastNetworkCameraX) &&
        Math.hypot(
          cameraPosition.x - this.lastNetworkCameraX,
          cameraPosition.z - this.lastNetworkCameraZ
        ) < 0.04;
      const runNetwork = shouldRunSimTick(
        this.networkFrameIndex,
        perf.networkTickSkip,
        perf.networkTickSkip + 1,
        idle
      );

      if (runNetwork) {
        const now = performance.now();
        const deltaSeconds =
          this.lastNetworkUpdateMs > 0 ? (now - this.lastNetworkUpdateMs) * 0.001 : 0.016;
        this.lastNetworkUpdateMs = now;
        this.lastNetworkCameraX = cameraPosition.x;
        this.lastNetworkCameraZ = cameraPosition.z;
        this.wigleVisualization.update(cameraPosition, deltaSeconds);
      }
    }
    this.placementLayer.update();
  }

  dispose(): void {
    this.placementLayer.dispose();
    this.wigleVisualization.dispose();
    if (this.networkRoot && this.scene) {
      this.scene.remove(this.networkRoot);
    }
    this.networkRoot = null;
    this.scene = null;
    this.lastNetworkUpdateMs = 0;
    this.activeProvider?.dispose();
    this.activeProvider = null;
    this.initialized = false;
    this.stateSubject.next({
      activeProviderId: 'legacy-floor',
      fallbackActive: false,
      lastError: null,
    });
  }

  private attachNetworkLayer(scene: THREE.Scene, camera: THREE.Camera): void {
    if (this.networkRoot) return;
    // Arena slim : WiGLE / points réseau désactivés (code intact).
    if (this.isSlimWorld()) {
      console.info('[MapLoadingService] Arena slim — couche WiGLE désactivée');
      return;
    }
    this.networkRoot = new THREE.Group();
    this.networkRoot.name = 'metaverse-network-layer';
    scene.add(this.networkRoot);
    this.syncNetworkGroundResolver();
    this.wigleVisualization.attach(scene, this.networkRoot, camera);
    console.info('[MapLoadingService] Couche réseau attachée à la scène floor.');
  }

  private async attachPlacementLayer(scene: THREE.Scene): Promise<void> {
    if (this.isSlimWorld()) return;
    const state = this.stateSubject.value;
    if (state.activeProviderId !== 'metaverse-osm-three' || state.fallbackActive) {
      return;
    }
    await this.placementLayer.attach(scene);
  }

  /** Chaque point réseau pose Y = sol marchable (quai / terre / eau exclue). */
  private syncNetworkGroundResolver(): void {
    const sync = this.activeProvider?.getSurfaceProvider()?.getSurfaceHeightSync;
    if (!sync) {
      this.wigleVisualization.setGroundResolver(null);
      return;
    }
    this.wigleVisualization.setGroundResolver((x, z) => sync(x, z) ?? 0);
  }

  private async switchTo(
    provider: MapProvider,
    fallbackActive: boolean,
    lastError: string | null,
    scene: THREE.Scene,
    camera: THREE.Camera
  ): Promise<void> {
    console.info(
      '[MapLoadingService] Switching provider ->',
      provider.id,
      fallbackActive ? '(fallback)' : ''
    );
    this.activeProvider?.dispose();
    await provider.initialize(scene, camera);
    this.activeProvider = provider;
    this.stateSubject.next({
      activeProviderId: provider.id,
      fallbackActive,
      lastError,
    });
  }
}
