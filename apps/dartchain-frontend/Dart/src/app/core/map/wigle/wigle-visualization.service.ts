import { Injectable, inject } from '@angular/core';
import * as THREE from 'three';
import { firstValueFrom } from 'rxjs';

import { GeoCoordinateService } from '../geo-coordinate.service';
import { MapConfigService } from '../map-config.service';
import { ThreeSceneService } from '../../services/three-scene.service';
import { WigleApiService } from './wigle-api.service';
import { WigleBuildingManager } from './wigle-building.manager';
import { WIGLEBuildingOverlayManager } from './wigle-building-overlay.manager';
import { WigleBuildingRegistryService } from './wigle-building-registry.service';
import { WaveEffectSystem } from './wave-effects';
import { WigleGeoService } from './wigle-geo.service';
import { GeoMappingService } from './geo-mapping.service';
import { WigleOsmFootprintManager } from './wigle-osm-footprint.manager';
import { HorizonScaleManager } from './horizon-scale.manager';
import { WigleDebugOverlay } from './wigle-debug-overlay';
import { WIGLE_GEO_CONFIG, maxActivePointsForQuality } from './wigle-visual.config';
import { mapGeoPointsToBuildingEntrances } from './wifi-entrance-mapper.util';
import { MARSEILLE_GEO_ORIGIN } from '../geo-reference.config';
import type { WigleGeoPoint, WigleGeoDebugStats } from './wigle-point.types';
import type { HorizonScaleDebugStats } from './wigle.types';

@Injectable({ providedIn: 'root' })
export class WigleVisualizationService {
  private readonly api = inject(WigleApiService);
  private readonly geoService = inject(WigleGeoService);
  private readonly geo = inject(GeoCoordinateService);
  private readonly mapConfig = inject(MapConfigService);
  private readonly debugOverlay = inject(WigleDebugOverlay);
  private readonly threeScene = inject(ThreeSceneService);
  private readonly buildingRegistry = inject(WigleBuildingRegistryService);
  private readonly geoMapping = inject(GeoMappingService);

  private readonly buildingManager = new WigleBuildingManager();
  private readonly osmFootprints = new WigleOsmFootprintManager();
  private readonly buildingOverlays = new WIGLEBuildingOverlayManager();
  private readonly waveEffects = new WaveEffectSystem();
  private readonly horizonScale = new HorizonScaleManager();

  private mapRoot: THREE.Group | null = null;
  private camera: THREE.Camera | null = null;
  private allPoints: WigleGeoPoint[] = [];
  private visiblePoints: WigleGeoPoint[] = [];
  private loaded = false;
  private loading = false;
  private mappingInflight = false;
  private elapsedSeconds = 0;
  private effectsEnabled = true;
  private lastVisibleSignature = '';
  private lastLoadCenter = new THREE.Vector3(Number.NaN, 0, Number.NaN);
  private lastOsmLoadLat = Number.NaN;
  private lastOsmLoadLon = Number.NaN;
  private lastRegistryCount = 0;
  private groundResolver: ((worldX: number, worldZ: number) => number) | null = null;

  attach(scene: THREE.Scene, mapRoot: THREE.Group, camera?: THREE.Camera): void {
    this.mapRoot = mapRoot;
    mapRoot.renderOrder = 20;
    this.camera = camera ?? null;
    const quality = this.mapConfig.configuration.quality;

    this.buildingManager.attach(mapRoot, quality);
    this.osmFootprints.attach(mapRoot, quality);
    this.buildingOverlays.attach(mapRoot, quality);
    this.waveEffects.attach(mapRoot, quality);
    this.horizonScale.attach(scene, quality);
    this.debugOverlay.attach();
    this.debugOverlay.setEffectsToggleHandler((enabled) => this.setEffectsEnabled(enabled));

    void this.loadGeoPointsAround(MARSEILLE_GEO_ORIGIN.latitude, MARSEILLE_GEO_ORIGIN.longitude);
    void this.refreshBuildingMapping();
  }

