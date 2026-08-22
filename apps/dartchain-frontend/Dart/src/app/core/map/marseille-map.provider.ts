import { Injectable, inject } from '@angular/core';
import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';

import { MapConfigService } from './map-config.service';
import { GeoCoordinateService } from './geo-coordinate.service';
import { OSMBuildingProvider } from './osm-building.provider';
import { OSMStreetProvider } from './osm-street.provider';
import { GeoJsonBuildingProvider } from './geojson-building.provider';
import {
  enrichAuditWithReference,
  indexCadastralBuildings,
  shouldSkipOsmForCadastre,
} from './geojson-fusion.util';
import {
  appendOsmRoadCurbs,
  appendOsmStreetPolygons,
  buildCityGroundMeshes,
  highwayWidthMeters,
  osmWayToPolygonDefs,
} from './ground-mesh.builder';
import {
  createGroundMaterialSet,
  disposeGroundMaterialSet,
  disposeGroundTextures,
  type GroundMaterialSet,
  type GroundTextureOwnership,
} from './ground-material.factory';
import {
  VIEUX_PORT_CROSSWALKS,
  VIEUX_PORT_GROUND_CORRIDORS,
  VIEUX_PORT_GROUND_PLATES,
} from './ground-layout.data';
import { groundTopY } from './ground-surface.config';
import { groundSurfaceHitAt } from './ground-surface.util';
import type { MapProvider, SurfaceProvider } from './map-provider.interface';
import {
  MARSEILLE_HARBOR_WATER,
  METRO_SPAWN_ANCHOR,
  MIRROR_SECOND_BUILDING_ID,
  SCENE_COPY,
  VIEUX_PORT_BUILDING_ALIGNMENT_VIEW,
  VIEUX_PORT_METRO_MIRROR_VIEW,
  type MapQuality,
} from './map-configuration';
import { mapPerfProfile } from './marseille-perf.config';
import { osmContentBuildingCap, osmContentStreetCap } from './osm-content-parity.config';
import { sortOsmEntriesByContentPriority } from './osm-content-priority.util';
import { clearOsmExtrusionCache, getOsmExtrusionCache } from './osm-extrusion-cache.util';
import {
  shouldYieldOsmMeshBatch,
  yieldOsmMeshBatch,
  yieldToIdleBatch,
} from './idle-batch.util';
import {
  cameraMovedEnough,
  isSimIdle,
  shouldRunSimTick,
} from './marseille-sim-throttle.util';
import {
  DualContextGovernorService,
  effectiveMapIdleTickSkip,
  scaledStreamCheckIntervalMs,
} from '../utils/dual-context-governor.service';
import {
  LANDMARK_OSM_SOURCE_IDS,
  MARSEILLE_LANDMARK_BUILDINGS,
  MARSEILLE_VALIDATION_ANCHORS,
  VIEUX_PORT_CORE_BUILDING_RADIUS,
  type BuildingPlacementAudit,
} from './geo-reference.config';
import {
  applyBuildingMaterialDefaults,
  createGeoBuildingMesh,
  createOsmFootprintBuildingMesh,
  footprintBounds,
  footprintCentroid,
} from './geo-building.util';
import {
  createCadastrePlinthMaterial,
  createCadastreRoofMaterial,
  createCadastreWallMaterial,
  createCorniceMaterial,
  createHaussmannRoofMaterial,
  createHaussmannWallMaterial,
  tuneWallMaterialForFootprint,
  type FacadeTextureOwnership,
} from './building-facade.factory';
import {
  cadastreMaterialSeed,
  resolveCadastreVisualTier,
} from './cadastre-building-visual.util';
import {
  ACCURATE_CITY_BUILDING_MIN_COUNT,
  ACCURATE_CITY_BUILDINGS,
  generateCanebiereSegment,
  worldToCanebiereAlong,
} from './accurate-city-buildings.data';
import type { GeoBuilding } from './geo-reference.config';
import { MarseilleGeoDebugService } from './marseille-geo-debug.service';
import { buildVieuxPortSpawnFacades, VIEUX_PORT_SPAWN_FACADES } from './vieux-port-spawn-facades.util';
import { buildVieuxPortMirrorCanopy, MIRROR_CANOPY } from './vieux-port-mirror-canopy.util';
import {
  createCyberpunkOverlayGroup,
  disposeCyberpunkOverlay,
  type CyberpunkOverlayBuild,
} from './marseille-twin/cyberpunk-overlay.factory';
import { shouldAttachCyberpunkOverlay } from './marseille-twin/cyberpunk-overlay.config';
import {
  disableOverlayOnCamera,
  enableOverlayOnCamera,
} from './marseille-twin/overlay-layer';
import {
  colliderIntersectsStreetCorridor,
  isHarborLandAt,
  isHarborWaterAt,
  isHarborWaterBlockedAt,
} from './vieux-port-layout.util';
import {
  createHarborFoamMaterial,
  createHarborPitWallMaterial,
  createHarborQuayCapMaterial,
  createHarborWaterDeepMaterial,
} from './marseille-water-visual.util';
import {
  buildHarborWaterSurfaceMesh,
  defaultHarborWaterPolygons,
  osmRingToHarborPolygon,
  ringCentroid,
} from './harbor-water-mesh.builder';
import {
  createHarborWaterShaderMaterial,
  tickHarborWaterShader,
  type HarborWaterShaderMaterial,
} from './harbor-water.shader';
import { HARBOR_WATER_SHADER_CONFIG, harborWaterSubdivisionsForQuality } from './harbor-water.config';
import {
  applyHarborWaterAtmosphereColors,
  bindHarborWaterEnvironmentMap,
  harborWaterShoreDistortion,
} from './harbor-water-atmosphere.util';
import {
  createHarborPlanarReflector,
  disposeHarborPlanarReflector,
} from './harbor-water-reflection.util';
import { tickWetPavementMaterials } from './wet-pavement.util';
import { OSMWaterProvider } from './osm-water.provider';
import { WorldStreamingManager } from './world-streaming.manager';
import { TokenCellService } from './token-cell.service';
import { M4t3rPickupFxService } from './m4t3r-pickup-fx.service';
import { M4t3rCoinPickupFxService } from './m4t3r-coin-pickup-fx.service';
import { M4t3rDebugOverlay } from './m4t3r-debug-overlay';
import { FootprintTrailManager } from './footprint-trail-manager.service';
import { M4t3rCollectTrailVisualService } from './m4t3r-collect-trail-visual.service';
import { buildPrototypeTerrainGeometry } from './prototype-terrain.builder';
import { buildQuayStreetProps, buildQuayHarborExtras } from './quay-props.util';
import { buildVieuxPortStreetProps } from './street-props.util';
import { urbanPropsScope } from './urban-props.config';
import {
  createArchitecturalGlassMaterial,
  createQuaySurfaceMaterial,
} from './pbr-material.util';
import {
  corridorStreetLampSpecs,
  type StreetLampSpec,
} from './street-lamp-lighting.util';
import {
  createStreetLampLightPool,
  type StreetLampLightPool,
} from './street-lamp-light-pool.util';
import { nightStreetLampsEnabled } from './night-lighting.config';
import {
  applyBuildingLodLevel,
  buildingLodDistanceFrom,
  tagBuildingLodCenter,
} from './building-lod.util';
import { BuildingLodSpatialGrid } from './building-lod-spatial-grid.util';
import {
  batchGroundMeshesByMaterial,
  BuildingMassingInstancedPool,
} from './building-gpu-batch.util';
import {
  buildingLodAtDistance,
  buildingLodAtDistanceForSkyline,
} from './marseille-twin/building-lod.model';
import { buildHeroSkylineLandmarkSet } from './marseille-twin/landmark-hero-mesh.builder';
import {
  attachHarborWestLandmarkDetails,
  attachMirrorAdjacentStorefrontDetails,
} from './marseille-twin/landmark-hero-detail.util';
import { MarseilleAtmosphereService } from './marseille-atmosphere.service';
import { WigleBuildingRegistryService } from './wigle/wigle-building-registry.service';
import { WigleVisualizationService } from './wigle/wigle-visualization.service';
import { CombinedPerfHudService } from '../utils/combined-perf-hud.service';

/** Largeur du plan terrain prototype (est–ouest). */
const LAND_TERRAIN_WIDTH = 260;
/** Position Z du quai sud (Belges), dérivée de la géométrie port. */
const HARBOR_QUAY_Z = MARSEILLE_HARBOR_WATER.quayZ;
/** Zone libre autour du spawn — aucun collider bâtiment. */
const SPAWN_COLLIDER_CLEARANCE_M = 12;
const CYBERPUNK_ART_DIRECTION = {
  lights: {
    moonColor: 0xb7c8ff,
    moonIntensity: 0.82,
    hemiSky: 0x12141c,
    hemiGround: 0x08060c,
    hemiIntensity: 0.22,
    harborCyan: 0x42dcff,
    harborCyanIntensity: 0.78,
    harborMagenta: 0xff51c8,
    harborMagentaIntensity: 0.62,
    depthBlue: 0x6aa7ff,
    depthBlueIntensity: 0.34,
  },
  atmosphere: {
    hazeNearOpacity: 0.16,
    hazeFarOpacity: 0.22,
  },
    streets: {
    centerLineOpacity: 0.82,
    laneGlowOpacity: 0.16,
    wetRoughness: 0.32,
    wetMetalness: 0.38,
    wetColor: 0x3a3f48,
    quayRoughness: 0.34,
    quayMetalness: 0.26,
    quaySheenOpacity: 0.08,
    roadThickness: 0.22,
    sidewalkHeight: 0.34,
    curbHeight: 0.28,
    crosswalkStripeHeight: 0.045,
  },
  buildings: {
    windowVariation: 0.48,
    emissiveIntensity: 0.28,
    neonPalette: [0xff3ecf, 0x40e0ff, 0x7a5cff, 0xffe600] as const,
    neonPanelOpacity: 0.52,
    glassColor: 0x8fd8ff,
    glassOpacity: 0.3,
    glassRoughness: 0.14,
    glassMetalness: 0.78,
  },
} as const;
const OSM_QUERY_BOUNDS = {
  // ~1.6 km autour de l'Ombrière — Vieux-Port / Panier / Joliette / Pharo proche
  south: 43.2800,
  north: 43.3095,
  west: 5.3540,
  east: 5.3940,
} as const;

/** Cap soft : assez haut pour charger tous les footprints OSM du bbox. */
const OSM_BUILDING_MESH_CAP = 3200;

interface PrototypeBuildingSpec {
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  color?: number;
}

interface PrototypeCollider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

interface OSMVisualMesh {
  building: THREE.Mesh;
  roof: THREE.Mesh | null;
  center: THREE.Vector3;
  height: number;
}

/**
 * Fournisseur Marseille OSM — prototype étape 2/3 :
 * sol plat distinct du legacy, positionné via GeoCoordinateService.
 * Terrain DEM / bâtiments OSM : étapes 5–6.
 */
@Injectable({ providedIn: 'root' })
export class MarseilleMapProvider implements MapProvider {
  readonly id = 'marseille-osm-three' as const;

  private readonly config = inject(MapConfigService);
  private readonly geo = inject(GeoCoordinateService);
  private readonly osmBuildings = inject(OSMBuildingProvider);
  private readonly geoJsonBuildings = inject(GeoJsonBuildingProvider);
  private readonly osmStreets = inject(OSMStreetProvider);
  private readonly osmWater = inject(OSMWaterProvider);
  private readonly streaming = inject(WorldStreamingManager);
  private readonly tokenCells = inject(TokenCellService);
  private readonly pickupFx = inject(M4t3rPickupFxService);
  private readonly coinPickupFx = inject(M4t3rCoinPickupFxService);
  private readonly footprints = inject(FootprintTrailManager);
  private readonly collectTrailVisual = inject(M4t3rCollectTrailVisualService);
  private readonly debugOverlay = inject(M4t3rDebugOverlay);
  private readonly wigleRegistry = inject(WigleBuildingRegistryService);
  private readonly wigleVisualization = inject(WigleVisualizationService);
  private readonly geoDebug = inject(MarseilleGeoDebugService);
  private readonly atmosphere = inject(MarseilleAtmosphereService);
  private readonly dualContextGovernor = inject(DualContextGovernorService);
  private readonly combinedPerfHud = inject(CombinedPerfHudService);

  private buildingLodGrid: BuildingLodSpatialGrid | null = null;
  private readonly lastLodActiveBuildings = new Set<THREE.Object3D>();
  private massingBatchRoot: THREE.Group | null = null;
  private massingBatchPool: BuildingMassingInstancedPool | null = null;

  private scene: THREE.Scene | null = null;
  private gameplayCamera: THREE.Camera | null = null;
  private root: THREE.Group | null = null;
  private terrainMesh: THREE.Mesh | null = null;
  private terrainMaterial: THREE.MeshStandardMaterial | null = null;
  private terrainBorderMaterial: THREE.LineBasicMaterial | null = null;
  private readonly buildingMaterials: THREE.Material[] = [];
  private readonly prototypeColliders: PrototypeCollider[] = [];
  private readonly ownedGeometries: THREE.BufferGeometry[] = [];
  private readonly ownedTextures: THREE.Texture[] = [];
  private osmRoot: THREE.Group | null = null;
  private readonly placedBuildingIds = new Set<string>();
  private accurateWallMaterials: THREE.MeshStandardMaterial[] = [];
  private accurateRoofMaterial: THREE.MeshStandardMaterial | null = null;
  private cadastreWallMaterials: THREE.MeshStandardMaterial[] = [];
  private cadastreRoofMaterial: THREE.MeshStandardMaterial | null = null;
  private cadastrePlinthMaterial: THREE.MeshStandardMaterial | null = null;
  private lastStreamAlongBucket = Number.NaN;
  private lastOsmStreamAt = 0;
  private prototypeBuildingsLoaded = false;
  private prototypeColliderCount = 0;
  private canopyReflector: Reflector | null = null;
  private harborPlanarReflector: Reflector | null = null;
  private waterEnvBound = false;
  private waterSurfaceMeshes: THREE.Mesh[] = [];
  private waterShaderMaterial: HarborWaterShaderMaterial | null = null;
  private harborDeepMaterial: THREE.MeshStandardMaterial | null = null;
  private waterElapsedSeconds = 0;
  private readonly foamOverlayMeshes: Array<{ mesh: THREE.Mesh; baseOpacity: number }> = [];
  private buildingLodAccumSeconds = 0;
  private wetPavementFrame = 0;
  private simFrameIndex = 0;
  private lastSimCameraX = Number.NaN;
  private lastSimCameraZ = Number.NaN;
  private lastStreetLampFocusX = Number.NaN;
  private lastStreetLampFocusZ = Number.NaN;
  private lastLodCameraX = Number.NaN;
  private lastLodCameraZ = Number.NaN;
  private waterRoot: THREE.Group | null = null;
  private validationCamera: THREE.PerspectiveCamera | null = null;
  private alignmentCamera: THREE.PerspectiveCamera | null = null;
  private readonly placementAudits: BuildingPlacementAudit[] = [];
  private cyberpunkOverlay: CyberpunkOverlayBuild | null = null;
  private groundRoot: THREE.Group | null = null;
  private osmGroundRoot: THREE.Group | null = null;
  private groundMaterials: GroundMaterialSet | null = null;
  private quayLampSpecs: StreetLampSpec[] = [];
  private urbanPropsRoot: THREE.Group | null = null;
  private streetLampLightPool: StreetLampLightPool | null = null;
  private readonly groundTextureOwner: GroundTextureOwnership = { textures: [] };
  private readonly buildingFacadeTextureOwner: FacadeTextureOwnership = { textures: [] };
  private buildingCorniceMaterial: THREE.MeshStandardMaterial | null = null;
  private cadastralIds = new Set<string>();
  private cadastralSourceIds = new Set<string>();

