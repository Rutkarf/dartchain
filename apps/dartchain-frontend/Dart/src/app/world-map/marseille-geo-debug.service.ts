import { Injectable, inject } from '@angular/core';
import * as THREE from 'three';

import { MapConfigService } from './map-config.service';
import { GeoCoordinateService } from './geo-coordinate.service';
import {
  GEO_REFERENCE_CONFIG,
  GEOGRAPHIC_DATA_SOURCES,
  MARSEILLE_GEO_ORIGIN,
  MARSEILLE_VALIDATION_ANCHORS,
  type BuildingPlacementAudit,
} from './geo-reference.config';
import { classifyPlacementError } from './geo-building.util';
import { METRO_SPAWN_ANCHOR } from './map-configuration';
import { captureCalibrationSnapshot } from './marseille-twin/calibration-diagnostics';

export interface MarseilleGeoDebugSnapshot {
  geoSourceCount: number;
  activeGeoSource: string;
  sourceCrs: string;
  worldCrs: string;
  originLatitude: number;
  originLongitude: number;
  metersPerWorldUnit: number;
  mirrorGeoPosition: { latitude: number; longitude: number };
  mirrorWorldPosition: { x: number; y: number; z: number };
  mirrorErrorMeters: number;
  buildingCount: number;
  visibleBuildingCount: number;
  estimatedBuildingCount: number;
  criticalPlacementErrors: number;
  audits: BuildingPlacementAudit[];
  ombriereLengthDeltaMeters: number;
  ombriereWidthDeltaMeters: number;
  spawnApplyAtRuntime: false;
}

@Injectable({ providedIn: 'root' })
export class MarseilleGeoDebugService {
  private readonly mapConfig = inject(MapConfigService);
  private readonly geo = inject(GeoCoordinateService);

  private panel: HTMLDivElement | null = null;
  private visible = false;
  private audits: BuildingPlacementAudit[] = [];
  private buildingCount = 0;
  private estimatedBuildingCount = 0;

  attach(): void {
    if (typeof document === 'undefined' || this.panel) return;
    this.panel = document.createElement('div');
    this.panel.id = 'marseille-geo-debug-panel';
    this.panel.style.cssText =
      'position:fixed;left:8px;bottom:8px;z-index:99990;max-width:420px;' +
      'padding:10px 12px;font:11px/1.45 monospace;color:#dff7ff;' +
      'background:rgba(6,12,22,0.92);border:1px solid rgba(95,252,255,0.35);' +
      'border-radius:8px;display:none;pointer-events:none;white-space:pre-wrap;';
    document.body.appendChild(this.panel);
    document.addEventListener('keydown', this.onKeyDown);
  }

  dispose(): void {
    document.removeEventListener('keydown', this.onKeyDown);
    this.panel?.remove();
    this.panel = null;
  }

  setBuildingStats(count: number, estimated: number): void {
    this.buildingCount = count;
    this.estimatedBuildingCount = estimated;
  }

  setAudits(audits: BuildingPlacementAudit[]): void {
    this.audits = audits;
    if (this.visible) this.render();
  }

