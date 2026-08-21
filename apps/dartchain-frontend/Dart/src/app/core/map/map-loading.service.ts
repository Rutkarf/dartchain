import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import * as THREE from 'three';

import { MapConfigService } from './map-config.service';
import { LegacyFloorMapProvider } from './legacy-floor-map.provider';
import { MarseilleMapProvider } from './marseille-map.provider';
import { WigleVisualizationService } from './wigle/wigle-visualization.service';
import { PlacementAnchorLayer } from './placements/placement-anchor.layer';
import type { MapProvider } from './map-provider.interface';
import type { MapProviderId } from './map-configuration';

export interface MapLoadState {
  activeProviderId: MapProviderId;
  fallbackActive: boolean;
  lastError: string | null;
}

/**
 * Résout le fournisseur de carte, gère le fallback legacy et l'état de chargement.
 * La couche réseau est attachée à la scène floor indépendamment du provider (Marseille ou legacy).
 */
@Injectable({ providedIn: 'root' })
export class MapLoadingService {
  private readonly config = inject(MapConfigService);
  private readonly legacyProvider = inject(LegacyFloorMapProvider);
  private readonly marseilleProvider = inject(MarseilleMapProvider);
  private readonly wigleVisualization = inject(WigleVisualizationService);
  private readonly placementLayer = inject(PlacementAnchorLayer);

  private activeProvider: MapProvider | null = null;
  private initialized = false;
  private scene: THREE.Scene | null = null;
  private networkRoot: THREE.Group | null = null;
  private lastNetworkUpdateMs = 0;

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
      await this.switchTo(this.marseilleProvider, false, null, scene, camera);
      this.marseilleProvider.ensureCityMassing?.();
      const massing = this.marseilleProvider.getCityMassingCount?.() ?? 0;
      if (massing < 50) {
        console.error(
          '[MapLoadingService] Massing Marseille trop faible (',
          massing,
          ') — ensureCityMassing relancé.'
        );
        this.marseilleProvider.ensureCityMassing?.();
      } else {
        console.info('[MapLoadingService] Massing Marseille OK:', massing, 'meshes');
      }
      this.attachNetworkLayer(scene, camera);
      void this.attachPlacementLayer(scene);
      this.initialized = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        '[MapLoadingService] Échec Marseille — tentative recovery avant legacy.',
        message
      );
      if (error instanceof Error) {
        console.warn('[MapLoadingService] stack:', error.stack);
      }
      // Dernier essai Marseille (init partiel possible) avant fallback legacy.
      try {
        this.marseilleProvider.ensureCityMassing?.();
        if ((this.marseilleProvider.getCityMassingCount?.() ?? 0) >= 50) {
          this.activeProvider = this.marseilleProvider;
          this.stateSubject.next({
            activeProviderId: 'marseille-osm-three',
            fallbackActive: false,
            lastError: message,
          });
          this.attachNetworkLayer(scene, camera);
          void this.attachPlacementLayer(scene);
          this.initialized = true;
          console.info('[MapLoadingService] Recovery Marseille réussie malgré erreur init.');
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
      const now = performance.now();
      const deltaSeconds =
        this.lastNetworkUpdateMs > 0 ? (now - this.lastNetworkUpdateMs) * 0.001 : 0.016;
      this.lastNetworkUpdateMs = now;
      this.wigleVisualization.update(cameraPosition, deltaSeconds);
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
    this.networkRoot = new THREE.Group();
    this.networkRoot.name = 'metaverse-network-layer';
    scene.add(this.networkRoot);
    this.syncNetworkGroundResolver();
    this.wigleVisualization.attach(scene, this.networkRoot, camera);
    console.info('[MapLoadingService] Couche réseau attachée à la scène floor.');
  }

  private async attachPlacementLayer(scene: THREE.Scene): Promise<void> {
    const state = this.stateSubject.value;
    if (state.activeProviderId !== 'marseille-osm-three' || state.fallbackActive) {
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
