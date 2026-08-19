import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import * as THREE from 'three';

import { MapConfigService } from './map-config.service';
import { LegacyFloorMapProvider } from './legacy-floor-map.provider';
import { MarseilleMapProvider } from './marseille-map.provider';
import type { MapProvider } from './map-provider.interface';
import type { MapProviderId } from './map-configuration';

export interface MapLoadState {
  activeProviderId: MapProviderId;
  fallbackActive: boolean;
  lastError: string | null;
}

/**
 * Résout le fournisseur de carte, gère le fallback legacy et l'état de chargement.
 */
@Injectable({ providedIn: 'root' })
export class MapLoadingService {
  private readonly config = inject(MapConfigService);
  private readonly legacyProvider = inject(LegacyFloorMapProvider);
  private readonly marseilleProvider = inject(MarseilleMapProvider);

  private activeProvider: MapProvider | null = null;
  private initialized = false;

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

    const requested = this.config.effectiveProvider();

    if (requested === 'legacy-floor') {
      await this.switchTo(this.legacyProvider, false, null, scene, camera);
      this.initialized = true;
      return;
    }

    try {
      await this.switchTo(this.marseilleProvider, false, null, scene, camera);
      this.initialized = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        '[MapLoadingService] Échec Marseille — fallback legacy-floor.',
        message
      );
      if (error instanceof Error) {
        console.warn('[MapLoadingService] stack:', error.stack);
      }
      await this.switchTo(this.legacyProvider, true, message, scene, camera);
      this.initialized = true;
    }
  }

  update(cameraPosition: THREE.Vector3): void {
    this.activeProvider?.update(cameraPosition);
  }

  dispose(): void {
    this.activeProvider?.dispose();
    this.activeProvider = null;
    this.initialized = false;
    this.stateSubject.next({
      activeProviderId: 'legacy-floor',
      fallbackActive: false,
      lastError: null,
    });
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