  buildSnapshot(): MarseilleGeoDebugSnapshot {
    const mirrorWorld = new THREE.Vector3(
      METRO_SPAWN_ANCHOR.mirror.x,
      METRO_SPAWN_ANCHOR.mirror.y,
      METRO_SPAWN_ANCHOR.mirror.z
    );
    const mirrorGeo = this.geo.worldToGeo(mirrorWorld);
    const originWorld = this.geo.geoToWorld(
      MARSEILLE_GEO_ORIGIN.latitude,
      MARSEILLE_GEO_ORIGIN.longitude,
      0
    );
    const critical = this.audits.filter(
      (a) => (a.errorMeters ?? 0) >= 15 || a.intersectsWater
    ).length;
    const calibration = captureCalibrationSnapshot();

    return {
      geoSourceCount: GEOGRAPHIC_DATA_SOURCES.length,
      activeGeoSource: 'osm-overpass-marseille-buildings',
      sourceCrs: GEO_REFERENCE_CONFIG.sourceCrs,
      worldCrs: GEO_REFERENCE_CONFIG.worldCrs,
      originLatitude: this.mapConfig.configuration.latitudeOrigin,
      originLongitude: this.mapConfig.configuration.longitudeOrigin,
      metersPerWorldUnit: this.mapConfig.configuration.worldScale,
      mirrorGeoPosition: mirrorGeo,
      mirrorWorldPosition: {
        x: mirrorWorld.x,
        y: mirrorWorld.y,
        z: mirrorWorld.z,
      },
      mirrorErrorMeters: mirrorWorld.distanceTo(originWorld),
      buildingCount: this.buildingCount,
      visibleBuildingCount: this.buildingCount,
      estimatedBuildingCount: this.estimatedBuildingCount,
      criticalPlacementErrors: critical,
      audits: this.audits,
      ombriereLengthDeltaMeters: calibration.ombriereLengthDeltaMeters,
      ombriereWidthDeltaMeters: calibration.ombriereWidthDeltaMeters,
      spawnApplyAtRuntime: calibration.spawnApplyAtRuntime,
    };
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'F11') return;
    if (!this.mapConfig.configuration.enableDebug) return;
    this.visible = !this.visible;
    if (this.panel) {
      this.panel.style.display = this.visible ? 'block' : 'none';
    }
    if (this.visible) this.render();
  };

  private render(): void {
    if (!this.panel) return;
    const snap = this.buildSnapshot();
    const auditLines = snap.audits
      .slice(0, 6)
      .map((a) => {
        const err = a.errorMeters ?? 0;
        const cls = classifyPlacementError(err);
        return `${a.buildingId}: err=${err.toFixed(1)}m [${cls}] src=${a.source}`;
      })
      .join('\n');

    this.panel.textContent =
      `MARSEILLE GEO DEBUG (F11)\n` +
      `geoSourceCount: ${snap.geoSourceCount}\n` +
      `activeGeoSource: ${snap.activeGeoSource}\n` +
      `sourceCrs: ${snap.sourceCrs}\n` +
      `worldCrs: ${snap.worldCrs}\n` +
      `origin: ${snap.originLatitude.toFixed(7)}, ${snap.originLongitude.toFixed(7)}\n` +
      `metersPerWorldUnit: ${snap.metersPerWorldUnit}\n` +
      `north: −Z | east: +X\n` +
      `northRotation: ${GEO_REFERENCE_CONFIG.northRotationRadians} rad\n` +
      `axisMapping: E=${GEO_REFERENCE_CONFIG.axisMapping.east} N=${GEO_REFERENCE_CONFIG.axisMapping.north}\n\n` +
      `mirrorGeo: ${snap.mirrorGeoPosition.latitude.toFixed(7)}, ${snap.mirrorGeoPosition.longitude.toFixed(7)}\n` +
      `mirrorWorld: (${snap.mirrorWorldPosition.x.toFixed(1)}, ${snap.mirrorWorldPosition.y.toFixed(1)}, ${snap.mirrorWorldPosition.z.toFixed(1)})\n` +
      `mirrorErrorMeters: ${snap.mirrorErrorMeters.toFixed(2)}\n\n` +
      `buildingCount: ${snap.buildingCount}\n` +
      `estimatedBuildingCount: ${snap.estimatedBuildingCount}\n` +
      `criticalPlacementErrors: ${snap.criticalPlacementErrors}\n` +
      `ombriereDelta: ${snap.ombriereLengthDeltaMeters.toFixed(1)}×${snap.ombriereWidthDeltaMeters.toFixed(1)} m\n` +
      `spawnApplyAtRuntime: ${snap.spawnApplyAtRuntime}\n\n` +
      (auditLines || '(no building audits yet)');
  }
}