  private readonly surfaceProvider: SurfaceProvider = {
    getSurfaceHeight: async (worldPosition) =>
      this.resolveSurfaceHeight(worldPosition.x, worldPosition.z),
    getSurfaceHeightSync: (x, z) => this.resolveSurfaceHeight(x, z),
    isWalkable: (x, z, radius) => this.isWalkable(x, z, radius),
  };

  async initialize(scene: THREE.Scene, camera: THREE.Camera): Promise<void> {
    try {
      this.removeLegacyMeshes(scene);
      this.scene = scene;
      this.gameplayCamera = camera;
      this.root = new THREE.Group();
      this.root.name = 'marseille-map-root';
      scene.add(this.root);

      this.massingBatchRoot = new THREE.Group();
      this.massingBatchRoot.name = 'building-massing-batch-root';
      this.root.add(this.massingBatchRoot);
      this.massingBatchPool = new BuildingMassingInstancedPool(this.massingBatchRoot);

      this.createPrototypeTerrain();
      this.createPrototypeBuildings();
      this.createOrientationDebugHelpers();

      // PRIORITÉ SPAWN (faible latence) :
      // - On attache station + M4T3R avant le chargement OSM lourd, pour éviter le "trop tard" au premier rendu.
      this.streaming.attach(this.root);
      this.tokenCells.attach(this.root);
      this.pickupFx.attach(scene);
      this.coinPickupFx.attach(scene);

      const spawnPos = this.getStartWorldPosition();
      this.streaming.update(spawnPos);
      this.tokenCells.initializeField(spawnPos);

      this.footprints.attach(this.root);
      this.collectTrailVisual.attach(this.root);
      this.addMetroStation();
      this.addSceneLighting();
      this.attachCyberpunkOverlayLayer();

      // IMPORTANT (anti latence) :
      // Ne pas bloquer l'initialisation du provider sur le chargement OSM lourd.
      // On le lance en tâche de fond : les contrôles + station + M4T3R peuvent démarrer immédiatement.
      // Phase 4 cadastre GeoJSON puis OSM (fusion cadastre > OSM).
      void this.loadCadastreGeoJson()
        .catch((err) => {
          console.warn('[MarseilleMapProvider] (async) GeoJSON cadastre echoue — OSM seul.', err);
        })
        .finally(() => {
          void this.loadOsmBuildings().catch((err) => {
            console.warn('[MarseilleMapProvider] (async) Echec chargement OSM.', err);
          });
        });

      this.createOriginMarker();
      this.createValidationCamera();
      this.geoDebug.attach();
      this.debugOverlay.attach(this.root ?? undefined);
      this.ensureCityMassing();

      if (this.config.configuration.enableDebug) {
        console.info(
          '[MarseilleMapProvider] Carte prototype chargee (terrain plat Vieux-Port).'
        );
      } else {
        console.info(
          '[MarseilleMapProvider] init() ok — massing:',
          this.getCityMassingCount()
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[MarseilleMapProvider] init() fatal — fallback legacy attendu.', message, error);
      // IMPORTANT: on ne throw pas ici, pour éviter de masquer l'objectif étape 2.
      // Le provider peut rester partiellement affiché si certaines parties échouent.
    }
  }

  private lastUpdateTime = 0;

  update(cameraPosition: THREE.Vector3): void {
    const now = performance.now();
    const deltaSeconds = this.lastUpdateTime > 0 ? (now - this.lastUpdateTime) * 0.001 : 0.016;
    this.lastUpdateTime = now;
    this.simFrameIndex++;

    const perf = mapPerfProfile(this.renderQuality());
    const dualHints = this.dualContextGovernor.getFrameHints();
    const idle = isSimIdle(
      this.lastSimCameraX,
      this.lastSimCameraZ,
      cameraPosition.x,
      cameraPosition.z
    );
    const runSim = shouldRunSimTick(
      this.simFrameIndex,
      perf.mapSimTickSkip,
      effectiveMapIdleTickSkip(perf.mapSimIdleTickSkip, dualHints.mapIdleTickSkipBoost),
      idle
    );

    if (runSim) {
      this.lastSimCameraX = cameraPosition.x;
      this.lastSimCameraZ = cameraPosition.z;
      this.tickHarborWaterSystems(deltaSeconds);
      this.tickBuildingLodIfDue(cameraPosition, deltaSeconds, perf);
      this.streaming.update(cameraPosition);
      this.streamCityBuildingsAround(
        cameraPosition,
        scaledStreamCheckIntervalMs(perf.streamCheckIntervalMs, dualHints.streamIntervalScale)
      );
      this.tokenCells.update(cameraPosition);
      this.footprints.tickFade();
      this.collectTrailVisual.tickFade();
      if (
        this.streetLampLightPool &&
        cameraMovedEnough(
          this.lastStreetLampFocusX,
          this.lastStreetLampFocusZ,
          cameraPosition.x,
          cameraPosition.z,
          perf.lodCameraMoveThresholdM
        )
      ) {
        this.streetLampLightPool.update(cameraPosition.x, cameraPosition.z);
        this.lastStreetLampFocusX = cameraPosition.x;
        this.lastStreetLampFocusZ = cameraPosition.z;
      }
    } else {
      this.waterElapsedSeconds += deltaSeconds;
    }

    // Phase 35a — rotation M4T3R near @ rAF, indépendant de mapSimTickSkip.
    this.tokenCells.tickVisuals(deltaSeconds);

    if (this.config.configuration.enableDebug) {
      this.debugOverlay.updatePositions(cameraPosition);
      this.debugOverlay.sampleFrame(deltaSeconds * 1000);
    }
  }

  /** Eau, mouillé, foam — throttlé par profil perf (Phase 15). */
  private tickHarborWaterSystems(deltaSeconds: number): void {
    if (this.waterSurfaceMeshes.length === 0) return;

    const perf = mapPerfProfile(this.renderQuality());
    this.waterElapsedSeconds += deltaSeconds;

    const animateWater =
      perf.waterAnimTickSkip <= 0 ||
      this.simFrameIndex % (perf.waterAnimTickSkip + 1) === 0;

    if (animateWater) {
      const harbor = MARSEILLE_HARBOR_WATER;
      const t = performance.now() * HARBOR_WATER_SHADER_CONFIG.bobSpeed;
      const y = harbor.waterSurfaceY + Math.sin(t) * HARBOR_WATER_SHADER_CONFIG.bobAmplitude;
      for (const mesh of this.waterSurfaceMeshes) {
        mesh.position.y = y;
      }
      if (this.waterShaderMaterial) {
        tickHarborWaterShader(this.waterShaderMaterial, this.waterElapsedSeconds);
        if (!this.waterEnvBound) {
          const env = this.atmosphere.getEnvironmentMap();
          if (env) {
            bindHarborWaterEnvironmentMap(
              this.waterShaderMaterial,
              env,
              this.renderQuality()
            );
            this.waterEnvBound = true;
          }
        }
      }
    }

    if (this.groundMaterials) {
      tickWetPavementMaterials(
        {
          road: this.groundMaterials.road,
          sidewalk: this.groundMaterials.sidewalk,
          quay: this.groundMaterials.quay,
        },
        this.waterElapsedSeconds,
        this.renderQuality(),
        this.wetPavementFrame++
      );
    }

    const foamSkip = perf.foamTickSkip;
    if (foamSkip <= 0 || this.simFrameIndex % (foamSkip + 1) === 0) {
      this.tickFoamOverlays();
    }
  }

  private tickBuildingLodIfDue(
    cameraPosition: THREE.Vector3,
    deltaSeconds: number,
    perf: ReturnType<typeof mapPerfProfile>
  ): void {
    if (!perf.buildingLodEnforce) return;

    this.buildingLodAccumSeconds += deltaSeconds;
    if (this.buildingLodAccumSeconds < perf.buildingLodTickSeconds) return;

    const moved = cameraMovedEnough(
      this.lastLodCameraX,
      this.lastLodCameraZ,
      cameraPosition.x,
      cameraPosition.z,
      perf.lodCameraMoveThresholdM
    );
    this.buildingLodAccumSeconds = 0;
    if (!moved && Number.isFinite(this.lastLodCameraX)) return;

    this.lastLodCameraX = cameraPosition.x;
    this.lastLodCameraZ = cameraPosition.z;
    this.updateBuildingLod(cameraPosition);
  }

  async getSurfaceHeight(worldPosition: THREE.Vector3): Promise<number> {
    return this.resolveSurfaceHeight(worldPosition.x, worldPosition.z);
  }

  /** Hauteur sol : route / trottoir / esplanade / quai / eau (Phase 1 ground stack). */
  private resolveSurfaceHeight(x: number, z: number): number {
    const harbor = MARSEILLE_HARBOR_WATER;
    if (isHarborWaterAt(x, z)) return harbor.waterSurfaceY;

    const hit = groundSurfaceHitAt(x, z);
    if (hit.kind !== 'default') {
      return hit.topY;
    }

    return harbor.walkSurfaceY;
  }

  private tickFoamOverlays(): void {
    if (this.foamOverlayMeshes.length === 0) return;
    const pulse = 0.74 + 0.26 * Math.sin(this.waterElapsedSeconds * 2.4);
    for (const entry of this.foamOverlayMeshes) {
      const mat = entry.mesh.material;
      if (mat instanceof THREE.MeshBasicMaterial) {
        mat.opacity = entry.baseOpacity * pulse;
      }
    }
  }

  private updateBuildingLod(cameraPosition: THREE.Vector3): void {
    const perf = mapPerfProfile(this.renderQuality());
    if (!perf.buildingLodEnforce) return;

    const grid = this.ensureBuildingLodGrid();
    const lodPolicy = {
      fullMaxMeters: perf.lodFullMaxM,
      massingMaxMeters: perf.lodMassingMaxM,
      impostorMaxMeters: perf.lodImpostorMaxM,
    };
    const queryRadius = perf.lodImpostorMaxM + grid.cellSizeM;
    const candidates = grid.queryRadius(cameraPosition.x, cameraPosition.z, queryRadius);
    const currentActive = new Set<THREE.Object3D>();

    for (const child of candidates) {
      if (!child.userData['geoBuilding']) continue;
      currentActive.add(child);
      const dist = buildingLodDistanceFrom(child, cameraPosition.x, cameraPosition.z);
      const lod = child.userData['skylineLandmark']
        ? buildingLodAtDistanceForSkyline(dist)
        : buildingLodAtDistance(dist, {
            hero:
              child.userData['heroLandmark'] === true ||
              child.userData['visualTier'] === 'hero',
            policy: lodPolicy,
          });
      applyBuildingLodLevel(child, lod);
      this.massingBatchPool?.syncLod(child, lod);
    }

    for (const prev of this.lastLodActiveBuildings) {
      if (!currentActive.has(prev)) {
        applyBuildingLodLevel(prev, 'culled');
      }
    }
    this.lastLodActiveBuildings.clear();
    for (const building of currentActive) {
      this.lastLodActiveBuildings.add(building);
    }
    this.combinedPerfHud.reportLod(candidates.length, grid.size);
  }

  private ensureBuildingLodGrid(): BuildingLodSpatialGrid {
    if (!this.buildingLodGrid) {
      const perf = mapPerfProfile(this.renderQuality());
      this.buildingLodGrid = new BuildingLodSpatialGrid(perf.lodSpatialCellSizeM);
    }
    return this.buildingLodGrid;
  }

  private registerBuildingForLod(group: THREE.Object3D, centerX: number, centerZ: number): void {
    tagBuildingLodCenter(group, centerX, centerZ);
    this.ensureBuildingLodGrid().register(group, centerX, centerZ);
    try {
      this.massingBatchPool?.register(group);
    } catch (err) {
      console.warn('[MarseilleMapProvider] massing batch register skip', group.name, err);
    }
  }

  private registerBuildingVisual(
    group: THREE.Group,
    center: THREE.Vector3,
    visuals: OSMVisualMesh[]
  ): void {
    this.registerBuildingForLod(group, center.x, center.z);
    const wallMesh = group.children.find(
      (c) => c instanceof THREE.Mesh && !String(c.name).endsWith('-roof')
    ) as THREE.Mesh | undefined;
    if (!wallMesh) return;
    const roofMesh = group.getObjectByName(`${group.name}-roof`) as THREE.Mesh | null;
    const height =
      (group.userData['heightMeters'] as number | undefined) ??
      (roofMesh ? roofMesh.position.y : 12);
    visuals.push({
      building: wallMesh,
      roof: roofMesh,
      center,
      height,
    });
  }

  getSurfaceProvider(): SurfaceProvider {
    return this.surfaceProvider;
  }

  dispose(): void {
    if (this.root && this.scene) {
      this.scene.remove(this.root);
    }
    this.terrainMesh?.geometry.dispose();
    this.terrainMaterial?.dispose();
    this.terrainBorderMaterial?.dispose();
    for (const material of this.buildingMaterials) {
      material.dispose();
    }
    for (const geometry of this.ownedGeometries) {
      geometry.dispose();
    }
    for (const texture of this.ownedTextures) {
      texture.dispose();
    }
    disposeGroundTextures(this.groundTextureOwner);
    for (const texture of this.buildingFacadeTextureOwner.textures) {
      texture.dispose();
    }
    this.buildingFacadeTextureOwner.textures.length = 0;
    if (this.canopyReflector) {
      this.canopyReflector.getRenderTarget()?.dispose();
      this.canopyReflector.geometry.dispose();
      this.canopyReflector = null;
    }
    if (this.harborPlanarReflector) {
      disposeHarborPlanarReflector(this.harborPlanarReflector);
      this.harborPlanarReflector = null;
    }
    this.waterEnvBound = false;
    this.buildingMaterials.length = 0;
    this.ownedGeometries.length = 0;
    this.ownedTextures.length = 0;
    this.prototypeColliders.length = 0;
    this.buildingLodGrid?.clear();
    this.lastLodActiveBuildings.clear();
    this.buildingLodGrid = null;
    this.massingBatchPool?.dispose();
    this.massingBatchPool = null;
    this.massingBatchRoot = null;
    this.tokenCells.dispose();
    this.footprints.dispose();
    this.collectTrailVisual.dispose();
    this.streaming.dispose();
    this.pickupFx.dispose();
    this.coinPickupFx.dispose();
    this.debugOverlay.dispose();
    this.wigleRegistry.clear();
    this.geoDebug.dispose();
    clearOsmExtrusionCache();
    if (this.cyberpunkOverlay) {
      disposeCyberpunkOverlay(this.cyberpunkOverlay);
      this.cyberpunkOverlay = null;
    }
    if (this.gameplayCamera) {
      disableOverlayOnCamera(this.gameplayCamera);
      this.gameplayCamera = null;
    }
    this.placementAudits.length = 0;
    this.cadastralIds.clear();
    this.cadastralSourceIds.clear();
    this.geoJsonBuildings.clearCache();
    this.groundRoot = null;
    this.osmGroundRoot = null;
    this.groundMaterials = null;
    this.urbanPropsRoot = null;
    this.root = null;
    this.osmRoot = null;
    this.placedBuildingIds.clear();
    this.accurateWallMaterials = [];
    this.buildingCorniceMaterial = null;
    this.accurateRoofMaterial = null;
    this.cadastreWallMaterials = [];
    this.cadastreRoofMaterial = null;
    this.cadastrePlinthMaterial = null;
    this.lastStreamAlongBucket = Number.NaN;
    this.prototypeBuildingsLoaded = false;
    this.prototypeColliderCount = 0;
    this.terrainMesh = null;
    this.terrainMaterial = null;
    this.terrainBorderMaterial = null;
    this.waterSurfaceMeshes.length = 0;
    this.foamOverlayMeshes.length = 0;
    this.waterShaderMaterial = null;
    this.harborDeepMaterial = null;
    this.waterRoot = null;
    this.validationCamera = null;
    this.scene = null;
  }

  /** Point de départ du personnage en coordonnées Three.js. */
  getStartWorldPosition(): THREE.Vector3 {
    const start = this.config.configuration.startPosition;
    return this.geo.geoToWorld(start.latitude, start.longitude, start.altitude);
  }

  private createPrototypeTerrain(): void {
    if (!this.root) return;

    const terrainTexture = this.createTerrainGroundTexture();
    const normalMap =
      this.config.configuration.quality === 'low' ? null : this.createTerrainNormalTexture();
    this.terrainMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: terrainTexture,
      roughness: 0.85,
      metalness: 0.05,
      normalMap: normalMap ?? null,
      normalScale: normalMap ? new THREE.Vector2(0.3, 0.3) : undefined,
      side: THREE.FrontSide,
    });

    const harbor = MARSEILLE_HARBOR_WATER;
    const geometry = buildPrototypeTerrainGeometry(LAND_TERRAIN_WIDTH, harbor);
    this.ownedGeometries.push(geometry);

    this.terrainMesh = new THREE.Mesh(geometry, this.terrainMaterial);
    this.terrainMesh.name = 'marseille-terrain-prototype';
    this.terrainMesh.rotation.x = -Math.PI / 2;
    this.terrainMesh.position.set(0, 0, 0);
    this.terrainMesh.receiveShadow = false;
    this.root.add(this.terrainMesh);

    const borderGeo = new THREE.EdgesGeometry(geometry);
    this.terrainBorderMaterial = new THREE.LineBasicMaterial({
      color: 0x4a6741,
      transparent: true,
      opacity: 0.55,
    });
    const border = new THREE.LineSegments(borderGeo, this.terrainBorderMaterial);
    border.name = 'marseille-terrain-border';
    border.rotation.x = -Math.PI / 2;
    border.position.y = 0.05;
    this.root.add(border);

    if (this.config.configuration.enableDebug) {
      const axisGuide = new THREE.GridHelper(220, 11, 0x5a6d50, 0x607b5b);
      axisGuide.name = 'marseille-grid-guide';
      axisGuide.position.y = 0.01;
      this.root.add(axisGuide);
    }
  }