  /** Recharge agrégats réseau ↔ bâtiments OSM/prototype sur la map floor. */
  async refreshBuildingMapping(): Promise<void> {
    if (this.mappingInflight) return;
    const buildings = this.buildingRegistry.list();
    if (buildings.length === 0) return;

    if (this.allPoints.length > 0) {
      this.allPoints = this.applyEntranceMapping(this.allPoints);
      this.lastVisibleSignature = '';
    }

    this.mappingInflight = true;
    try {
      const [buildingsResp, areasResp] = await Promise.all([
        this.api.loadBuildingAggregates(),
        firstValueFrom(this.api.fetchAreaAggregates()),
      ]);

      this.buildingOverlays.setAggregates(buildingsResp.aggregates, buildings);

      const existingIds = new Set(this.allPoints.map((p) => p.id));
      const areaPoints = this.applyEntranceMapping(
        this.geoService.enrichPoints(
          areasResp.areas.map((area) => ({
            id: `area:${area.areaId}`,
            latitude: area.latitudeApprox,
            longitude: area.longitudeApprox,
            networkName: `Zone-${area.areaId.slice(0, 8)}`,
            networkType: Object.keys(area.networkTypeCounts)[0]?.toUpperCase() ?? 'WIFI',
            signalStrength: area.signalAverage ?? -68,
            source: area.source,
          })),
          this.groundResolver ?? undefined
        )
      ).filter((p) => !existingIds.has(p.id));

      if (areaPoints.length > 0) {
        this.allPoints = [...this.allPoints, ...areaPoints];
        this.lastVisibleSignature = '';
      }

      console.info(
        '[MetaverseNetwork] Overlays bâtiments:',
        buildingsResp.aggregates.length,
        'zones:',
        areasResp.areas.length,
        `source=${buildingsResp.source}`
      );
    } catch (error) {
      console.warn('[MetaverseNetwork] Échec mapping bâtiments réseau.', error);
    } finally {
      this.mappingInflight = false;
      this.lastRegistryCount = buildings.length;
    }
  }

  setEffectsEnabled(enabled: boolean): void {
    this.effectsEnabled = enabled;
    this.waveEffects.setEnabled(enabled);
    this.debugOverlay.setEffectsEnabledState(enabled);
    this.lastVisibleSignature = '';
  }

  isEffectsEnabled(): boolean {
    return this.effectsEnabled;
  }

  setLegendEnabled(enabled: boolean): void {
    this.debugOverlay.setLegendVisible(enabled);
  }

  /** Résolveur hauteur sol (Marseille SurfaceProvider) — 1 point GPS = 1 emplacement 3D au sol. */
  setGroundResolver(resolver: ((worldX: number, worldZ: number) => number) | null): void {
    this.groundResolver = resolver;
    if (this.allPoints.length > 0) {
      this.allPoints = this.applyEntranceMapping(
        this.geoService.enrichPoints(
          this.allPoints.map((p) => ({
            id: p.id,
            latitude: p.latitude,
            longitude: p.longitude,
            networkName: p.networkName,
            networkType: p.networkType,
            signalStrength: p.signalStrength,
            source: p.source,
          })),
          this.groundResolver ?? undefined
        )
      );
      this.lastVisibleSignature = '';
    }
  }

  update(cameraPosition: THREE.Vector3, deltaSeconds: number): void {
    this.elapsedSeconds += deltaSeconds;

    const camera = this.threeScene.getCamera();
    if (camera) this.camera = camera;

    const registryCount = this.buildingRegistry.list().length;
    if (registryCount > this.lastRegistryCount) {
      void this.refreshBuildingMapping();
    }

    void this.maybeReloadAroundPlayer(cameraPosition);

    if (this.loaded) {
      this.updateVisiblePoints(cameraPosition);
    }

    this.buildingManager.updateInstances(this.pointsWithoutOsmFootprint(this.visiblePoints));
    this.osmFootprints.updateVisibility(cameraPosition, this.camera ?? undefined);
    this.buildingOverlays.update(cameraPosition, this.elapsedSeconds);

    const signature =
      this.visiblePoints.map((p) => p.id).join('|') + (this.effectsEnabled ? '1' : '0');
    if (signature !== this.lastVisibleSignature) {
      this.lastVisibleSignature = signature;
      this.waveEffects.rebuild(this.effectsEnabled ? this.visiblePoints : []);
    }

    this.waveEffects.update(deltaSeconds, cameraPosition);
    this.horizonScale.update(this.elapsedSeconds, cameraPosition);
    this.debugOverlay.updateGeoStats(this.buildGeoDebugStats(cameraPosition));
  }

  dispose(): void {
    this.buildingManager.dispose();
    this.osmFootprints.dispose();
    this.buildingOverlays.dispose();
    this.waveEffects.dispose();
    this.horizonScale.dispose();
    this.debugOverlay.dispose();
    this.mapRoot = null;
    this.camera = null;
    this.allPoints = [];
    this.visiblePoints = [];
    this.loaded = false;
    this.loading = false;
    this.lastRegistryCount = 0;
  }

  getGeoPoints(): WigleGeoPoint[] {
    return this.allPoints;
  }

  private async maybeReloadAroundPlayer(cameraPosition: THREE.Vector3): Promise<void> {
    if (this.loading) return;
    if (!Number.isFinite(this.lastLoadCenter.x)) {
      const geo = this.geo.worldToGeo(cameraPosition);
      await this.loadGeoPointsAround(geo.latitude, geo.longitude);
      this.lastLoadCenter.copy(cameraPosition);
      return;
    }

    const moved = this.lastLoadCenter.distanceTo(cameraPosition);
    if (moved >= WIGLE_GEO_CONFIG.reloadDistanceMeters) {
      const geo = this.geo.worldToGeo(cameraPosition);
      await this.loadGeoPointsAround(geo.latitude, geo.longitude);
      this.lastLoadCenter.copy(cameraPosition);
      this.lastVisibleSignature = '';
    }
  }