  private createTerrainGroundTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      const fallback = new THREE.CanvasTexture(canvas);
      this.ownedTextures.push(fallback);
      return fallback;
    }

    const gradient = ctx.createLinearGradient(0, 0, 1024, 1024);
    gradient.addColorStop(0, '#aab79b');
    gradient.addColorStop(0.5, '#97a88c');
    gradient.addColorStop(1, '#889980');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 1200; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const s = 1 + Math.random() * 3;
      const alpha = 0.02 + Math.random() * 0.04;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fillRect(x, y, s, s);
    }

    for (let i = 0; i < 600; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const s = 2 + Math.random() * 6;
      const alpha = 0.02 + Math.random() * 0.05;
      ctx.fillStyle = `rgba(40,52,37,${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, s, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2.8, 2.8);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    this.ownedTextures.push(texture);
    return texture;
  }

  private createTerrainNormalTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      const fallback = new THREE.CanvasTexture(canvas);
      this.ownedTextures.push(fallback);
      return fallback;
    }

    const image = ctx.createImageData(canvas.width, canvas.height);
    for (let i = 0; i < image.data.length; i += 4) {
      const n = Math.floor(Math.random() * 16) - 8;
      image.data[i] = 128 + n;
      image.data[i + 1] = 128 + n;
      image.data[i + 2] = 255;
      image.data[i + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(5.4, 5.4);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    this.ownedTextures.push(texture);
    return texture;
  }

  private createPrototypeBuildings(): void {
    if (!this.root) return;

    const boulevardMaterial = this.createPrototypeFacadeMaterial(0xd8c3a5, 'haussmann');
    const blockMaterial = this.createPrototypeFacadeMaterial(0xc7b299, 'stone');
    const accentMaterial = this.createPrototypeFacadeMaterial(0xe5d2b8, 'stone');

    const specs: PrototypeBuildingSpec[] = [
      { x: -88, z: -180, width: 28, depth: 30, height: 18, color: 0xd8c3a5 },
      { x: -46, z: -166, width: 24, depth: 30, height: 23, color: 0xc7b299 },
      { x: 56, z: -172, width: 32, depth: 30, height: 28, color: 0xe5d2b8 },
      { x: 88, z: -160, width: 25, depth: 26, height: 17, color: 0xd8c3a5 },
      { x: -102, z: -100, width: 30, depth: 34, height: 19, color: 0xc7b299 },
      { x: -64, z: -88, width: 24, depth: 32, height: 26, color: 0xe5d2b8 },
      { x: 68, z: -92, width: 36, depth: 24, height: 17, color: 0xd8c3a5 },
      { x: 100, z: -84, width: 28, depth: 34, height: 22, color: 0xc7b299 },
      { x: -112, z: -12, width: 34, depth: 30, height: 18, color: 0xe5d2b8 },
      { x: -68, z: 8, width: 26, depth: 24, height: 15, color: 0xd8c3a5 },
      { x: 72, z: 2, width: 32, depth: 28, height: 19, color: 0xc7b299 },
      { x: 112, z: 18, width: 28, depth: 28, height: 16, color: 0xe5d2b8 },
      { x: -10, z: 58, width: 120, depth: 22, height: 9, color: 0xd8c3a5 },
    ].filter((spec) => Math.hypot(spec.x, spec.z) > VIEUX_PORT_CORE_BUILDING_RADIUS);

    for (const spec of specs) {
      const bodyMaterial =
        spec.color === 0xe5d2b8
          ? accentMaterial
          : spec.color === 0xc7b299
            ? blockMaterial
            : boulevardMaterial;
      this.addPrototypeBuilding(spec, bodyMaterial);
    }

    this.addHarborLandmarks();
    this.addSpawnDemarchageFacades();
    // Catalogue GPS accurate synchrone — ne dépend pas d’Overpass.
    this.addAccurateCityBuildings();
    void this.wigleVisualization.refreshBuildingMapping();
    this.addWaterStrip();
    this.addCityGround();
    this.addUrbanProps();
    if (this.root) {
      this.atmosphere.enableShadowsOnObject(this.root, { cast: true, receive: false });
    }
    if (this.groundRoot) {
      this.atmosphere.enableShadowsOnObject(this.groundRoot, { cast: false, receive: true });
    }
    this.prototypeBuildingsLoaded = true;
    this.prototypeColliderCount = this.prototypeColliders.length;
  }

  /**
   * Immeubles géoréférencés (Canebière 62° + quais) en BoxGeometry.
   * Positions GPS alignées Ombrière / Google Earth / OSM.
   */
  private addAccurateCityBuildings(): void {
    if (!this.root) return;
    this.ensureAccurateMaterials();
    if (!this.osmRoot) {
      this.osmRoot = new THREE.Group();
      this.osmRoot.name = 'marseille-osm-buildings';
      this.root.add(this.osmRoot);
    }

    const added = this.placeGeoBuildings(ACCURATE_CITY_BUILDINGS);
    this.geoDebug.setBuildingStats(added + MARSEILLE_LANDMARK_BUILDINGS.length, 0);
    console.info(
      '[MarseilleMapProvider] Batiments accurate GPS:',
      added,
      '/',
      ACCURATE_CITY_BUILDINGS.length,
      '(min',
      ACCURATE_CITY_BUILDING_MIN_COUNT,
      ')'
    );
  }

  private renderQuality(): MapQuality {
    return this.config.configuration.quality;
  }

  private ensureAccurateMaterials(): void {
    if (this.accurateWallMaterials.length > 0 && this.accurateRoofMaterial) return;
    const owner = this.buildingFacadeTextureOwner;
    const quality = this.renderQuality();
    this.accurateWallMaterials = [
      createHaussmannWallMaterial(11, owner, {
        baseColor: 0xd4c4a8,
        windowColor: '#e8edf5',
        accentColor: '#9a8068',
        quality,
      }),
      createHaussmannWallMaterial(29, owner, {
        baseColor: 0xc7b299,
        windowColor: '#dce8f0',
        accentColor: '#8a7058',
        quality,
      }),
      createHaussmannWallMaterial(47, owner, {
        baseColor: 0xe0d2bc,
        windowColor: '#eef3f8',
        accentColor: '#a08870',
        quality,
      }),
      createHaussmannWallMaterial(61, owner, {
        baseColor: 0xbba890,
        windowColor: '#d5e3ec',
        accentColor: '#867058',
        quality,
      }),
    ];
    this.accurateRoofMaterial = createHaussmannRoofMaterial(owner, quality);
    for (const mat of this.accurateWallMaterials) {
      applyBuildingMaterialDefaults(mat);
    }
    applyBuildingMaterialDefaults(this.accurateRoofMaterial);
    this.buildingMaterials.push(...this.accurateWallMaterials, this.accurateRoofMaterial);
  }

  private ensureCadastreMaterials(): void {
    if (this.cadastreWallMaterials.length > 0 && this.cadastreRoofMaterial) return;
    const owner = this.buildingFacadeTextureOwner;
    const quality = this.renderQuality();
    this.cadastreWallMaterials = [
      createCadastreWallMaterial(101, owner, {
        baseColor: 0xd8ccb4,
        accentColor: '#a08870',
        quality,
      }),
      createCadastreWallMaterial(127, owner, {
        baseColor: 0xcdbfa8,
        accentColor: '#958068',
        quality,
      }),
      createCadastreWallMaterial(149, owner, {
        baseColor: 0xe2d6c0,
        accentColor: '#a89078',
        quality,
      }),
      createCadastreWallMaterial(173, owner, {
        baseColor: 0xc4b49c,
        accentColor: '#887058',
        quality,
      }),
    ];
    this.cadastreRoofMaterial = createCadastreRoofMaterial(owner, quality);
    this.cadastrePlinthMaterial = createCadastrePlinthMaterial(quality, owner);
    for (const mat of this.cadastreWallMaterials) {
      applyBuildingMaterialDefaults(mat);
    }
    applyBuildingMaterialDefaults(this.cadastreRoofMaterial);
    applyBuildingMaterialDefaults(this.cadastrePlinthMaterial);
    this.buildingMaterials.push(
      ...this.cadastreWallMaterials,
      this.cadastreRoofMaterial,
      this.cadastrePlinthMaterial
    );
  }

  private pickCadastreLandmarkWallMaterial(def: GeoBuilding): THREE.MeshStandardMaterial {
    const owner = this.buildingFacadeTextureOwner;
    const seed = cadastreMaterialSeed(def.id);
    const isWarm =
      def.id === MIRROR_SECOND_BUILDING_ID || def.id === 'harbor-east-building';
    const quality = this.renderQuality();
    const base = createCadastreWallMaterial(
      seed,
      owner,
      isWarm
        ? {
            baseColor: 0xc8b59a,
            windowColor: '#ebe2d4',
            accentColor: '#8f7558',
            quality,
          }
        : {
            baseColor: 0xd2c2a6,
            windowColor: '#e5ecf4',
            accentColor: '#9a8468',
            quality,
          }
    );
    const bounds = footprintBounds(def.footprint, this.geo);
    const height = def.heightMeters ?? (def.levels != null ? def.levels * 3.1 : 12);
    return tuneWallMaterialForFootprint(base, height, bounds, false);
  }

  private pickCadastreParcelWallMaterial(def: GeoBuilding, index: number): THREE.MeshStandardMaterial {
    const pool = this.cadastreWallMaterials[index % this.cadastreWallMaterials.length];
    const bounds = footprintBounds(def.footprint, this.geo);
    const height = def.heightMeters ?? (def.levels != null ? def.levels * 3.1 : 12);
    return tuneWallMaterialForFootprint(pool, height, bounds, true);
  }

  private disposeBuildingGroupGeometries(group: THREE.Object3D): void {
    group.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh && mesh.geometry) {
        mesh.geometry.dispose();
      }
    });
  }

  /** Retire un groupe bâtiment par id (root landmarks ou osmRoot parcelles). */
  private removeBuildingMeshById(id: string): boolean {
    for (const parent of [this.root, this.osmRoot]) {
      if (!parent) continue;
      const found = parent.getObjectByName(id);
      if (!found) continue;
      found.parent?.remove(found);
      this.buildingLodGrid?.unregister(found);
      this.massingBatchPool?.unregister(found);
      this.lastLodActiveBuildings.delete(found);
      this.disposeBuildingGroupGeometries(found);
      return true;
    }
    return false;
  }

  private mergePlacementAudit(
    buildingId: string,
    builtAudit: BuildingPlacementAudit
  ): void {
    const idx = this.placementAudits.findIndex((a) => a.buildingId === buildingId);
    if (idx < 0) {
      this.placementAudits.push(builtAudit);
      return;
    }
    const existing = this.placementAudits[idx];
    existing.heightMeters = builtAudit.heightMeters;
    existing.heightSource = builtAudit.heightSource;
    existing.confidence = builtAudit.confidence;
    existing.source = builtAudit.source;
    existing.worldPosition.copy(builtAudit.worldPosition);
    existing.intersectsRoad = builtAudit.intersectsRoad;
    existing.intersectsWater = builtAudit.intersectsWater;
    existing.floating = builtAudit.floating;
    existing.buried = builtAudit.buried;
  }

  /** Place des empreintes GPS (skip doublons / eau bassin / spawn). */
  private placeGeoBuildings(defs: readonly GeoBuilding[]): number {
    if (!this.osmRoot || !this.accurateRoofMaterial) return 0;
    let added = 0;
    let skippedWater = 0;
    let skippedDup = 0;

    for (const def of defs) {
      if (this.placedBuildingIds.has(def.id)) {
        skippedDup++;
        continue;
      }
      const mat =
        this.accurateWallMaterials[this.placedBuildingIds.size % this.accurateWallMaterials.length];
      const built = createGeoBuildingMesh(def, this.geo, {
        wall: mat,
        roof: this.accurateRoofMaterial,
      }, { massing: 'extrude', visualTier: 'standard' });
      if (!built) continue;

      // Skip uniquement le cœur bassin (pas les quais / Canebière).
      if (isHarborWaterAt(built.center.x, built.center.z)) {
        skippedWater++;
        continue;
      }
      if (Math.hypot(built.center.x, built.center.z) < 18) continue;

      this.osmRoot.add(built.group);
      this.registerBuildingForLod(built.group, built.center.x, built.center.z);
      this.placedBuildingIds.add(def.id);
      this.addPrototypeColliderIfClear(built.collider);
      this.wigleRegistry.registerFromBox({
        id: def.id,
        label: def.label,
        x: built.center.x,
        z: built.center.z,
        width: built.collider.maxX - built.collider.minX,
        depth: built.collider.maxZ - built.collider.minZ,
        height: built.heightMeters,
      });
      added++;
    }

    if (skippedWater > 0 || skippedDup > 0) {
      console.info(
        '[MarseilleMapProvider] placeGeoBuildings +',
        added,
        'skipWater',
        skippedWater,
        'dup',
        skippedDup
      );
    }
    return added;
  }

  /** Phase 20 — insertion par paquets idle (streaming Canebière). */
  private async placeGeoBuildingsBatched(defs: readonly GeoBuilding[]): Promise<number> {
    if (!this.osmRoot || !this.accurateRoofMaterial || defs.length === 0) return 0;

    this.dualContextGovernor.beginOsmBatch();
    try {
      return await this.placeGeoBuildingsBatchedInner(defs);
    } finally {
      this.dualContextGovernor.endOsmBatch();
    }
  }

  private async placeGeoBuildingsBatchedInner(defs: readonly GeoBuilding[]): Promise<number> {
    if (!this.osmRoot || !this.accurateRoofMaterial) return 0;

    const perf = mapPerfProfile(this.renderQuality());
    let added = 0;
    let skippedWater = 0;
    let skippedDup = 0;

    for (let i = 0; i < defs.length; i++) {
      const def = defs[i]!;
      if (this.placedBuildingIds.has(def.id)) {
        skippedDup++;
        continue;
      }
      const mat =
        this.accurateWallMaterials[this.placedBuildingIds.size % this.accurateWallMaterials.length];
      const built = createGeoBuildingMesh(def, this.geo, {
        wall: mat,
        roof: this.accurateRoofMaterial,
      }, { massing: 'extrude', visualTier: 'standard' });
      if (!built) continue;

      if (isHarborWaterAt(built.center.x, built.center.z)) {
        skippedWater++;
        continue;
      }
      if (Math.hypot(built.center.x, built.center.z) < 18) continue;

      this.osmRoot.add(built.group);
      this.registerBuildingForLod(built.group, built.center.x, built.center.z);
      this.placedBuildingIds.add(def.id);
      this.addPrototypeColliderIfClear(built.collider);
      this.wigleRegistry.registerFromBox({
        id: def.id,
        label: def.label,
        x: built.center.x,
        z: built.center.z,
        width: built.collider.maxX - built.collider.minX,
        depth: built.collider.maxZ - built.collider.minZ,
        height: built.heightMeters,
      });
      added++;

      if (
        shouldYieldOsmMeshBatch(i, {
          batchSize: perf.osmMeshBatchSize,
          batchDelayMs: perf.osmMeshBatchDelayMs,
          useIdle: perf.osmMeshBatchUseIdle,
        })
      ) {
        await yieldOsmMeshBatch({
          batchSize: perf.osmMeshBatchSize,
          batchDelayMs: perf.osmMeshBatchDelayMs,
          useIdle: perf.osmMeshBatchUseIdle,
        });
      }
    }

    if (added > 0 || skippedWater > 0 || skippedDup > 0) {
      console.info(
        '[MarseilleMapProvider] placeGeoBuildings +',
        added,
        'skipWater',
        skippedWater,
        'dup',
        skippedDup
      );
    }
    return added;
  }

  /** Phase 4 — parcelles / landmarks depuis GeoJSON commité (cadastre > OSM). */
  private async loadCadastreGeoJson(): Promise<void> {
    if (!this.root || !this.config.configuration.enableBuildings) return;

    const buildings = await this.geoJsonBuildings.loadVieuxPortBuildings();
    const index = indexCadastralBuildings(buildings);
    this.cadastralIds = index.ids;
    this.cadastralSourceIds = index.sourceIds;

    this.ensureAccurateMaterials();
    this.ensureCadastreMaterials();
    if (!this.osmRoot) {
      this.osmRoot = new THREE.Group();
      this.osmRoot.name = 'marseille-osm-buildings';
      this.root.add(this.osmRoot);
    }
    if (!this.buildingCorniceMaterial) {
      this.buildingCorniceMaterial = createCorniceMaterial(this.renderQuality());
      this.buildingMaterials.push(this.buildingCorniceMaterial);
    }

    const landmarkIds = new Set(MARSEILLE_LANDMARK_BUILDINGS.map((b) => b.id));
    let added = 0;
    let upgraded = 0;
    let audited = 0;
    let parcelIndex = 0;

    for (const def of buildings) {
      const isLandmark = landmarkIds.has(def.id);
      const reference = MARSEILLE_LANDMARK_BUILDINGS.find((l) => l.id === def.id);
      const center = footprintCentroid(def.footprint, this.geo);
      if (isHarborWaterAt(center.x, center.z)) continue;

      const hadMesh = this.removeBuildingMeshById(def.id);
      const wasKnown = hadMesh || this.placedBuildingIds.has(def.id);

      const visualTier = resolveCadastreVisualTier(
        center.x,
        center.z,
        def.confidence,
        isLandmark
      );
      const wallMat = isLandmark
        ? this.pickCadastreLandmarkWallMaterial(def)
        : this.pickCadastreParcelWallMaterial(def, parcelIndex++);

      const built = createGeoBuildingMesh(
        def,
        this.geo,
        { wall: wallMat, roof: this.cadastreRoofMaterial! },
        {
          massing: 'extrude',
          visualTier,
          corniceMaterial:
            visualTier !== 'standard' ? this.buildingCorniceMaterial! : undefined,
          plinthMaterial:
            visualTier === 'cadastre' ? this.cadastrePlinthMaterial! : undefined,
        }
      );
      if (!built) continue;

      built.group.userData['cadastreUpgrade'] = true;
      built.group.userData['visualTier'] = visualTier;

      const parent = isLandmark ? this.root! : this.osmRoot!;
      parent.add(built.group);
      this.registerBuildingForLod(built.group, built.center.x, built.center.z);

      this.mergePlacementAudit(def.id, built.audit);
      if (reference) {
        const audit = this.placementAudits.find((a) => a.buildingId === def.id);
        if (audit) {
          enrichAuditWithReference(audit, reference, this.geo);
          audited++;
        }
      }

      if (!this.placedBuildingIds.has(def.id)) {
        this.placedBuildingIds.add(def.id);
        this.addPrototypeColliderIfClear(built.collider);
      }

      this.wigleRegistry.registerFromFootprint({
        id: def.id,
        label: def.label,
        worldPoints: def.footprint.slice(0, -1).map((p) => {
          const w = this.geo.geoToWorld(p.latitude, p.longitude, 0);
          return { x: w.x, z: w.z };
        }),
        height: built.heightMeters,
      });

      if (wasKnown) upgraded++;
      else added++;
    }

    this.geoDebug.setAudits(this.placementAudits);
    console.info(
      '[MarseilleMapProvider] Cadastre GeoJSON Phase 4 —',
      buildings.length,
      'features, +',
      added,
      'new,',
      upgraded,
      'upgraded,',
      audited,
      'audits'
    );
  }

  /**
   * Streaming : quand le joueur dépasse la zone Canebière déjà générée,
   * crée la suite des îlots (+ tentative Overpass autour).
   */
  private streamCityBuildingsAround(
    playerPosition: THREE.Vector3,
    streamIntervalMs = 8000
  ): void {
    if (!this.root || !this.osmRoot) return;

    const along = worldToCanebiereAlong(playerPosition.x, playerPosition.z);
    const bucket = Math.floor(along / 80);
    if (bucket === this.lastStreamAlongBucket) {
      this.maybeStreamOsmAround(playerPosition, streamIntervalMs);
      return;
    }
    this.lastStreamAlongBucket = bucket;

    // Fenêtre glissante : 120 m derrière → 280 m devant le joueur le long de la Canebière.
    const ahead = Math.max(along + 280, 400);
    const behind = Math.max(along - 120, 20);
    const segment = generateCanebiereSegment(behind, ahead, 16);
    void this.placeGeoBuildingsBatched(segment).then((added) => {
      if (added > 0) {
        console.info(
          '[MarseilleMapProvider] Stream Canebiere along~',
          along.toFixed(0),
          'm +',
          added,
          'batiments'
        );
      }
    });
    this.maybeStreamOsmAround(playerPosition, streamIntervalMs);
  }

  private maybeStreamOsmAround(
    playerPosition: THREE.Vector3,
    streamIntervalMs = 8000
  ): void {
    const now = performance.now();
    if (now - this.lastOsmStreamAt < streamIntervalMs) return;
    this.lastOsmStreamAt = now;
    void this.streamOsmFootprintsAround(playerPosition).catch((err) => {
      console.warn('[MarseilleMapProvider] Stream OSM autour joueur echoue.', err);
    });
  }

  private async streamOsmFootprintsAround(playerPosition: THREE.Vector3): Promise<void> {
    if (!this.config.configuration.enableBuildings) return;
    const geo = this.geo.worldToGeo(playerPosition);
    const footprints = await this.osmBuildings.loadBuildingsAround(
      geo.latitude,
      geo.longitude,
      350
    );
    if (!footprints.length) return;

    this.ensureAccurateMaterials();
    if (!this.osmRoot) return;

    this.dualContextGovernor.beginOsmBatch();
    try {
    const prioritized = sortOsmEntriesByContentPriority(
      footprints.map((fp) => {
        const center = this.computeFootprintCenter(fp.points);
        return {
          fp,
          center,
          distSq: center.x * center.x + center.z * center.z,
        };
      })
    );

    let added = 0;
    const perf = mapPerfProfile(this.renderQuality());
    for (let i = 0; i < prioritized.length; i++) {
      const { fp } = prioritized[i]!;
      if (LANDMARK_OSM_SOURCE_IDS.has(fp.id) || this.placedBuildingIds.has(fp.id)) continue;
      if (shouldSkipOsmForCadastre(fp, this.cadastralIds, this.cadastralSourceIds)) continue;
      const center = this.computeFootprintCenter(fp.points);
      if (isHarborWaterAt(center.x, center.z)) continue;

      const wall =
        this.accurateWallMaterials[added % this.accurateWallMaterials.length];
      applyBuildingMaterialDefaults(wall);
      const built = createOsmFootprintBuildingMesh(
        fp.id,
        fp.points,
        fp.height,
        fp.heightSource,
        this.geo,
        { wall, roof: this.accurateRoofMaterial! },
        'extrude'
      );
      if (!built) continue;
      this.osmRoot.add(built.group);
      this.registerBuildingForLod(built.group, built.center.x, built.center.z);
      this.addPrototypeColliderIfClear(built.collider);
      this.placedBuildingIds.add(fp.id);
      added++;

      if (
        shouldYieldOsmMeshBatch(i, {
          batchSize: perf.osmMeshBatchSize,
          batchDelayMs: perf.osmMeshBatchDelayMs,
          useIdle: perf.osmMeshBatchUseIdle,
        })
      ) {
        await yieldOsmMeshBatch({
          batchSize: perf.osmMeshBatchSize,
          batchDelayMs: perf.osmMeshBatchDelayMs,
          useIdle: perf.osmMeshBatchUseIdle,
        });
      }
    }
    if (added > 0) {
      console.info('[MarseilleMapProvider] Stream OSM +', added, 'autour joueur');
    }
    } finally {
      this.dualContextGovernor.endOsmBatch();
    }
  }

  /** Compteur massing (groupes bâtiment, pas toits). */
  getCityMassingCount(): number {
    return this.placedBuildingIds.size;
  }

  /** Rejoue le catalogue GPS si Overpass / init a laissé la scène vide. */
  ensureCityMassing(): void {
    if (!this.root) return;
    if (this.getCityMassingCount() >= ACCURATE_CITY_BUILDING_MIN_COUNT) return;
    console.warn(
      '[MarseilleMapProvider] Massing insuffisant (',
      this.getCityMassingCount(),
      ') — rechargement catalogue accurate.'
    );
    if (this.osmRoot) {
      this.root.remove(this.osmRoot);
      this.osmRoot = null;
    }
    this.placedBuildingIds.clear();
    this.lastStreamAlongBucket = Number.NaN;
    this.addAccurateCityBuildings();
  }

  private addPrototypeBuilding(
    spec: PrototypeBuildingSpec,
    bodyMaterial: THREE.Material
  ): void {
    if (!this.root) return;

    const geometry = new THREE.BoxGeometry(spec.width, spec.height, spec.depth);
    const mesh = new THREE.Mesh(geometry, bodyMaterial);
    mesh.name = `marseille-building-${Math.round(spec.x)}-${Math.round(spec.z)}`;
    mesh.position.set(spec.x, spec.height / 2, spec.z);
    mesh.frustumCulled = true;
    this.root.add(mesh);

    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(spec.width * 0.92, 1.2, spec.depth * 0.92),
      this.createPrototypeRoofMaterial()
    );
    roof.name = `${mesh.name}-roof`;
    roof.position.set(spec.x, spec.height + 0.6, spec.z);
    roof.frustumCulled = true;
    this.root.add(roof);

    this.addPrototypeColliderIfClear({
      minX: spec.x - spec.width / 2,
      maxX: spec.x + spec.width / 2,
      minZ: spec.z - spec.depth / 2,
      maxZ: spec.z + spec.depth / 2,
    });
    this.wigleRegistry.registerFromBox({
      id: mesh.name,
      x: spec.x,
      z: spec.z,
      width: spec.width,
      depth: spec.depth,
      height: spec.height,
    });
  }

  private async loadOsmBuildings(): Promise<void> {
    if (!this.root || !this.config.configuration.enableBuildings) return;

    try {
      const buildings = await this.osmBuildings.loadBuildings(OSM_QUERY_BOUNDS);
      const filteredBuildings = buildings
        .filter((b) => !LANDMARK_OSM_SOURCE_IDS.has(b.id))
        .filter((b) => !shouldSkipOsmForCadastre(b, this.cadastralIds, this.cadastralSourceIds))
        .map((building) => {
          const center = this.computeFootprintCenter(building.points);
          return { building, distSq: center.x * center.x + center.z * center.z, center };
        });

      const prioritizedBuildings = sortOsmEntriesByContentPriority(filteredBuildings);

      if (prioritizedBuildings.length === 0) {
        console.warn(
          '[MarseilleMapProvider] Overpass vide — catalogue accurate conserve.'
        );
        await this.wigleVisualization.refreshBuildingMapping();
        return;
      }

      if (!this.osmRoot) {
        this.osmRoot = new THREE.Group();
        this.osmRoot.name = 'marseille-osm-buildings';
        this.root.add(this.osmRoot);
      }

      const wallMaterials = [
        this.createRealisticOsmWallMaterial(11),
        this.createRealisticOsmWallMaterial(29),
        this.createRealisticOsmWallMaterial(47),
      ];
      for (const mat of wallMaterials) {
        applyBuildingMaterialDefaults(mat);
      }
      const roofMaterial = this.createRealisticOsmRoofMaterial();
      roofMaterial.fog = false;

      const perf = mapPerfProfile(this.config.configuration.quality);
      const meshCap = Math.min(OSM_BUILDING_MESH_CAP, osmContentBuildingCap());
      const visuals: OSMVisualMesh[] = [];
      const batchEntries = prioritizedBuildings.slice(0, meshCap);

      // Additif — empreintes OSM extrudées par paquets (évite freeze / OOM en high).
      let added = 0;
      this.dualContextGovernor.beginOsmBatch();
      try {
      for (let i = 0; i < batchEntries.length; i++) {
        const { building } = batchEntries[i]!;
        if (this.placedBuildingIds.has(building.id)) continue;
        const materialIndex = this.stableIndexFromPoints(building.points, wallMaterials.length);
        const wall = wallMaterials[materialIndex];

        const built = createOsmFootprintBuildingMesh(
          building.id,
          building.points,
          building.height,
          building.heightSource,
          this.geo,
          { wall, roof: roofMaterial },
          'extrude'
        );
        if (!built) continue;
        this.osmRoot.add(built.group);
        this.registerBuildingVisual(built.group, built.center, visuals);
        this.placedBuildingIds.add(building.id);

        this.addPrototypeColliderIfClear(built.collider);
        const worldFootprint = building.points.map((point) => {
          const world = this.geo.geoToWorld(point.latitude, point.longitude, 0);
          return { x: world.x, z: world.z };
        });
        this.wigleRegistry.registerFromFootprint({
          id: building.id,
          worldPoints: worldFootprint,
          height: built.heightMeters,
        });
        added++;

        if (shouldYieldOsmMeshBatch(i, {
          batchSize: perf.osmMeshBatchSize,
          batchDelayMs: perf.osmMeshBatchDelayMs,
          useIdle: perf.osmMeshBatchUseIdle,
        })) {
          await yieldOsmMeshBatch({
            batchSize: perf.osmMeshBatchSize,
            batchDelayMs: perf.osmMeshBatchDelayMs,
            useIdle: perf.osmMeshBatchUseIdle,
          });
        }
      }
      } finally {
        this.dualContextGovernor.endOsmBatch();
      }

      if (visuals.length > 0) {
        const panelCap = mapPerfProfile(this.config.configuration.quality).synthwavePanelCap;
        this.addSynthwaveFacadeDesigns(visuals, panelCap);
        if (this.config.configuration.quality === 'high') {
          this.addSponsorStorefronts(visuals);
          this.addGroundGlassFacades(visuals);
        }
      }

      this.removePrototypeBuildingMeshes();
      this.geoDebug.setBuildingStats(
        this.placedBuildingIds.size + MARSEILLE_LANDMARK_BUILDINGS.length,
        0
      );
      console.info(
        '[MarseilleMapProvider] OSM additif (catalogue accurate conserve):',
        added,
        'meshes'
      );
      if (this.config.configuration.enableDebug) {
        console.info('[MarseilleMapProvider] Extrusion cache', getOsmExtrusionCache().getStats());
      }
      await this.wigleVisualization.refreshBuildingMapping();
    } catch (error) {
      console.warn(
        '[MarseilleMapProvider] Echec Overpass — catalogue accurate conserve.',
        error
      );
      await this.wigleVisualization.refreshBuildingMapping();
    }
  }

  private addWaterStrip(): void {
    if (!this.root) return;
    const harbor = MARSEILLE_HARBOR_WATER;
    const waterY = harbor.waterSurfaceY;
    const deepY = harbor.waterDeepY;
    const quality = this.config.configuration.quality;
    const perf = mapPerfProfile(quality);
    const subdivisions = harborWaterSubdivisionsForQuality(quality);

    this.waterRoot = new THREE.Group();
    this.waterRoot.name = 'marseille-harbor-water';
    this.root.add(this.waterRoot);

    this.waterShaderMaterial = createHarborWaterShaderMaterial(
      harborWaterShoreDistortion(quality)
    );
    applyHarborWaterAtmosphereColors(this.waterShaderMaterial);
    this.buildingMaterials.push(this.waterShaderMaterial);

    this.harborPlanarReflector = createHarborPlanarReflector({
      textureSize: perf.waterPlanarTexSize,
    });
    this.waterRoot.add(this.harborPlanarReflector);

    const deepMaterial = createHarborWaterDeepMaterial(harbor.deepColor);
    this.harborDeepMaterial = deepMaterial;
    this.buildingMaterials.push(deepMaterial);
    const foamMaterial = createHarborFoamMaterial(harbor.foamColor);
    this.buildingMaterials.push(foamMaterial);
    const pitWallMaterial = createHarborPitWallMaterial();
    this.buildingMaterials.push(pitWallMaterial);
    const quayCapMaterial = createHarborQuayCapMaterial();
    this.buildingMaterials.push(quayCapMaterial);

    this.addHarborBasinCavity(harbor, pitWallMaterial);

    for (const def of defaultHarborWaterPolygons(harbor)) {
      const built = buildHarborWaterSurfaceMesh(
        def,
        this.waterShaderMaterial,
        deepMaterial,
        waterY,
        deepY,
        subdivisions
      );
      this.ownedGeometries.push(built.geometry, built.deepGeometry);
      this.waterRoot.add(built.deepBed);
      this.waterRoot.add(built.surface);
      this.waterSurfaceMeshes.push(built.surface);
    }

    void this.enhanceHarborWaterFromOsm().catch((err) => {
      console.warn('[MarseilleMapProvider] OSM eau (async) echoue.', err);
    });

    const basinWidth = harbor.basinMaxX - harbor.basinMinX;
    const basinCx = (harbor.basinMinX + harbor.basinMaxX) * 0.5;
    const channelDepth = harbor.waterMaxZ - harbor.waterMinZ;

    const foamDefs: Array<{ name: string; w: number; h: number; x: number; z: number; opacity: number }> = [
      { name: 'south', w: 58, h: 2.4, x: 0, z: harbor.waterMinZ + 1.2, opacity: 0.88 },
      { name: 'basin-n', w: basinWidth * 0.94, h: 2.2, x: basinCx, z: harbor.basinMinZ + 1.1, opacity: 0.82 },
      { name: 'basin-s', w: basinWidth * 0.94, h: 2.2, x: basinCx, z: harbor.basinMaxZ - 1.1, opacity: 0.82 },
      { name: 'channel-w', w: 2.2, h: Math.min(channelDepth, 120), x: harbor.basinMinX - 1.1, z: harbor.waterMinZ + 60, opacity: 0.75 },
    ];
    for (const fd of foamDefs) {
      const mat = foamMaterial.clone();
      mat.opacity = fd.opacity;
      const foam = new THREE.Mesh(new THREE.PlaneGeometry(fd.w, fd.h), mat);
      foam.name = `marseille-water-foam-${fd.name}`;
      foam.rotation.x = -Math.PI / 2;
      foam.position.set(fd.x, waterY + 0.02, fd.z);
      foam.renderOrder = 4;
      this.waterRoot.add(foam);
      this.foamOverlayMeshes.push({ mesh: foam, baseOpacity: fd.opacity });
    }

    {
      const shimmerMaterial = new THREE.MeshBasicMaterial({
        color: harbor.shallowColor,
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      this.buildingMaterials.push(shimmerMaterial);
      const shimmer = new THREE.Mesh(
        new THREE.PlaneGeometry(188, Math.min(channelDepth, 160)),
        shimmerMaterial
      );
      shimmer.name = 'marseille-water-shimmer-south';
      shimmer.rotation.x = -Math.PI / 2;
      shimmer.position.set(0, waterY + 0.018, harbor.waterMinZ + 70);
      shimmer.renderOrder = 3;
      this.waterRoot.add(shimmer);
    }

    this.addBasinRetainingWalls(harbor, pitWallMaterial);

    const causticSpot = new THREE.SpotLight(0x5ee0f0, 0.55, 90, Math.PI / 4, 0.45, 1.2);
    causticSpot.name = 'marseille-water-caustic';
    causticSpot.position.set(0, waterY + 4.5, harbor.waterMinZ + 55);
    causticSpot.target.position.set(0, waterY, harbor.waterMinZ + 55);
    this.waterRoot.add(causticSpot);
    this.waterRoot.add(causticSpot.target);

    const quayY = harbor.quaySurfaceY;
    const quayMaterial = createQuaySurfaceMaterial(quality, {
      color: 0xa8b0bc,
      roughness: CYBERPUNK_ART_DIRECTION.streets.quayRoughness,
      metalness: CYBERPUNK_ART_DIRECTION.streets.quayMetalness,
      envMapIntensity: 0.88,
      sheen: CYBERPUNK_ART_DIRECTION.streets.quaySheenOpacity,
      sheenColor: new THREE.Color(0xc8e8ff),
    });
    this.buildingMaterials.push(quayMaterial);

    const quaySouth = new THREE.Mesh(new THREE.PlaneGeometry(58, 16), quayMaterial);
    quaySouth.name = 'marseille-quai-belges';
    quaySouth.rotation.x = -Math.PI / 2;
    quaySouth.position.set(0, quayY, HARBOR_QUAY_Z);
    this.waterRoot.add(quaySouth);

    const basinDepth = harbor.basinMaxZ - harbor.basinMinZ;
    const quayEast = new THREE.Mesh(new THREE.PlaneGeometry(16, basinDepth + 10), quayMaterial);
    quayEast.name = 'marseille-quai-fraternite';
    quayEast.rotation.x = -Math.PI / 2;
    quayEast.position.set(26, quayY, 0);
    this.waterRoot.add(quayEast);

    const quayNorth = new THREE.Mesh(new THREE.PlaneGeometry(basinWidth + 40, 12), quayMaterial);
    quayNorth.name = 'marseille-quai-du-port';
    quayNorth.rotation.x = -Math.PI / 2;
    quayNorth.position.set(basinCx, quayY, harbor.basinMinZ - 6);
    this.waterRoot.add(quayNorth);

    const quaySouthShore = new THREE.Mesh(new THREE.PlaneGeometry(basinWidth + 40, 12), quayMaterial);
    quaySouthShore.name = 'marseille-quai-rive-neuve';
    quaySouthShore.rotation.x = -Math.PI / 2;
    quaySouthShore.position.set(basinCx, quayY, harbor.basinMaxZ + 6);
    this.waterRoot.add(quaySouthShore);

    const quayEdge = new THREE.Mesh(
      new THREE.BoxGeometry(58, harbor.basinWallHeight, 1.05),
      pitWallMaterial
    );
    quayEdge.name = 'marseille-quay-edge-south';
    quayEdge.position.set(0, waterY + harbor.basinWallHeight * 0.5, harbor.waterMinZ + 0.45);
    this.waterRoot.add(quayEdge);

    const quayCap = new THREE.Mesh(new THREE.BoxGeometry(58, 0.28, 1.35), quayCapMaterial);
    quayCap.name = 'marseille-quay-cap-south';
    quayCap.position.set(0, harbor.quaySurfaceY + 0.14, harbor.waterMinZ + 0.45);
    this.waterRoot.add(quayCap);

    const dropShadowMaterial = new THREE.MeshBasicMaterial({
      color: 0x020810,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    });
    this.buildingMaterials.push(dropShadowMaterial);
    const dropShadow = new THREE.Mesh(new THREE.PlaneGeometry(62, 4.5), dropShadowMaterial);
    dropShadow.name = 'marseille-quay-drop-shadow';
    dropShadow.rotation.x = -Math.PI / 2;
    dropShadow.position.set(0, harbor.walkSurfaceY + 0.008, harbor.waterMinZ + 2.2);
    this.waterRoot.add(dropShadow);

    const props = buildQuayStreetProps({
      startX: -26,
      endX: 26,
      z: harbor.waterMinZ + 0.55,
      y: harbor.quaySurfaceY,
      spacing: 8,
      includeLamps: true,
    });
    this.quayLampSpecs.push(...props.lampSpecs);
    this.waterRoot.add(props.group);
    this.ownedGeometries.push(...props.geometries);
    this.buildingMaterials.push(...props.materials);

    const scope = urbanPropsScope(quality);
    const harborExtras = buildQuayHarborExtras(scope, quality);
    if (harborExtras) {
      this.waterRoot.add(harborExtras.group);
      this.ownedGeometries.push(...harborExtras.geometries);
      this.buildingMaterials.push(...harborExtras.materials);
    }

    this.addMirrorCanopy();
  }

  private async enhanceHarborWaterFromOsm(): Promise<void> {
    if (!this.waterRoot || !this.waterShaderMaterial) return;

    const ways = await this.osmWater.loadWaterPolygons();
    if (!ways.length || !this.harborDeepMaterial) return;

    const harbor = MARSEILLE_HARBOR_WATER;
    let added = 0;
    const maxOsm = 12;

    for (const way of ways) {
      if (added >= maxOsm) break;
      const poly = osmRingToHarborPolygon(way.id, way.points, (lat, lon) => {
        const w = this.geo.geoToWorld(lat, lon, 0);
        return { x: w.x, z: w.z };
      });
      if (!poly) continue;

      const c = ringCentroid(poly.ring);
      if (!isHarborWaterAt(c.x, c.z)) continue;
      if (Math.hypot(c.x, c.z) < 12) continue;

      const built = buildHarborWaterSurfaceMesh(
        poly,
        this.waterShaderMaterial,
        this.harborDeepMaterial,
        harbor.waterSurfaceY,
        harbor.waterDeepY,
        Math.max(16, HARBOR_WATER_SHADER_CONFIG.subdivisions >> 1)
      );
      built.surface.name = `marseille-water-osm-${way.id}`;
      this.ownedGeometries.push(built.geometry, built.deepGeometry);
      this.waterRoot.add(built.deepBed);
      this.waterRoot.add(built.surface);
      this.waterSurfaceMeshes.push(built.surface);
      added++;
    }

    if (added > 0) {
      console.info('[MarseilleMapProvider] Eau OSM polygones +', added, '/', ways.length);
    }
  }

  /** Ombrière de verre au spawn — indépendante du graphe Star Conquest. */
  private addMirrorCanopy(): void {
    if (!this.root) return;
    const origin = METRO_SPAWN_ANCHOR.mirror;
    const built = buildVieuxPortMirrorCanopy(this.config.configuration.quality, origin);
    this.ownedGeometries.push(...built.geometries);
    this.buildingMaterials.push(...built.materials);
    this.ownedTextures.push(...built.textures);
    this.root.add(built.group);
    this.addCanopyReflector(origin.x, origin.y - MIRROR_CANOPY.thickness * 0.85, origin.z);
    this.addSpawnMarker(origin.x, origin.z);
  }

  /** Marqueur sol spawn — label discret (sans halo anneau / beacon). */
  private addSpawnMarker(x: number, z: number): void {
    if (!this.root) return;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(4, 12, 22, 0.55)';
      ctx.fillRect(24, 28, canvas.width - 48, 72);
      ctx.strokeStyle = 'rgba(158, 251, 255, 0.9)';
      ctx.lineWidth = 4;
      ctx.strokeRect(24, 28, canvas.width - 48, 72);
      ctx.fillStyle = '#e8feff';
      ctx.font = '900 52px Arial Black, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('SPAWN', canvas.width / 2, canvas.height / 2);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
      this.ownedTextures.push(texture);
      const labelMat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      this.buildingMaterials.push(labelMat);
      const labelGeo = new THREE.PlaneGeometry(3.6, 0.9);
      this.ownedGeometries.push(labelGeo);
      const label = new THREE.Mesh(labelGeo, labelMat);
      label.name = 'marseille-spawn-label';
      label.rotation.x = -Math.PI / 2;
      label.position.set(x, 0.43, z + 2.15);
      label.renderOrder = 6;
      this.root.add(label);
    }
  }

  /** Cavité du bassin — parois intérieures visibles depuis le quai. */
  private addHarborBasinCavity(
    harbor: typeof MARSEILLE_HARBOR_WATER,
    wallMaterial: THREE.Material
  ): void {
    if (!this.root) return;

    const h = harbor.basinWallHeight;
    const wallY = harbor.waterSurfaceY + h * 0.5;
    const channelLen = harbor.waterMaxZ - harbor.waterMinZ;
    const channelCz = (harbor.waterMinZ + harbor.waterMaxZ) * 0.5;
    const basinWidth = harbor.basinMaxX - harbor.basinMinX;
    const basinCx = (harbor.basinMinX + harbor.basinMaxX) * 0.5;
    const thickness = 0.42;

    const addWall = (name: string, sx: number, sy: number, sz: number, px: number, py: number, pz: number): void => {
      const geo = new THREE.BoxGeometry(sx, sy, sz);
      this.ownedGeometries.push(geo);
      const wall = new THREE.Mesh(geo, wallMaterial);
      wall.name = name;
      wall.position.set(px, py, pz);
      this.root!.add(wall);
    };

    addWall('marseille-cavity-channel-n', 208, h, thickness, 0, wallY, harbor.waterMinZ + 0.22);
    addWall('marseille-cavity-channel-s', 208, h, thickness, 0, wallY, harbor.waterMaxZ - 0.22);
    addWall('marseille-cavity-channel-w', thickness, h, channelLen, -102, wallY, channelCz);
    addWall('marseille-cavity-channel-e', thickness, h, channelLen, 102, wallY, channelCz);
    addWall('marseille-cavity-basin-n', basinWidth, h, thickness, basinCx, wallY, harbor.basinMinZ + 0.2);
    addWall('marseille-cavity-basin-s', basinWidth, h, thickness, basinCx, wallY, harbor.basinMaxZ - 0.2);
    addWall(
      'marseille-cavity-basin-e',
      thickness,
      h,
      harbor.basinMaxZ - harbor.basinMinZ,
      harbor.basinMaxX - 0.2,
      wallY,
      (harbor.basinMinZ + harbor.basinMaxZ) * 0.5
    );
  }

  /** Margelles et renforts visibles au bord du quai. */
  private addBasinRetainingWalls(
    harbor: typeof MARSEILLE_HARBOR_WATER,
    wallMaterial: THREE.Material
  ): void {
    if (!this.root) return;

    const h = harbor.basinWallHeight;
    const wallY = harbor.waterSurfaceY + h * 0.5;
    const thickness = 0.38;
    const basinWidth = harbor.basinMaxX - harbor.basinMinX;
    const basinCx = (harbor.basinMinX + harbor.basinMaxX) * 0.5;
    const capMaterial = createHarborQuayCapMaterial();
    this.buildingMaterials.push(capMaterial);

    const addCap = (name: string, sx: number, sz: number, px: number, pz: number): void => {
      const cap = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.24, sz), capMaterial);
      cap.name = name;
      cap.position.set(px, harbor.quaySurfaceY + 0.12, pz);
      this.root!.add(cap);
    };

    addCap('marseille-quay-cap-channel', 210, 1.2, 0, harbor.waterMinZ + 0.35);
    addCap('marseille-quay-cap-basin-n', basinWidth + 4, 1.1, basinCx, harbor.basinMinZ + 0.15);
    addCap('marseille-quay-cap-basin-s', basinWidth + 4, 1.1, basinCx, harbor.basinMaxZ - 0.15);

    const addLip = (name: string, sx: number, sy: number, sz: number, px: number, py: number, pz: number): void => {
      const geo = new THREE.BoxGeometry(sx, sy, sz);
      this.ownedGeometries.push(geo);
      const lip = new THREE.Mesh(geo, wallMaterial);
      lip.name = name;
      lip.position.set(px, py, pz);
      this.root!.add(lip);
    };

    addLip(
      'marseille-basin-lip-east',
      thickness,
      h,
      harbor.basinMaxZ - harbor.basinMinZ + 2,
      harbor.basinMaxX + 0.35,
      wallY,
      (harbor.basinMinZ + harbor.basinMaxZ) * 0.5
    );
  }

  private addHarborLandmarks(): void {
    if (!this.root) return;

    if (!this.buildingCorniceMaterial) {
      this.buildingCorniceMaterial = createCorniceMaterial(this.renderQuality());
      this.buildingMaterials.push(this.buildingCorniceMaterial);
    }

    const owner = this.buildingFacadeTextureOwner;
    const quality = this.renderQuality();
    const stoneMaterial = createHaussmannWallMaterial(3, owner, {
      baseColor: 0xd2c2a6,
      windowColor: '#e5ecf4',
      accentColor: '#9a8468',
      quality,
    });
    const warmMaterial = createHaussmannWallMaterial(7, owner, {
      baseColor: 0xc8b59a,
      windowColor: '#ebe2d4',
      accentColor: '#8f7558',
      quality,
    });
    const roofMaterial = createHaussmannRoofMaterial(owner, quality);
    this.buildingMaterials.push(stoneMaterial, warmMaterial, roofMaterial);

    this.placementAudits.length = 0;

    for (const def of MARSEILLE_LANDMARK_BUILDINGS) {
      const wallMaterial =
        def.id === MIRROR_SECOND_BUILDING_ID || def.id === 'harbor-east-building'
          ? warmMaterial
          : stoneMaterial;

      const built = createGeoBuildingMesh(def, this.geo, {
        wall: wallMaterial,
        roof: roofMaterial,
      }, {
        massing: 'extrude',
        visualTier: 'hero',
        corniceMaterial: this.buildingCorniceMaterial,
      });
      if (!built) continue;

      this.root.add(built.group);
      this.registerBuildingForLod(built.group, built.center.x, built.center.z);
      built.group.userData['heroLandmark'] = true;
      this.placementAudits.push(built.audit);

      const footprintWidth = built.collider.maxX - built.collider.minX;
      const footprintDepth = built.collider.maxZ - built.collider.minZ;

      if (def.id === 'harbor-west-building') {
        const details = attachHarborWestLandmarkDetails(
          built.group,
          built.center,
          built.heightMeters,
          Math.max(footprintWidth, footprintDepth),
          quality
        );
        this.ownedGeometries.push(...details.geometries);
        this.buildingMaterials.push(...details.materials);
      }

      if (def.id.startsWith('mirror-adjacent-building')) {
        const details = attachMirrorAdjacentStorefrontDetails(
          built.group,
          built.center,
          built.heightMeters,
          quality
        );
        this.ownedGeometries.push(...details.geometries);
        this.buildingMaterials.push(...details.materials);
      }

      if (def.id === MIRROR_SECOND_BUILDING_ID) {
        this.addR4v3FacadeSign(
          built.center.x,
          built.heightMeters * 0.55,
          built.center.z,
          footprintWidth,
          footprintDepth
        );
      }

      this.addPrototypeColliderIfClear(built.collider);
      this.wigleRegistry.registerFromFootprint({
        id: def.id,
        label: def.label,
        worldPoints: def.footprint.slice(0, -1).map((p) => {
          const w = this.geo.geoToWorld(p.latitude, p.longitude, 0);
          return { x: w.x, z: w.z };
        }),
        height: built.heightMeters,
      });
    }

    this.geoDebug.setBuildingStats(
      MARSEILLE_LANDMARK_BUILDINGS.length,
      0
    );
    this.geoDebug.setAudits(this.placementAudits);
    this.addHeroSkylineLandmarks();
  }

  /** Silhouettes Fort / Garde / MUCEM / phare — Phase 10. */
  private addHeroSkylineLandmarks(): void {
    if (!this.root) return;

    const built = buildHeroSkylineLandmarkSet(this.renderQuality());
    const skylineRoot = new THREE.Group();
    skylineRoot.name = 'marseille-hero-skyline';
    this.root.add(skylineRoot);

    for (const entry of built.entries) {
      skylineRoot.add(entry.group);
      this.registerBuildingForLod(entry.group, entry.lodCenter.x, entry.lodCenter.z);
    }

    this.ownedGeometries.push(...built.geometries);
    this.buildingMaterials.push(...built.materials);
    this.ownedTextures.push(...built.textures);

    console.info(
      '[MarseilleMapProvider] Landmarks héros skyline:',
      built.entries.map((e) => e.id).join(', ')
    );
  }

  /** Façades arcades (gauche) + boutiques (droite) visibles depuis le spawn. */
  private addSpawnDemarchageFacades(): void {
    if (!this.root) return;

    const registerGeometry = (g: THREE.BufferGeometry): void => {
      this.ownedGeometries.push(g);
    };
    const registerMaterial = (m: THREE.Material): void => {
      this.buildingMaterials.push(m);
    };

    for (const built of buildVieuxPortSpawnFacades(this.geo, registerGeometry, registerMaterial)) {
      this.root.add(built.group);
      this.addPrototypeColliderIfClear(built.collider);
      const w = built.collider.maxX - built.collider.minX;
      const d = built.collider.maxZ - built.collider.minZ;
      const cx = (built.collider.minX + built.collider.maxX) * 0.5;
      const cz = (built.collider.minZ + built.collider.maxZ) * 0.5;
      const facadeSpec =
        built.group.name === 'vieux-port-arcades-west'
          ? VIEUX_PORT_SPAWN_FACADES.arcadesWest
          : VIEUX_PORT_SPAWN_FACADES.shopsEast;
      this.wigleRegistry.registerFromBox({
        id: built.group.name,
        label:
          built.group.name === 'vieux-port-arcades-west'
            ? 'Arcades Quai du Port'
            : 'Ensemble boutiques Est',
        x: cx,
        z: cz,
        width: w,
        depth: d,
        height: facadeSpec.heightMeters,
      });
    }
  }

  private addR4v3FacadeSign(x: number, y: number, z: number, width: number, _depth: number): void {
    if (!this.root) return;
    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, '#40e0ff');
    gradient.addColorStop(0.5, '#ff3ecf');
    gradient.addColorStop(1, '#7a5cff');
    ctx.fillStyle = 'rgba(6, 10, 18, 0.72)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#f4fbff';
    ctx.lineWidth = 8;
    ctx.strokeRect(16, 16, canvas.width - 32, canvas.height - 32);
    ctx.fillStyle = gradient;
    ctx.font = '900 140px Arial Black, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#40e0ff';
    ctx.shadowBlur = 24;
    ctx.fillText(SCENE_COPY.r4v3, canvas.width / 2, canvas.height / 2);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.ownedTextures.push(texture);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
    });
    this.buildingMaterials.push(material);
    const geo = new THREE.PlaneGeometry(Math.min(width * 0.72, 14), 4.2);
    this.ownedGeometries.push(geo);
    const sign = new THREE.Mesh(geo, material);
    sign.name = `${MIRROR_SECOND_BUILDING_ID}-r4v3-sign`;
    const face = x >= 0 ? -1 : 1;
    sign.position.set(x + face * (width / 2 + 0.16), y, z);
    sign.rotation.y = face > 0 ? Math.PI / 2 : -Math.PI / 2;
    this.root.add(sign);
    const glow = new THREE.PointLight(0xff3ecf, 0.42, 28, 2);
    glow.name = `${MIRROR_SECOND_BUILDING_ID}-r4v3-light`;
    glow.position.set(x + face * (width / 2 + 1.2), y, z);
    this.root.add(glow);
  }

  private addRoadSlogans(roadTopY: number): void {
    if (!this.root) return;
    const material = this.createRoadSloganMaterial();
    const placements = [
      { x: -3.4, z: -36, rot: 0.04, scale: 1 },
      { x: 4.2, z: -88, rot: -0.08, scale: 0.86 },
      { x: -2.1, z: -142, rot: 0.12, scale: 1.12 },
    ] as const;
    placements.forEach((place, index) => {
      const geo = new THREE.PlaneGeometry(16 * place.scale, 2.4 * place.scale);
      this.ownedGeometries.push(geo);
      const decal = new THREE.Mesh(geo, material);
      decal.name = `marseille-road-slogan-${index}`;
      decal.rotation.x = -Math.PI / 2;
      decal.rotation.z = place.rot;
      decal.position.set(place.x, roadTopY + 0.018, place.z);
      this.root!.add(decal);
    });
  }

  private createRoadSloganMaterial(): THREE.MeshBasicMaterial {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 192;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(255, 236, 170, 0.82)';
      ctx.font = '800 92px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = 0.55;
      ctx.fillText(SCENE_COPY.roadMarking, canvas.width / 2 + 6, canvas.height / 2 + 4);
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = '#f7f4ea';
      ctx.fillText(SCENE_COPY.roadMarking, canvas.width / 2, canvas.height / 2);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.ownedTextures.push(texture);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
    });
    this.buildingMaterials.push(material);
    return material;
  }

  private addCanopyReflector(x: number, y: number, z: number): void {
    if (!this.root) return;
    const size = mapPerfProfile(this.config.configuration.quality).canopyReflectorTexSize;
    const geometry = new THREE.PlaneGeometry(
      MIRROR_CANOPY.width - 0.55,
      MIRROR_CANOPY.depth - 0.55
    );
    this.ownedGeometries.push(geometry);
    const reflector = new Reflector(geometry, {
      clipBias: 0.003,
      textureWidth: size,
      textureHeight: Math.round(size * 0.68),
      color: 0xc5d8e8,
      multisample: 0,
    });
    reflector.name = 'marseille-mirror-reflector';
    reflector.rotation.x = Math.PI / 2;
    reflector.position.set(x, y, z);
    this.root.add(reflector);
    this.canopyReflector = reflector;
  }

  private addMetroStation(): void {
    if (!this.root) return;
    const mx = METRO_SPAWN_ANCHOR.mirror.x + METRO_SPAWN_ANCHOR.offsetFromMirror.x;
    const mz = METRO_SPAWN_ANCHOR.mirror.z + METRO_SPAWN_ANCHOR.offsetFromMirror.z;
    const group = new THREE.Group();
    group.name = 'marseille-metro-station';
    group.position.set(mx, 0, mz);

    const metal = new THREE.MeshStandardMaterial({
      color: 0x8a93a3,
      roughness: 0.28,
      metalness: 0.82,
      envMapIntensity: 0.9,
    });
    const darkMetal = new THREE.MeshStandardMaterial({
      color: 0x1a2430,
      roughness: 0.35,
      metalness: 0.7,
    });
    const glass = createArchitecturalGlassMaterial(this.renderQuality(), {
      color: CYBERPUNK_ART_DIRECTION.buildings.glassColor,
      roughness: 0.12,
      metalness: 0.22,
      opacity: 0.42,
      transmission: 0.28,
      thickness: 0.35,
    });
    const accentCyan = new THREE.MeshBasicMaterial({
      color: 0x40e0ff,
      transparent: true,
      opacity: 0.72,
    });
    const accentMagenta = new THREE.MeshBasicMaterial({
      color: 0xff3ecf,
      transparent: true,
      opacity: 0.55,
    });
    this.buildingMaterials.push(metal, darkMetal, glass, accentCyan, accentMagenta);

    const deckGeo = new THREE.BoxGeometry(7.2, 0.2, 16);
    this.ownedGeometries.push(deckGeo);
    const deck = new THREE.Mesh(deckGeo, darkMetal);
    deck.name = 'marseille-metro-deck';
    deck.position.y = 0.12;
    group.add(deck);

    const canopyGeo = new THREE.BoxGeometry(7.6, 0.16, 16.4);
    this.ownedGeometries.push(canopyGeo);
    const canopy = new THREE.Mesh(canopyGeo, metal);
    canopy.name = 'marseille-metro-canopy';
    canopy.position.y = 4.05;
    group.add(canopy);

    const glassGeo = new THREE.BoxGeometry(0.12, 3.55, 15.2);
    this.ownedGeometries.push(glassGeo);
    const glassWest = new THREE.Mesh(glassGeo, glass);
    glassWest.name = 'marseille-metro-glass-west';
    glassWest.position.set(-3.35, 1.95, 0);
    group.add(glassWest);
    const glassNorth = new THREE.Mesh(new THREE.BoxGeometry(6.4, 3.55, 0.12), glass);
    glassNorth.name = 'marseille-metro-glass-north';
    glassNorth.position.set(0, 1.95, -7.7);
    this.ownedGeometries.push(glassNorth.geometry);
    group.add(glassNorth);
    const glassSouth = new THREE.Mesh(new THREE.BoxGeometry(6.4, 3.55, 0.12), glass);
    glassSouth.name = 'marseille-metro-glass-south';
    glassSouth.position.set(0, 1.95, 7.7);
    this.ownedGeometries.push(glassSouth.geometry);
    group.add(glassSouth);

    const pillarGeo = new THREE.BoxGeometry(0.28, 4, 0.28);
    this.ownedGeometries.push(pillarGeo);
    for (const [px, pz] of [
      [-3.2, -7.4],
      [-3.2, 7.4],
      [3.2, -7.4],
      [3.2, 7.4],
    ] as const) {
      const pillar = new THREE.Mesh(pillarGeo, metal);
      pillar.position.set(px, 2.05, pz);
      group.add(pillar);
    }

    const neonGeo = new THREE.BoxGeometry(7.4, 0.06, 0.08);
    this.ownedGeometries.push(neonGeo);
    const neonFront = new THREE.Mesh(neonGeo, accentCyan);
    neonFront.position.set(0, 4.16, 8.15);
    group.add(neonFront);
    const neonSide = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 16.2), accentMagenta);
    this.ownedGeometries.push(neonSide.geometry);
    neonSide.position.set(-3.55, 4.16, 0);
    group.add(neonSide);

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(6.4, 28),
      new THREE.MeshBasicMaterial({
        color: 0x05070c,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
      })
    );
    shadow.name = 'marseille-metro-shadow';
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.03;
    this.ownedGeometries.push(shadow.geometry);
    group.add(shadow);

    const interior = new THREE.PointLight(0xffe27a, 0.55, 16, 2);
    interior.name = 'marseille-metro-interior-light';
    interior.position.set(0, 3.2, 0);
    group.add(interior);

    this.addMetroStationSign(group);
    this.root.add(group);

    this.prototypeColliders.push({
      minX: mx - 3.7,
      maxX: mx + 3.7,
      minZ: mz - 8.2,
      maxZ: mz + 8.2,
    });
  }

  private addMetroStationSign(group: THREE.Group): void {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#071018';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#40e0ff';
    ctx.lineWidth = 10;
    ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);
    ctx.fillStyle = '#ffe600';
    ctx.beginPath();
    ctx.roundRect(36, 48, 88, 160, 18);
    ctx.fill();
    ctx.fillStyle = '#071018';
    ctx.font = '900 92px Arial Black, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('M', 80, 128);
    ctx.fillStyle = '#f4fbff';
    ctx.font = '800 52px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(METRO_SPAWN_ANCHOR.stationName, 150, 108);
    ctx.fillStyle = 'rgba(64, 224, 255, 0.92)';
    ctx.font = '700 28px Arial, sans-serif';
    ctx.fillText('LIGNE NORD  ·  RÉSEAU URBAIN', 152, 168);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    this.ownedTextures.push(texture);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
    });
    this.buildingMaterials.push(material);
    const signGeo = new THREE.PlaneGeometry(6.4, 1.6);
    this.ownedGeometries.push(signGeo);
    const sign = new THREE.Mesh(signGeo, material);
    sign.name = 'marseille-metro-sign';
    sign.position.set(3.55, 3.15, 0);
    sign.rotation.y = Math.PI / 2;
    group.add(sign);
  }

  private addCityGround(): void {
    if (!this.root) return;

    disposeGroundTextures(this.groundTextureOwner);
    if (this.groundMaterials) {
      disposeGroundMaterialSet(this.groundMaterials);
    }

    this.groundMaterials = createGroundMaterialSet(this.groundTextureOwner, this.renderQuality());
    const built = buildCityGroundMeshes(
      VIEUX_PORT_GROUND_CORRIDORS,
      VIEUX_PORT_GROUND_PLATES,
      VIEUX_PORT_CROSSWALKS,
      this.groundMaterials
    );

    this.groundRoot = built.group;
    this.root.add(built.group);
    this.ownedGeometries.push(...built.geometries);
    this.buildingMaterials.push(...built.materials);
    this.atmosphere.enableShadowsOnObject(built.group, { cast: false, receive: true });

    this.addCanebiereRoadMarkings();
    this.addRoadSlogans(groundTopY('road'));
    this.addNightStreetLighting();

    void this.enhanceGroundFromOsm().catch((err) => {
      console.warn('[MarseilleMapProvider] OSM streets (async) echoue.', err);
    });
  }

  private addNightStreetLighting(): void {
    if (!this.root || !nightStreetLampsEnabled(this.renderQuality())) return;

    if (this.streetLampLightPool) {
      this.root.remove(this.streetLampLightPool.group);
      this.streetLampLightPool.dispose();
      this.streetLampLightPool = null;
    }

    const lampHeadY = groundTopY('sidewalk') + 3.5;
    const specs: StreetLampSpec[] = [...this.quayLampSpecs];

    for (const corridor of VIEUX_PORT_GROUND_CORRIDORS) {
      if (corridor.id === 'canebiere' || corridor.id === 'spawn-connector') {
        specs.push(
          ...corridorStreetLampSpecs(corridor, lampHeadY, {
            maxRadiusFromOrigin: corridor.id === 'spawn-connector' ? 72 : 115,
          })
        );
      }
    }

    if (specs.length === 0) return;

    const perf = mapPerfProfile(this.renderQuality());
    this.streetLampLightPool = createStreetLampLightPool(specs, perf.streetLampSpotCap, {
      castShadow: perf.spotLightShadows,
      intensity: this.renderQuality() === 'high' ? 0.78 : 0.68,
    });
    if (this.streetLampLightPool) {
      this.root.add(this.streetLampLightPool.group);
    }
  }

  /** Phase 11 — mobilier urbain + végétation (InstancedMesh). */
  private addUrbanProps(): void {
    if (!this.root) return;

    const quality = this.renderQuality();
    const scope = urbanPropsScope(quality);

    if (this.urbanPropsRoot) {
      this.root.remove(this.urbanPropsRoot);
      this.urbanPropsRoot = null;
    }

    const street = buildVieuxPortStreetProps(scope, quality);
    this.urbanPropsRoot = new THREE.Group();
    this.urbanPropsRoot.name = 'marseille-urban-props';
    this.urbanPropsRoot.add(street.group);
    this.root.add(this.urbanPropsRoot);

    this.ownedGeometries.push(...street.geometries);
    this.buildingMaterials.push(...street.materials);
    this.atmosphere.enableShadowsOnObject(street.group, { cast: true, receive: false });

    console.info(
      '[MarseilleMapProvider] Props urbains',
      scope,
      '— arbres:',
      street.counts.tree,
      'bancs:',
      street.counts.bench,
      'poubelles:',
      street.counts.bin
    );
  }

  private addCanebiereRoadMarkings(): void {
    if (!this.root || !this.groundMaterials) return;
    const corridor = VIEUX_PORT_GROUND_CORRIDORS.find((c) => c.id === 'canebiere');
    if (!corridor) return;

    const roadTop = groundTopY('road');
    const markGroup = new THREE.Group();
    markGroup.name = 'marseille-canebiere-markings';
    markGroup.position.set(corridor.centerX, roadTop + 0.012, corridor.centerZ - 30);
    markGroup.rotation.y = corridor.rotationY;

    const centerLineGeo = new THREE.PlaneGeometry(0.18, 270);
    this.ownedGeometries.push(centerLineGeo);
    const centerLine = new THREE.Mesh(centerLineGeo, this.groundMaterials.centerLine);
    centerLine.name = 'marseille-canebiere-center-line';
    centerLine.rotation.x = -Math.PI / 2;
    markGroup.add(centerLine);

    const laneGlowGeo = new THREE.PlaneGeometry(corridor.roadWidth + 1.2, 250);
    this.ownedGeometries.push(laneGlowGeo);
    const laneGlow = new THREE.Mesh(laneGlowGeo, this.groundMaterials.laneGlow);
    laneGlow.name = 'marseille-canebiere-glow';
    laneGlow.rotation.x = -Math.PI / 2;
    laneGlow.position.y = -0.006;
    markGroup.add(laneGlow);

    this.root.add(markGroup);
  }

  private async enhanceGroundFromOsm(): Promise<void> {
    if (!this.groundRoot || !this.groundMaterials) return;

    const streets = await this.osmStreets.loadStreetsVieuxPortCore();
    if (!streets.length) return;

    if (!this.osmGroundRoot) {
      this.osmGroundRoot = new THREE.Group();
      this.osmGroundRoot.name = 'marseille-osm-ground';
      this.groundRoot.add(this.osmGroundRoot);
    }

    const polygons = streets.flatMap((way) => {
      const world = way.points.map((p) => this.geo.geoToWorld(p.latitude, p.longitude, 0));
      const cx = world.reduce((s, p) => s + p.x, 0) / (world.length || 1);
      const cz = world.reduce((s, p) => s + p.z, 0) / (world.length || 1);
      if (isHarborWaterAt(cx, cz)) return [];
      return osmWayToPolygonDefs(way.id, way.points, way.highwayType, this.geo);
    });

    const added = appendOsmStreetPolygons(
      this.osmGroundRoot,
      polygons,
      this.groundMaterials,
      this.ownedGeometries,
      osmContentStreetCap()
    );
    const curbs = appendOsmRoadCurbs(
      this.osmGroundRoot,
      polygons,
      this.groundMaterials,
      this.ownedGeometries
    );
    if (added > 0 || curbs > 0) {
      console.info(
        '[MarseilleMapProvider] Sol OSM polygones (Vieux-Port 420 m) +',
        added,
        '/',
        polygons.length,
        'curbs',
        curbs
      );
      void yieldToIdleBatch({ fallbackDelayMs: 12, idleTimeoutMs: 1200 }).then(() => {
        if (!this.osmGroundRoot) return;
        const batch = batchGroundMeshesByMaterial(this.osmGroundRoot);
        if (batch.mergedMeshes > 0) {
          console.info(
            '[MarseilleMapProvider] Sol OSM batch Phase 24',
            batch.mergedMeshes,
            '<-',
            batch.sourceMeshes
          );
        }
      });
    }
  }


  private createValidationCamera(): void {
    const view = VIEUX_PORT_METRO_MIRROR_VIEW;
    const camera = new THREE.PerspectiveCamera(52, 16 / 9, 0.2, 520);
    camera.name = view.id;
    camera.position.set(view.position.x, view.position.y, view.position.z);
    camera.lookAt(view.lookAt.x, view.lookAt.y, view.lookAt.z);
    this.validationCamera = camera;

    const alignView = VIEUX_PORT_BUILDING_ALIGNMENT_VIEW;
    const alignCam = new THREE.PerspectiveCamera(48, 16 / 9, 0.2, 720);
    alignCam.name = alignView.id;
    alignCam.position.set(alignView.position.x, alignView.position.y, alignView.position.z);
    alignCam.lookAt(alignView.lookAt.x, alignView.lookAt.y, alignView.lookAt.z);
    this.alignmentCamera = alignCam;

    if (!this.root || !this.config.configuration.enableDebug) return;
    this.root.add(camera);
    this.root.add(alignCam);
    const helper = new THREE.CameraHelper(camera);
    helper.name = 'marseille-validation-camera-helper';
    this.root.add(helper);
    const alignHelper = new THREE.CameraHelper(alignCam);
    alignHelper.name = 'marseille-alignment-camera-helper';
    this.root.add(alignHelper);
    this.addAnchorDebugMarkers();
    this.addGeoReferenceDebugHelpers();
  }

  private addGeoReferenceDebugHelpers(): void {
    if (!this.root) return;

    const northArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(0, 0.5, 0),
      12,
      0x40e0ff,
      2.4,
      1.2
    );
    northArrow.name = 'marseille-debug-north-axis';
    this.root.add(northArrow);

    const grid = new THREE.GridHelper(120, 24, 0x3a5570, 0x1a2a3a);
    grid.name = 'marseille-debug-metric-grid';
    grid.position.y = 0.02;
    this.root.add(grid);

    const originMarker = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0x40e0ff, transparent: true, opacity: 0.85 })
    );
    originMarker.name = 'marseille-debug-scene-origin';
    originMarker.position.set(0, 0.55, 0);
    this.root.add(originMarker);

    for (const anchor of MARSEILLE_VALIDATION_ANCHORS) {
      const expected = anchor.expectedWorldPosition;
      const marker = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.18, 0.9),
        new THREE.MeshBasicMaterial({
          color: anchor.confidence === 'high' ? 0x44ff88 : anchor.confidence === 'medium' ? 0xffcc44 : 0xff6644,
          transparent: true,
          opacity: 0.75,
        })
      );
      marker.name = `marseille-debug-anchor-${anchor.id}`;
      marker.position.set(expected.x, 0.42, expected.z);
      this.root.add(marker);
    }

    for (const def of MARSEILLE_LANDMARK_BUILDINGS) {
      const center = footprintCentroid(def.footprint, this.geo);
      const outline = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(
          def.footprint.slice(0, -1).map((p) => {
            const w = this.geo.geoToWorld(p.latitude, p.longitude, 0.06);
            return new THREE.Vector3(w.x, w.y, w.z);
          })
        ),
        new THREE.LineBasicMaterial({
          color: def.confidence === 'high' ? 0x44ff88 : 0xffcc44,
          transparent: true,
          opacity: 0.85,
        })
      );
      outline.name = `marseille-debug-footprint-${def.id}`;
      this.root.add(outline);

      const label = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.12, 0.6),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 })
      );
      label.name = `marseille-debug-center-${def.id}`;
      label.position.set(center.x, 0.35, center.z);
      this.root.add(label);
    }
  }

  private addAnchorDebugMarkers(): void {
    if (!this.root) return;
    const makeMarker = (name: string, x: number, z: number, color: number): void => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.2, 1.2),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7 })
      );
      mesh.name = name;
      mesh.position.set(x, 0.42, z);
      this.root!.add(mesh);
    };
    makeMarker('marseille-debug-mirror', METRO_SPAWN_ANCHOR.mirror.x, METRO_SPAWN_ANCHOR.mirror.z, 0x40e0ff);
    makeMarker(
      'marseille-debug-metro',
      METRO_SPAWN_ANCHOR.mirror.x + METRO_SPAWN_ANCHOR.offsetFromMirror.x,
      METRO_SPAWN_ANCHOR.mirror.z + METRO_SPAWN_ANCHOR.offsetFromMirror.z,
      0xffe600
    );
    makeMarker(
      'marseille-debug-spawn',
      METRO_SPAWN_ANCHOR.mirror.x + METRO_SPAWN_ANCHOR.spawnOffsetFromMirror.x,
      METRO_SPAWN_ANCHOR.mirror.z + METRO_SPAWN_ANCHOR.spawnOffsetFromMirror.z,
      0xff3ecf
    );
    makeMarker('marseille-debug-road', 0, -40, 0x9aa3ad);
    makeMarker('marseille-debug-crosswalk', 0, -18, 0xf2efe6);
    makeMarker(
      'marseille-debug-sea',
      0,
      (MARSEILLE_HARBOR_WATER.waterMinZ + MARSEILLE_HARBOR_WATER.waterMaxZ) * 0.5,
      0x2b67ff
    );
  }

  private createBuildingMaterial(color: number): THREE.MeshLambertMaterial {
    const material = new THREE.MeshLambertMaterial({ color });
    this.buildingMaterials.push(material);
    return material;
  }

  private createPrototypeFacadeMaterial(
    baseColor: number,
    style: 'haussmann' | 'stone'
  ): THREE.MeshStandardMaterial {
    const material = createHaussmannWallMaterial(
      style === 'haussmann' ? 5 : 9,
      this.buildingFacadeTextureOwner,
      {
        baseColor,
        windowColor: style === 'haussmann' ? '#efe4c9' : '#d8f0ff',
        accentColor: style === 'haussmann' ? '#b8895f' : '#7c99b9',
        shutters: style === 'haussmann',
        windowLitRatio: CYBERPUNK_ART_DIRECTION.buildings.windowVariation,
        quality: this.renderQuality(),
      }
    );
    this.buildingMaterials.push(material);
    return material;
  }

  private createPrototypeRoofMaterial(): THREE.MeshStandardMaterial {
    const material = createHaussmannRoofMaterial(this.buildingFacadeTextureOwner, this.renderQuality());
    this.buildingMaterials.push(material);
    return material;
  }

  private createRealisticOsmWallMaterial(seed = 17): THREE.MeshStandardMaterial {
    const material = createHaussmannWallMaterial(seed, this.buildingFacadeTextureOwner, {
      baseColor: 0xcbbda6,
      windowColor: '#d9ebf5',
      accentColor: '#8d6f55',
      shutters: true,
      seed,
      quality: this.renderQuality(),
    });
    applyBuildingMaterialDefaults(material);
    this.buildingMaterials.push(material);
    return material;
  }

  private createRealisticOsmRoofMaterial(): THREE.MeshStandardMaterial {
    const material = createHaussmannRoofMaterial(this.buildingFacadeTextureOwner, this.renderQuality());
    applyBuildingMaterialDefaults(material);
    this.buildingMaterials.push(material);
    return material;
  }

  private createOriginMarker(): void {
    if (!this.root || !this.config.configuration.enableDebug) return;

    const markerMat = new THREE.MeshLambertMaterial({
      color: 0x2e86ab,
      emissive: 0x1a5270,
      emissiveIntensity: 0.35,
    });
    const marker = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 2, 12), markerMat);
    marker.name = 'marseille-origin-marker';
    marker.position.set(0, 1.4, 0);
    this.root.add(marker);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(2.5, 3, 32),
      new THREE.MeshBasicMaterial({ color: 0x2e86ab, side: THREE.DoubleSide, transparent: true, opacity: 0.45 })
    );
    ring.name = 'marseille-origin-ring';
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.06;
    this.root.add(ring);
  }

  private createOrientationDebugHelpers(): void {
    if (!this.root || !this.config.configuration.enableDebug) return;

    const northArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(0, 0.3, 0),
      36,
      0x4ee4ff,
      6,
      2.8
    );
    northArrow.name = 'marseille-north-helper';
    this.root.add(northArrow);

    const seaArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0.22, 0),
      30,
      0x2b67ff,
      5,
      2.4
    );
    seaArrow.name = 'marseille-sea-helper';
    this.root.add(seaArrow);
  }

  /**
   * Overlay cyberpunk additif. Flag on : hologrammes enseigne, layer 1.
   * Spawn, colliders et raycast RDC inchangés (raycast no-op + layer isolé).
   */
  private attachCyberpunkOverlayLayer(): void {
    if (!this.root || !shouldAttachCyberpunkOverlay(this.config.configuration.quality)) return;
    this.cyberpunkOverlay = createCyberpunkOverlayGroup(true);
    this.root.add(this.cyberpunkOverlay.group);
    if (this.gameplayCamera) {
      enableOverlayOnCamera(this.gameplayCamera);
    }
  }

  private addSceneLighting(): void {
    if (!this.root) return;
    this.atmosphere.attachHarborAccents(this.root);
  }

  private addSynthwaveFacadeDesigns(visuals: OSMVisualMesh[], maxPanels = 72): void {
    if (!this.osmRoot || visuals.length === 0 || maxPanels <= 0) return;
    const ranked = [...visuals].sort((a, b) => a.center.lengthSq() - b.center.lengthSq());
    const keyTargets = ranked.slice(0, maxPanels);
    const palette = CYBERPUNK_ART_DIRECTION.buildings.neonPalette;
    const sharedPanels = palette.map(
      (color) =>
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: CYBERPUNK_ART_DIRECTION.buildings.neonPanelOpacity,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
    );
    const sharedFrame = new THREE.LineBasicMaterial({
      color: 0xc8f5ff,
      transparent: true,
      opacity: 0.48,
    });
    const sharedBeacons = palette.map(
      (color) =>
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.78,
        })
    );
    const sharedBeaconGeometry = new THREE.CylinderGeometry(0.16, 0.24, 1.2, 8);
    this.ownedGeometries.push(sharedBeaconGeometry);
    this.buildingMaterials.push(...sharedPanels, sharedFrame, ...sharedBeacons);

    keyTargets.forEach((entry, idx) => {
      const box = new THREE.Box3().setFromObject(entry.building);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const useXFace = size.x >= size.z;
      const panelWidth = Math.max(4.6, (useXFace ? size.x : size.z) * 0.58);
      const panelHeight = Math.max(3.8, Math.min(18, entry.height * 0.52));
      const colorIndex = idx % sharedPanels.length;

      const panelGeometry = new THREE.PlaneGeometry(panelWidth, panelHeight);
      this.ownedGeometries.push(panelGeometry);
      const panel = new THREE.Mesh(panelGeometry, sharedPanels[colorIndex]);

      if (useXFace) {
        const sign = center.x >= 0 ? 1 : -1;
        panel.position.set(center.x + sign * (size.x / 2 + 0.12), panelHeight * 0.5 + 1.1, center.z);
        panel.rotation.y = sign > 0 ? -Math.PI / 2 : Math.PI / 2;
      } else {
        const sign = center.z >= 0 ? 1 : -1;
        panel.position.set(center.x, panelHeight * 0.5 + 1.1, center.z + sign * (size.z / 2 + 0.12));
        panel.rotation.y = sign > 0 ? Math.PI : 0;
      }
      panel.name = `marseille-facade-panel-${idx}`;
      this.osmRoot!.add(panel);

      const frameGeometry = new THREE.EdgesGeometry(panelGeometry);
      this.ownedGeometries.push(frameGeometry);
      const frame = new THREE.LineSegments(frameGeometry, sharedFrame);
      frame.position.copy(panel.position);
      frame.rotation.copy(panel.rotation);
      frame.name = `marseille-facade-frame-${idx}`;
      this.osmRoot!.add(frame);

      if (entry.roof && idx % 2 === 0) {
        const roofBeacon = new THREE.Mesh(
          sharedBeaconGeometry,
          sharedBeacons[idx % sharedBeacons.length]
        );
        roofBeacon.name = `marseille-roof-beacon-${idx}`;
        roofBeacon.position.set(center.x, entry.height + 0.72, center.z);
        this.osmRoot!.add(roofBeacon);
      }
    });
  }

  private addSponsorStorefronts(visuals: OSMVisualMesh[]): void {
    if (!this.osmRoot || visuals.length === 0) return;

    const storefrontMaterial = this.createSponsorStorefrontMaterial();
    const canopyMaterial = new THREE.MeshStandardMaterial({
      color: 0x101923,
      emissive: 0x1d3247,
      emissiveIntensity: 0.24,
      roughness: 0.4,
      metalness: 0.26,
    });
    const entranceGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffe27a,
      transparent: true,
      opacity: 0.26,
      side: THREE.DoubleSide,
    });
    this.buildingMaterials.push(canopyMaterial, entranceGlowMaterial);
    const keyTargets = [...visuals]
      .filter((entry) => entry.height >= 10)
      .sort((a, b) => a.center.lengthSq() - b.center.lengthSq())
      .slice(0, 24);

    keyTargets.forEach((entry, idx) => {
      const box = new THREE.Box3().setFromObject(entry.building);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const useXFace = size.x >= size.z;
      const frontage = Math.max(8, Math.min(useXFace ? size.x : size.z, 26));
      const signWidth = Math.min(6.8, frontage * 0.42);
      const signHeight = 2.2;
      const inset = 0.14;
      const y = 3.2;

      const signGeometry = new THREE.PlaneGeometry(signWidth, signHeight);
      this.ownedGeometries.push(signGeometry);
      const sign = new THREE.Mesh(signGeometry, storefrontMaterial);

      if (useXFace) {
        const signDir = center.x >= 0 ? 1 : -1;
        sign.position.set(center.x + signDir * (size.x / 2 + inset), y, center.z);
        sign.rotation.y = signDir > 0 ? -Math.PI / 2 : Math.PI / 2;
      } else {
        const signDir = center.z >= 0 ? 1 : -1;
        sign.position.set(center.x, y, center.z + signDir * (size.z / 2 + inset));
        sign.rotation.y = signDir > 0 ? Math.PI : 0;
      }

      sign.name = `marseille-storefront-sign-${idx}`;
      this.osmRoot!.add(sign);

      const canopyGeometry = new THREE.BoxGeometry(signWidth + 0.6, 0.22, 1.2);
      this.ownedGeometries.push(canopyGeometry);
      const canopy = new THREE.Mesh(canopyGeometry, canopyMaterial);

      if (useXFace) {
        const signDir = center.x >= 0 ? 1 : -1;
        canopy.position.set(center.x + signDir * (size.x / 2 + 0.62), y - 1.45, center.z);
        canopy.rotation.y = sign.rotation.y;
      } else {
        const signDir = center.z >= 0 ? 1 : -1;
        canopy.position.set(center.x, y - 1.45, center.z + signDir * (size.z / 2 + 0.62));
        canopy.rotation.y = sign.rotation.y;
      }

      canopy.name = `marseille-storefront-canopy-${idx}`;
      this.osmRoot!.add(canopy);

      const entranceGlowGeometry = new THREE.PlaneGeometry(signWidth * 0.72, 1.4);
      this.ownedGeometries.push(entranceGlowGeometry);
      const entranceGlow = new THREE.Mesh(entranceGlowGeometry, entranceGlowMaterial);

      if (useXFace) {
        const signDir = center.x >= 0 ? 1 : -1;
        entranceGlow.position.set(center.x + signDir * (size.x / 2 + 0.16), 1.2, center.z);
        entranceGlow.rotation.y = sign.rotation.y;
      } else {
        const signDir = center.z >= 0 ? 1 : -1;
        entranceGlow.position.set(center.x, 1.2, center.z + signDir * (size.z / 2 + 0.16));
        entranceGlow.rotation.y = sign.rotation.y;
      }

      entranceGlow.name = `marseille-storefront-entrance-${idx}`;
      this.osmRoot!.add(entranceGlow);
    });
  }

  private addGroundGlassFacades(visuals: OSMVisualMesh[]): void {
    if (!this.osmRoot || visuals.length === 0) return;

    const glassMaterial = new THREE.MeshStandardMaterial({
      color: CYBERPUNK_ART_DIRECTION.buildings.glassColor,
      roughness: CYBERPUNK_ART_DIRECTION.buildings.glassRoughness,
      metalness: CYBERPUNK_ART_DIRECTION.buildings.glassMetalness,
      transparent: true,
      opacity: CYBERPUNK_ART_DIRECTION.buildings.glassOpacity,
      envMapIntensity: 1.15,
      depthWrite: false,
      side: THREE.FrontSide,
    });
    this.buildingMaterials.push(glassMaterial);

    const keyTargets = [...visuals]
      .filter((entry) => entry.height >= 8)
      .sort((a, b) => a.center.lengthSq() - b.center.lengthSq())
      .slice(0, 18);

    keyTargets.forEach((entry, idx) => {
      const box = new THREE.Box3().setFromObject(entry.building);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const useXFace = size.x >= size.z;
      const frontage = Math.max(6.5, Math.min(useXFace ? size.x : size.z, 22) * 0.72);
      const glassHeight = 3.1;
      const inset = 0.09;
      const geometry = new THREE.PlaneGeometry(frontage, glassHeight);
      this.ownedGeometries.push(geometry);
      const glass = new THREE.Mesh(geometry, glassMaterial);

      if (useXFace) {
        const signDir = center.x >= 0 ? 1 : -1;
        glass.position.set(center.x + signDir * (size.x / 2 + inset), 1.62, center.z);
        glass.rotation.y = signDir > 0 ? -Math.PI / 2 : Math.PI / 2;
      } else {
        const signDir = center.z >= 0 ? 1 : -1;
        glass.position.set(center.x, 1.62, center.z + signDir * (size.z / 2 + inset));
        glass.rotation.y = signDir > 0 ? Math.PI : 0;
      }

      glass.name = `marseille-ground-glass-${idx}`;
      glass.frustumCulled = true;
      this.osmRoot!.add(glass);
    });
  }

  private createSponsorStorefrontMaterial(): THREE.MeshBasicMaterial {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 192;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      const texture = new THREE.CanvasTexture(canvas);
      this.ownedTextures.push(texture);
      const fallback = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
      this.buildingMaterials.push(fallback);
      return fallback;
    }

    const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    bg.addColorStop(0, '#0e1822');
    bg.addColorStop(1, '#17283c');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(162, 241, 255, 0.9)';
    ctx.lineWidth = 10;
    ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);

    ctx.fillStyle = '#ffd84e';
    ctx.beginPath();
    ctx.roundRect(28, 34, 108, 108, 28);
    ctx.fill();

    ctx.fillStyle = '#0d1620';
    ctx.font = '900 64px Arial Black, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('M', 82, 92);

    ctx.fillStyle = '#f4fbff';
    ctx.font = '900 52px Arial Black, Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('MARSEILLE PRO', 162, 82);

    ctx.fillStyle = 'rgba(158, 250, 255, 0.95)';
    ctx.font = '700 24px Arial, sans-serif';
    ctx.fillText('EMPLACEMENT SPONSORISABLE', 164, 122);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    this.ownedTextures.push(texture);

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
    });
    this.buildingMaterials.push(material);
    return material;
  }

  private computeFootprintCenter(
    points: Array<{ latitude: number; longitude: number }>
  ): THREE.Vector3 {
    const world = points.map((point) => this.geo.geoToWorld(point.latitude, point.longitude, 0));
    const sum = world.reduce((acc, p) => acc.add(p), new THREE.Vector3());
    return sum.multiplyScalar(1 / world.length);
  }

  private isWalkable(x: number, z: number, radius: number): boolean {
    if (isHarborWaterBlockedAt(x, z, radius)) return false;

    for (const collider of this.prototypeColliders) {
      const nearestX = THREE.MathUtils.clamp(x, collider.minX, collider.maxX);
      const nearestZ = THREE.MathUtils.clamp(z, collider.minZ, collider.maxZ);
      const dx = x - nearestX;
      const dz = z - nearestZ;
      if (dx * dx + dz * dz < radius * radius) {
        return false;
      }
    }

    return isHarborLandAt(x, z);
  }

  private addPrototypeColliderIfClear(collider: PrototypeCollider): void {
    // Ne jamais bloquer les rues / esplanade / zone spawn (sinon joystick coincé).
    if (colliderIntersectsStreetCorridor(collider)) return;
    if (this.colliderBlocksSpawnClearance(collider)) return;

    // Inset léger : laisse un filet de trottoir autour du massing.
    const pad = 0.55;
    const width = collider.maxX - collider.minX;
    const depth = collider.maxZ - collider.minZ;
    if (width <= pad * 2.5 || depth <= pad * 2.5) {
      return;
    }
    this.prototypeColliders.push({
      minX: collider.minX + pad,
      maxX: collider.maxX - pad,
      minZ: collider.minZ + pad,
      maxZ: collider.maxZ - pad,
    });
  }

  /** AABB trop proche du miroir/spawn → pas de collider (libre de sortir). */
  private colliderBlocksSpawnClearance(collider: PrototypeCollider): boolean {
    const nx = THREE.MathUtils.clamp(0, collider.minX, collider.maxX);
    const nz = THREE.MathUtils.clamp(0, collider.minZ, collider.maxZ);
    return nx * nx + nz * nz < SPAWN_COLLIDER_CLEARANCE_M * SPAWN_COLLIDER_CLEARANCE_M;
  }

  private stableIndexFromPoints(
    points: Array<{ latitude: number; longitude: number }>,
    modulo: number
  ): number {
    const first = points[0];
    if (!first || modulo <= 0) {
      return 0;
    }
    const seed = Math.round(first.latitude * 10000) * 31 + Math.round(first.longitude * 10000);
    return Math.abs(seed) % modulo;
  }

  private removePrototypeBuildingMeshes(): void {
    if (!this.root || !this.prototypeBuildingsLoaded) return;

    const removablePrefixes = ['marseille-building-'];
    const removableNames = new Set([
      'marseille-grid-guide',
    ]);

    const toRemove = this.root.children.filter((child) => {
      if (removableNames.has(child.name)) return true;
      return removablePrefixes.some((prefix) => child.name.startsWith(prefix));
    });

    for (const child of toRemove) {
      this.root.remove(child);
      const mesh = child as THREE.Mesh;
      mesh.geometry?.dispose?.();
    }

    if (this.prototypeColliderCount > 0) {
      this.prototypeColliders.splice(0, this.prototypeColliderCount);
      this.prototypeColliderCount = 0;
    }
    this.prototypeBuildingsLoaded = false;
  }

  /**
   * Nettoie les objets legacy potentiellement présents.
   * (Cas de test : ancien floor resté par artefact visuel / draw order / z-fighting.)
   */
  private removeLegacyMeshes(scene: THREE.Scene): void {
    const legacyNames = ['neon-floor', 'path-line'];
    for (const name of legacyNames) {
      const obj = scene.getObjectByName(name);
      if (!obj) continue;
      scene.remove(obj);
      // Libération minimale : on laisse les éventuels dispose complets aux providers dédiés.
    }
  }
}