  private async loadGeoPointsAround(lat: number, lon: number): Promise<void> {
    if (this.loading) return;
    this.loading = true;
    try {
      const quality = this.mapConfig.configuration.quality;
      const limit = maxActivePointsForQuality(quality);
      const response = await this.api.loadGeoPoints(lat, lon, WIGLE_GEO_CONFIG.loadRadiusMeters, limit);
      const center = this.geo.geoToWorld(lat, lon, 0);
      this.allPoints = this.applyEntranceMapping(
        this.geoService.enrichPoints(
          response.points,
          this.groundResolver ?? undefined
        )
      );
      this.allPoints = this.geoService.filterByRadius(
        this.allPoints,
        center,
        WIGLE_GEO_CONFIG.loadRadiusMeters
      );
      this.loaded = true;
      if (this.shouldReloadOsmFootprints(lat, lon)) {
        this.lastOsmLoadLat = lat;
        this.lastOsmLoadLon = lon;
        void this.osmFootprints
          .loadForPoints(
            this.allPoints,
            this.geoMapping,
            lat,
            lon,
            WIGLE_GEO_CONFIG.loadRadiusMeters
          )
          .then(() => {
            this.lastVisibleSignature = '';
          });
      }
      console.info(
        '[MetaverseNetwork] Points réseau:',
        this.allPoints.length,
        `source=${response.source}`,
        `centre=(${lat.toFixed(5)}, ${lon.toFixed(5)})`
      );
      void this.refreshBuildingMapping();
    } catch (error) {
      console.warn('[MetaverseNetwork] Échec chargement points réseau.', error);
    } finally {
      this.loading = false;
    }
  }

  private updateVisiblePoints(cameraPosition: THREE.Vector3): void {
    const limit = maxActivePointsForQuality(this.mapConfig.configuration.quality);
    if (this.allPoints.length === 0) {
      this.visiblePoints = [];
      return;
    }

    // Toujours afficher les points les plus proches du joueur (lisible sur le floor).
    this.visiblePoints = this.allPoints
      .map((point) => ({
        point,
        dist: this.geoService.distanceMeters(cameraPosition, point),
      }))
      .filter((entry) => entry.dist <= WIGLE_GEO_CONFIG.loadRadiusMeters)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, limit)
      .map((entry) => entry.point);
  }

  private buildGeoDebugStats(cameraPosition: THREE.Vector3): {
    geo: WigleGeoDebugStats;
    horizon: HorizonScaleDebugStats;
  } {
    const overlayStats = this.buildingOverlays.getDebugStats();
    return {
      geo: {
        totalPoints: this.allPoints.length,
        visiblePoints: this.visiblePoints.length,
        activeBuildings:
          this.buildingManager.getActiveCount() + this.osmFootprints.getActiveCount(),
        activeWaveEffects: this.waveEffects.getActiveEffectCount(),
        drawCallsEstimate:
          this.waveEffects.estimateDrawCalls() +
          3 +
          overlayStats.activeWIGLEInstances +
          this.osmFootprints.getActiveCount(),
        loadRadiusMeters: WIGLE_GEO_CONFIG.loadRadiusMeters,
        effectsEnabled: this.effectsEnabled,
        osmFootprintsActive: this.osmFootprints.getActiveCount(),
        osmMatchedPoints: this.osmFootprints.getMatchedPointIds().size,
        entranceMappedPoints: this.allPoints.filter((p) => p.mappedAtEntrance).length,
        buildingEnsembles: this.buildingRegistry
          .list()
          .filter((b) => b.label)
          .map((b) => b.label as string),
      },
      horizon: this.horizonScale.getDebugStats(cameraPosition),
    };
  }

  private pointsWithoutOsmFootprint(points: WigleGeoPoint[]): WigleGeoPoint[] {
    const matched = this.osmFootprints.getMatchedPointIds();
    return points.filter((p) => !matched.has(p.id));
  }

  private shouldReloadOsmFootprints(lat: number, lon: number): boolean {
    if (!Number.isFinite(this.lastOsmLoadLat) || !Number.isFinite(this.lastOsmLoadLon)) {
      return true;
    }
    const movedMeters = this.geoMapping.haversineMeters(
      this.lastOsmLoadLat,
      this.lastOsmLoadLon,
      lat,
      lon
    );
    return movedMeters >= 120;
  }

  private applyEntranceMapping(points: WigleGeoPoint[]): WigleGeoPoint[] {
    return mapGeoPointsToBuildingEntrances(
      points,
      this.buildingRegistry.list(),
      this.groundResolver
    );
  }
}
