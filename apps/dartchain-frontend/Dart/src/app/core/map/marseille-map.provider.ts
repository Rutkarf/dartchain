import { Injectable, inject } from '@angular/core';
import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';

import { MapConfigService } from './map-config.service';
import { GeoCoordinateService } from './geo-coordinate.service';
import { OSMBuildingProvider } from './osm-building.provider';
import type { MapProvider, SurfaceProvider } from './map-provider.interface';
import {
  METRO_SPAWN_ANCHOR,
  MIRROR_SECOND_BUILDING_ID,
  SCENE_COPY,
  VIEUX_PORT_METRO_MIRROR_VIEW,
} from './map-configuration';
import { WorldStreamingManager } from './world-streaming.manager';
import { TokenCellService } from './token-cell.service';
import { M4t3rPickupFxService } from './m4t3r-pickup-fx.service';

/** Taille de la zone de test initiale autour du Vieux-Port (mètres). */
const INITIAL_TERRAIN_SIZE_M = 800;
const STREET_HALF_WIDTH = 16;
const CANEBIERE_CORRIDOR = {
  minX: -34,
  maxX: 34,
  minZ: -230,
  maxZ: 18,
} as const;
const HARBOR_QUAY_Z = 16;
const HARBOR_WATER_CENTER_Z = 54;
const HARBOR_WATER_DEPTH = 96;
const CYBERPUNK_ART_DIRECTION = {
  lights: {
    moonColor: 0xb7c8ff,
    moonIntensity: 0.82,
    hemiSky: 0x7a8cff,
    hemiGround: 0x180f24,
    hemiIntensity: 0.34,
    harborCyan: 0x42dcff,
    harborCyanIntensity: 0.78,
    harborMagenta: 0xff51c8,
    harborMagentaIntensity: 0.62,
    depthBlue: 0x6aa7ff,
    depthBlueIntensity: 0.34,
  },
  atmosphere: {
    hazeNearOpacity: 0.09,
    hazeFarOpacity: 0.055,
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
    windowVariation: 0.38,
    emissiveIntensity: 0.16,
    neonPalette: [0xff3ecf, 0x40e0ff, 0x7a5cff, 0xffe600] as const,
    neonPanelOpacity: 0.38,
    glassColor: 0x8fd8ff,
    glassOpacity: 0.3,
    glassRoughness: 0.14,
    glassMetalness: 0.78,
  },
} as const;
const OSM_QUERY_BOUNDS = {
  south: 43.2937,
  north: 43.2999,
  west: 5.3642,
  east: 5.3778,
} as const;

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
  private readonly streaming = inject(WorldStreamingManager);
  private readonly tokenCells = inject(TokenCellService);
  private readonly pickupFx = inject(M4t3rPickupFxService);

  private scene: THREE.Scene | null = null;
  private root: THREE.Group | null = null;
  private terrainMesh: THREE.Mesh | null = null;
  private terrainMaterial: THREE.MeshStandardMaterial | null = null;
  private terrainBorderMaterial: THREE.LineBasicMaterial | null = null;
  private readonly buildingMaterials: THREE.Material[] = [];
  private readonly prototypeColliders: PrototypeCollider[] = [];
  private readonly ownedGeometries: THREE.BufferGeometry[] = [];
  private readonly ownedTextures: THREE.Texture[] = [];
  private osmRoot: THREE.Group | null = null;
  private prototypeBuildingsLoaded = false;
  private prototypeColliderCount = 0;
  private canopyReflector: Reflector | null = null;
  private waterMesh: THREE.Mesh | null = null;
  private validationCamera: THREE.PerspectiveCamera | null = null;

  private readonly surfaceProvider: SurfaceProvider = {
    getSurfaceHeight: async (worldPosition) => this.getSurfaceHeight(worldPosition),
    getSurfaceHeightSync: () => 0,
    isWalkable: (x, z, radius) => this.isWalkable(x, z, radius),
  };

  async initialize(scene: THREE.Scene, _camera: THREE.Camera): Promise<void> {
    try {
      this.removeLegacyMeshes(scene);
      this.scene = scene;
      this.root = new THREE.Group();
      this.root.name = 'marseille-map-root';
      scene.add(this.root);

      this.createPrototypeTerrain();
      this.createPrototypeBuildings();
      this.createOrientationDebugHelpers();
      await this.loadOsmBuildings();
      this.createOriginMarker();
      this.addMetroStation();
      this.addSceneLighting();
      this.createValidationCamera();
      this.streaming.attach(this.root);
      this.tokenCells.attach(this.root);
      this.pickupFx.attach(scene);
      this.streaming.update(new THREE.Vector3(0, 0, 0));

      if (this.config.configuration.enableDebug) {
        console.info(
          '[MarseilleMapProvider] Carte prototype chargee (terrain plat Vieux-Port).'
        );
      } else {
        console.info('[MarseilleMapProvider] init() ok (prototype visible).');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[MarseilleMapProvider] init() fatal — fallback legacy attendu.', message, error);
      // IMPORTANT: on ne throw pas ici, pour éviter de masquer l'objectif étape 2.
      // Le provider peut rester partiellement affiché si certaines parties échouent.
    }
  }

  update(cameraPosition: THREE.Vector3): void {
    if (this.waterMesh) {
      const t = performance.now() * 0.00055;
      this.waterMesh.position.y = -0.48 + Math.sin(t) * 0.035;
    }
    this.streaming.update(cameraPosition);
    this.tokenCells.update(cameraPosition);
  }

  async getSurfaceHeight(_worldPosition: THREE.Vector3): Promise<number> {
    return 0;
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
    if (this.canopyReflector) {
      this.canopyReflector.getRenderTarget()?.dispose();
      this.canopyReflector.geometry.dispose();
      this.canopyReflector = null;
    }
    this.buildingMaterials.length = 0;
    this.ownedGeometries.length = 0;
    this.ownedTextures.length = 0;
    this.prototypeColliders.length = 0;
    this.tokenCells.dispose();
    this.streaming.dispose();
    this.pickupFx.dispose();
    this.root = null;
    this.osmRoot = null;
    this.prototypeBuildingsLoaded = false;
    this.prototypeColliderCount = 0;
    this.terrainMesh = null;
    this.terrainMaterial = null;
    this.terrainBorderMaterial = null;
    this.waterMesh = null;
    this.validationCamera = null;
    if (this.scene) {
      this.scene.environment = null;
    }
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
    this.terrainMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: terrainTexture,
      roughness: 0.92,
      metalness: 0.03,
      side: THREE.FrontSide,
    });

    const geometry = new THREE.PlaneGeometry(INITIAL_TERRAIN_SIZE_M, INITIAL_TERRAIN_SIZE_M, 1, 1);
    this.terrainMesh = new THREE.Mesh(geometry, this.terrainMaterial);
    this.terrainMesh.name = 'marseille-terrain-prototype';
    this.terrainMesh.rotation.x = -Math.PI / 2;
    this.terrainMesh.position.y = 0;
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
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
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
      { x: -10, z: 118, width: 120, depth: 22, height: 9, color: 0xd8c3a5 },
    ];

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
    this.addWaterStrip();
    this.addStreetCross();
    this.prototypeBuildingsLoaded = true;
    this.prototypeColliderCount = this.prototypeColliders.length;
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

    this.addColliderIfOutsideCanebiere({
      minX: spec.x - spec.width / 2,
      maxX: spec.x + spec.width / 2,
      minZ: spec.z - spec.depth / 2,
      maxZ: spec.z + spec.depth / 2,
    });
  }

  private async loadOsmBuildings(): Promise<void> {
    if (!this.root || !this.config.configuration.enableBuildings) return;

    try {
      const buildings = await this.osmBuildings.loadBuildings(OSM_QUERY_BOUNDS);
      if (!buildings.length) {
        console.warn('[MarseilleMapProvider] Aucun batiment OSM charge, fallback prototype conserve.');
        return;
      }

      this.osmRoot = new THREE.Group();
      this.osmRoot.name = 'marseille-osm-buildings';
      this.root.add(this.osmRoot);

      const wallMaterials = [
        this.createRealisticOsmWallMaterial(11),
        this.createRealisticOsmWallMaterial(29),
        this.createRealisticOsmWallMaterial(47),
      ];
      const roofMaterial = this.createRealisticOsmRoofMaterial();

      let loadedCount = 0;
      const visuals: OSMVisualMesh[] = [];
      for (const building of buildings.slice(0, 140)) {
        const materialIndex = this.stableIndexFromPoints(building.points, wallMaterials.length);
        const mesh = this.createOsmBuildingMesh(
          building.points,
          building.height,
          wallMaterials[materialIndex]
        );
        if (!mesh) continue;
        this.osmRoot.add(mesh);

        const roof = this.createOsmRoofMesh(building.points, building.height, roofMaterial);
        if (roof) {
          this.osmRoot.add(roof);
        }

        this.addFootprintCollider(building.points);
        visuals.push({
          building: mesh,
          roof,
          center: this.computeFootprintCenter(building.points),
          height: building.height,
        });
        loadedCount++;
      }

      this.addSynthwaveFacadeDesigns(visuals);
      this.addSponsorStorefronts(visuals);
      this.addGroundGlassFacades(visuals);
      if (loadedCount > 24) {
        this.removePrototypeBuildingMeshes();
      }
      console.info('[MarseilleMapProvider] Batiments OSM charges:', loadedCount);
    } catch (error) {
      console.warn('[MarseilleMapProvider] Echec chargement OSM, volumes prototype conserves.', error);
    }
  }

  private createOsmBuildingMesh(
    points: Array<{ latitude: number; longitude: number }>,
    height: number,
    material: THREE.Material
  ): THREE.Mesh | null {
    const worldPoints = points.map((point) =>
      this.geo.geoToWorld(point.latitude, point.longitude, 0)
    );
    const shapePoints = worldPoints
      .slice(0, -1)
      .map((point) => new THREE.Vector2(point.x, -point.z));

    if (shapePoints.length < 3) return null;

    const geometry = new THREE.ExtrudeGeometry(new THREE.Shape(shapePoints), {
      depth: height,
      bevelEnabled: false,
      steps: 1,
    });
    geometry.rotateX(-Math.PI / 2);
    geometry.computeVertexNormals();
    this.ownedGeometries.push(geometry);

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'marseille-osm-building';
    mesh.frustumCulled = true;
    return mesh;
  }

  private createOsmRoofMesh(
    points: Array<{ latitude: number; longitude: number }>,
    height: number,
    material: THREE.Material
  ): THREE.Mesh | null {
    const worldPoints = points.map((point) =>
      this.geo.geoToWorld(point.latitude, point.longitude, 0)
    );
    const shapePoints = worldPoints
      .slice(0, -1)
      .map((point) => new THREE.Vector2(point.x, -point.z));

    if (shapePoints.length < 3) return null;

    const geometry = new THREE.ShapeGeometry(new THREE.Shape(shapePoints));
    geometry.rotateX(-Math.PI / 2);
    this.ownedGeometries.push(geometry);
    const roof = new THREE.Mesh(geometry, material);
    roof.name = 'marseille-osm-roof';
    roof.position.y = height + 0.08;
    roof.frustumCulled = true;
    return roof;
  }

  private addFootprintCollider(
    points: Array<{ latitude: number; longitude: number }>
  ): void {
    const worldPoints = points.map((point) =>
      this.geo.geoToWorld(point.latitude, point.longitude, 0)
    );
    const xs = worldPoints.map((point) => point.x);
    const zs = worldPoints.map((point) => point.z);
    this.addColliderIfOutsideCanebiere({
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minZ: Math.min(...zs),
      maxZ: Math.max(...zs),
    });
  }

  private addWaterStrip(): void {
    if (!this.root) return;
    const waterGeometry = new THREE.PlaneGeometry(420, 220, 1, 1);
    this.ownedGeometries.push(waterGeometry);
    const waterMaterial = new THREE.MeshStandardMaterial({
      color: 0x16344f,
      roughness: 0.22,
      metalness: 0.48,
      envMapIntensity: 0.85,
      transparent: true,
      opacity: 0.96,
    });
    this.buildingMaterials.push(waterMaterial);
    const water = new THREE.Mesh(waterGeometry, waterMaterial);
    water.name = 'marseille-water-strip';
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, -0.48, HARBOR_WATER_CENTER_Z + 28);
    this.root.add(water);
    this.waterMesh = water;

    const waterGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(228, HARBOR_WATER_DEPTH - 8),
      new THREE.MeshBasicMaterial({
        color: 0x3a88b8,
        transparent: true,
        opacity: 0.07,
      })
    );
    waterGlow.name = 'marseille-water-glow';
    waterGlow.rotation.x = -Math.PI / 2;
    waterGlow.position.set(0, -0.42, HARBOR_WATER_CENTER_Z + 1);
    this.root.add(waterGlow);

    const quayGeometry = new THREE.PlaneGeometry(240, 24);
    this.ownedGeometries.push(quayGeometry);
    const quayMaterial = new THREE.MeshStandardMaterial({
      color: 0x8f97a3,
      roughness: CYBERPUNK_ART_DIRECTION.streets.quayRoughness,
      metalness: CYBERPUNK_ART_DIRECTION.streets.quayMetalness,
      envMapIntensity: 0.6,
    });
    this.buildingMaterials.push(quayMaterial);
    const quay = new THREE.Mesh(quayGeometry, quayMaterial);
    quay.name = 'marseille-old-port-quay';
    quay.rotation.x = -Math.PI / 2;
    quay.position.set(0, 0.018, HARBOR_QUAY_Z);
    this.root.add(quay);

    const quaySheenGeometry = new THREE.PlaneGeometry(236, 10);
    this.ownedGeometries.push(quaySheenGeometry);
    const quaySheenMaterial = new THREE.MeshBasicMaterial({
      color: CYBERPUNK_ART_DIRECTION.lights.harborCyan,
      transparent: true,
      opacity: CYBERPUNK_ART_DIRECTION.streets.quaySheenOpacity,
      depthWrite: false,
    });
    this.buildingMaterials.push(quaySheenMaterial);
    const quaySheen = new THREE.Mesh(quaySheenGeometry, quaySheenMaterial);
    quaySheen.name = 'marseille-quay-sheen';
    quaySheen.rotation.x = -Math.PI / 2;
    quaySheen.position.set(0, 0.024, HARBOR_QUAY_Z + 4);
    this.root.add(quaySheen);

    const quayEdge = new THREE.Mesh(
      new THREE.BoxGeometry(240, 0.38, 1.2),
      new THREE.MeshStandardMaterial({
        color: 0xf1d8a4,
        emissive: 0x6c5c24,
        emissiveIntensity: 0.22,
        roughness: 0.62,
        metalness: 0.12,
      })
    );
    quayEdge.name = 'marseille-quay-edge';
    quayEdge.position.set(0, 0.22, HARBOR_QUAY_Z + 11.4);
    this.root.add(quayEdge);

    const quayWallGeometry = new THREE.BoxGeometry(240, 1.15, 0.7);
    this.ownedGeometries.push(quayWallGeometry);
    const quayWallMaterial = new THREE.MeshStandardMaterial({
      color: 0x6d7380,
      roughness: 0.78,
      metalness: 0.08,
    });
    this.buildingMaterials.push(quayWallMaterial);
    const quayWall = new THREE.Mesh(quayWallGeometry, quayWallMaterial);
    quayWall.name = 'marseille-quay-wall';
    quayWall.position.set(0, -0.28, HARBOR_QUAY_Z + 12.05);
    this.root.add(quayWall);

    const mirror = new THREE.Mesh(
      new THREE.BoxGeometry(18, 0.6, 12),
      new THREE.MeshPhysicalMaterial({
        color: 0xd8f3ff,
        emissive: 0x243850,
        emissiveIntensity: 0.28,
        roughness: 0.12,
        metalness: 0.18,
        transmission: 0.22,
        transparent: true,
        opacity: 0.92,
      })
    );
    mirror.name = 'marseille-mirror-canopy';
    mirror.position.set(
      METRO_SPAWN_ANCHOR.mirror.x,
      METRO_SPAWN_ANCHOR.mirror.y,
      METRO_SPAWN_ANCHOR.mirror.z
    );
    this.root.add(mirror);
    this.addCanopyReflector(mirror.position.x, 5.28, mirror.position.z);
    this.addMirrorRoofSign(mirror.position.x, mirror.position.y + 0.42, mirror.position.z);

    const mirrorAura = new THREE.Mesh(
      new THREE.RingGeometry(8.6, 10.8, 48),
      new THREE.MeshBasicMaterial({
        color: 0x8eeeff,
        transparent: true,
        opacity: 0.18,
        side: THREE.DoubleSide,
      })
    );
    mirrorAura.name = 'marseille-mirror-aura';
    mirrorAura.rotation.x = -Math.PI / 2;
    mirrorAura.position.set(0, 0.05, 0);
    this.root.add(mirrorAura);

    const plaza = new THREE.Mesh(
      new THREE.CircleGeometry(12.5, 48),
      new THREE.MeshStandardMaterial({
        color: 0xc9c1b5,
        roughness: 0.88,
        metalness: 0.03,
      })
    );
    plaza.name = 'marseille-mirror-plaza';
    plaza.rotation.x = -Math.PI / 2;
    plaza.position.set(0, 0.36, -1.5);
    this.root.add(plaza);

    const mirrorPosts = [
      [-7, 2.5, -4],
      [7, 2.5, -4],
      [-7, 2.5, 4],
      [7, 2.5, 4],
    ] as const;
    const postMaterial = this.createBuildingMaterial(0x7f8c8d);
    for (const [x, y, z] of mirrorPosts) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.6, 5, 0.6), postMaterial);
      post.position.set(x, y, z);
      post.name = `marseille-mirror-post-${x}-${z}`;
      this.root.add(post);
    }
  }

  private addHarborLandmarks(): void {
    if (!this.root) return;

    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x7edcff,
      emissive: 0x1d365c,
      emissiveIntensity: 0.38,
      roughness: 0.16,
      metalness: 0.12,
      transmission: 0.24,
      transparent: true,
      opacity: 0.88,
    });
    const warmMaterial = new THREE.MeshLambertMaterial({
      color: 0xffb3d7,
      emissive: 0x532342,
      emissiveIntensity: 0.34,
    });
    const roofGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0x6ff7ff,
      transparent: true,
      opacity: 0.72,
    });
    this.buildingMaterials.push(glassMaterial, warmMaterial, roofGlowMaterial);

    const landmarks = [
      { x: -54, z: -22, width: 22, depth: 16, height: 20, material: glassMaterial, id: 'mirror-adjacent-building-01' },
      { x: 56, z: -18, width: 24, depth: 18, height: 24, material: warmMaterial, id: MIRROR_SECOND_BUILDING_ID },
      { x: -58, z: 24, width: 18, depth: 16, height: 18, material: warmMaterial, id: 'harbor-west-building' },
      { x: 58, z: 26, width: 18, depth: 18, height: 19, material: glassMaterial, id: 'harbor-east-building' },
    ] as const;

    for (const landmark of landmarks) {
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(landmark.width, landmark.height, landmark.depth),
        landmark.material
      );
      body.name = landmark.id;
      body.position.set(landmark.x, landmark.height / 2, landmark.z);
      this.root.add(body);

      const crown = new THREE.Mesh(
        new THREE.BoxGeometry(landmark.width * 0.92, 0.8, landmark.depth * 0.92),
        roofGlowMaterial
      );
      crown.name = `${body.name}-crown`;
      crown.position.set(landmark.x, landmark.height + 0.44, landmark.z);
      this.root.add(crown);

      if (landmark.id === MIRROR_SECOND_BUILDING_ID) {
        this.addR4v3FacadeSign(landmark.x, landmark.height * 0.55, landmark.z, landmark.width, landmark.depth);
      }

      this.addColliderIfOutsideCanebiere({
        minX: landmark.x - landmark.width / 2,
        maxX: landmark.x + landmark.width / 2,
        minZ: landmark.z - landmark.depth / 2,
        maxZ: landmark.z + landmark.depth / 2,
      });
    }
  }

  private addMirrorRoofSign(x: number, y: number, z: number): void {
    if (!this.root) return;

    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, '#ff4fd8');
    gradient.addColorStop(0.5, '#9dfdff');
    gradient.addColorStop(1, '#7f6bff');
    ctx.fillStyle = 'rgba(4, 10, 20, 0.82)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(220, 248, 255, 0.92)';
    ctx.lineWidth = 18;
    ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);
    ctx.shadowColor = '#9efbff';
    ctx.shadowBlur = 18;
    ctx.fillStyle = gradient;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    ctx.font = '900 184px Arial Black, Arial, sans-serif';
    ctx.strokeStyle = 'rgba(5, 10, 18, 0.96)';
    ctx.lineWidth = 26;
    ctx.strokeText(SCENE_COPY.canopyTitle, canvas.width / 2, canvas.height / 2);
    ctx.shadowColor = '#7efaff';
    ctx.shadowBlur = 30;
    ctx.fillText(SCENE_COPY.canopyTitle, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
    texture.needsUpdate = true;
    this.ownedTextures.push(texture);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.96,
      side: THREE.DoubleSide,
    });
    this.buildingMaterials.push(material);

    const geometry = new THREE.PlaneGeometry(18, 4.6);
    this.ownedGeometries.push(geometry);
    const sign = new THREE.Mesh(geometry, material);
    sign.name = 'marseille-mirror-roof-sign';
    sign.rotation.x = -Math.PI / 2;
    sign.rotation.z = -0.03;
    sign.position.set(x, y, z);
    this.root.add(sign);
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
    const quality = this.config.configuration.quality;
    const size = quality === 'high' ? 768 : quality === 'low' ? 256 : 512;
    const geometry = new THREE.PlaneGeometry(16.6, 10.6);
    this.ownedGeometries.push(geometry);
    const reflector = new Reflector(geometry, {
      clipBias: 0.003,
      textureWidth: size,
      textureHeight: Math.round(size * 0.72),
      color: 0x9eb8c8,
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
    const glass = new THREE.MeshPhysicalMaterial({
      color: CYBERPUNK_ART_DIRECTION.buildings.glassColor,
      roughness: 0.12,
      metalness: 0.22,
      transmission: 0.28,
      transparent: true,
      opacity: 0.42,
      thickness: 0.35,
      depthWrite: false,
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

  private createCrosswalk(options: {
    width: number;
    length: number;
    rotationY: number;
    position: THREE.Vector3;
    material: THREE.Material;
    depth: number;
  }): THREE.Object3D {
    const group = new THREE.Group();
    group.name = 'marseille-crosswalk';
    group.position.copy(options.position);
    group.rotation.y = options.rotationY;
    const stripeCount = Math.max(6, Math.round(options.width / 0.9));
    const stripeWidth = options.width / (stripeCount * 1.7);
    const gap = stripeWidth * 0.7;
    const startX = -((stripeCount - 1) * (stripeWidth + gap)) / 2;
    for (let i = 0; i < stripeCount; i++) {
      const geo = new THREE.BoxGeometry(stripeWidth, options.depth, options.length);
      this.ownedGeometries.push(geo);
      const stripe = new THREE.Mesh(geo, options.material);
      stripe.position.set(startX + i * (stripeWidth + gap), options.depth / 2, 0);
      group.add(stripe);
    }
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(options.width * 0.92, 0.12),
      new THREE.MeshBasicMaterial({
        color: 0x40e0ff,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
      })
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = options.depth + 0.01;
    group.add(glow);
    return group;
  }

  private addStreetCross(): void {
    if (!this.root) return;
    const t = CYBERPUNK_ART_DIRECTION.streets.roadThickness;
    const sidewalkH = CYBERPUNK_ART_DIRECTION.streets.sidewalkHeight;
    const curbH = CYBERPUNK_ART_DIRECTION.streets.curbHeight;
    const asphalt = this.createWetAsphaltTexture();
    const streetMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: asphalt,
      roughness: CYBERPUNK_ART_DIRECTION.streets.wetRoughness,
      metalness: CYBERPUNK_ART_DIRECTION.streets.wetMetalness,
      envMapIntensity: 0.7,
    });
    this.buildingMaterials.push(streetMaterial);

    const northSouthGeo = new THREE.BoxGeometry(26, t, 360);
    this.ownedGeometries.push(northSouthGeo);
    const northSouth = new THREE.Mesh(northSouthGeo, streetMaterial);
    northSouth.name = 'marseille-street-north-south';
    northSouth.position.set(0, t / 2, -40);
    this.root.add(northSouth);

    const centerLineMaterial = new THREE.MeshBasicMaterial({
      color: 0xf8d978,
      transparent: true,
      opacity: CYBERPUNK_ART_DIRECTION.streets.centerLineOpacity,
    });
    this.buildingMaterials.push(centerLineMaterial);
    const centerLine = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 270), centerLineMaterial);
    centerLine.name = 'marseille-canebiere-center-line';
    centerLine.rotation.x = -Math.PI / 2;
    centerLine.position.set(0, t + 0.012, -70);
    this.root.add(centerLine);

    const laneGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0x51d7ff,
      transparent: true,
      opacity: CYBERPUNK_ART_DIRECTION.streets.laneGlowOpacity,
    });
    this.buildingMaterials.push(laneGlowMaterial);
    const laneGlow = new THREE.Mesh(new THREE.PlaneGeometry(27.2, 250), laneGlowMaterial);
    laneGlow.name = 'marseille-canebiere-glow';
    laneGlow.rotation.x = -Math.PI / 2;
    laneGlow.position.set(0, t + 0.006, -68);
    this.root.add(laneGlow);

    const sidewalkMaterial = new THREE.MeshStandardMaterial({
      color: 0xbfb7ab,
      roughness: 0.9,
      metalness: 0.02,
    });
    this.buildingMaterials.push(sidewalkMaterial);
    const sidewalkGeo = new THREE.BoxGeometry(8, sidewalkH, 250);
    this.ownedGeometries.push(sidewalkGeo);
    const sidewalkLeft = new THREE.Mesh(sidewalkGeo, sidewalkMaterial);
    sidewalkLeft.name = 'marseille-canebiere-sidewalk-left';
    sidewalkLeft.position.set(-17, sidewalkH / 2, -68);
    this.root.add(sidewalkLeft);
    const sidewalkRight = new THREE.Mesh(sidewalkGeo, sidewalkMaterial);
    sidewalkRight.name = 'marseille-canebiere-sidewalk-right';
    sidewalkRight.position.set(17, sidewalkH / 2, -68);
    this.root.add(sidewalkRight);

    const curbMaterial = new THREE.MeshStandardMaterial({
      color: 0x9aa3ad,
      roughness: 0.55,
      metalness: 0.12,
    });
    this.buildingMaterials.push(curbMaterial);
    const curbGeo = new THREE.BoxGeometry(0.42, curbH, 250);
    this.ownedGeometries.push(curbGeo);
    const curbLeft = new THREE.Mesh(curbGeo, curbMaterial);
    curbLeft.name = 'marseille-canebiere-curb-left';
    curbLeft.position.set(-13.2, curbH / 2, -68);
    this.root.add(curbLeft);
    const curbRight = new THREE.Mesh(curbGeo, curbMaterial);
    curbRight.name = 'marseille-canebiere-curb-right';
    curbRight.position.set(13.2, curbH / 2, -68);
    this.root.add(curbRight);

    const gutterGeo = new THREE.BoxGeometry(0.55, 0.08, 248);
    this.ownedGeometries.push(gutterGeo);
    const gutterMat = new THREE.MeshStandardMaterial({
      color: 0x2a3038,
      roughness: 0.22,
      metalness: 0.45,
    });
    this.buildingMaterials.push(gutterMat);
    const gutterLeft = new THREE.Mesh(gutterGeo, gutterMat);
    gutterLeft.position.set(-12.7, 0.06, -68);
    this.root.add(gutterLeft);
    const gutterRight = new THREE.Mesh(gutterGeo, gutterMat);
    gutterRight.position.set(12.7, 0.06, -68);
    this.root.add(gutterRight);

    const eastWestGeo = new THREE.BoxGeometry(120, t, 18);
    this.ownedGeometries.push(eastWestGeo);
    const eastWest = new THREE.Mesh(eastWestGeo, streetMaterial);
    eastWest.name = 'marseille-street-east-west';
    eastWest.position.set(0, t / 2, 8);
    this.root.add(eastWest);

    const stripeMaterial = new THREE.MeshStandardMaterial({
      color: 0xf2efe6,
      roughness: 0.48,
      metalness: 0.08,
    });
    this.buildingMaterials.push(stripeMaterial);
    const stripeDepth = CYBERPUNK_ART_DIRECTION.streets.crosswalkStripeHeight;
    this.root.add(
      this.createCrosswalk({
        width: 22,
        length: 3.4,
        rotationY: 0,
        position: new THREE.Vector3(0, t, -18),
        material: stripeMaterial,
        depth: stripeDepth,
      })
    );
    this.root.add(
      this.createCrosswalk({
        width: 18,
        length: 3.2,
        rotationY: 0,
        position: new THREE.Vector3(0, t, 8),
        material: stripeMaterial,
        depth: stripeDepth,
      })
    );
    this.addRoadSlogans(t);
  }

  private createWetAsphaltTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      const fallback = new THREE.CanvasTexture(canvas);
      this.ownedTextures.push(fallback);
      return fallback;
    }
    ctx.fillStyle = '#3a3f48';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const a = 0.03 + Math.random() * 0.07;
      ctx.fillStyle = Math.random() > 0.5 ? `rgba(20,22,26,${a})` : `rgba(210,220,230,${a})`;
      ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
    ctx.fillStyle = 'rgba(80, 90, 100, 0.18)';
    for (let y = 24; y < 256; y += 42) {
      ctx.fillRect(0, y, 256, 2);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(8, 28);
    texture.anisotropy = 4;
    this.ownedTextures.push(texture);
    return texture;
  }

  private createValidationCamera(): void {
    const view = VIEUX_PORT_METRO_MIRROR_VIEW;
    const camera = new THREE.PerspectiveCamera(52, 16 / 9, 0.2, 520);
    camera.name = view.id;
    camera.position.set(view.position.x, view.position.y, view.position.z);
    camera.lookAt(view.lookAt.x, view.lookAt.y, view.lookAt.z);
    this.validationCamera = camera;
    if (!this.root || !this.config.configuration.enableDebug) return;
    this.root.add(camera);
    const helper = new THREE.CameraHelper(camera);
    helper.name = 'marseille-validation-camera-helper';
    this.root.add(helper);
    this.addAnchorDebugMarkers();
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
    makeMarker('marseille-debug-sea', 0, HARBOR_WATER_CENTER_Z + 28, 0x2b67ff);
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
    const texture = this.createFacadeTexture({
      baseColor,
      windowColor: style === 'haussmann' ? '#efe4c9' : '#d8f0ff',
      accentColor: style === 'haussmann' ? '#b8895f' : '#7c99b9',
      shutters: style === 'haussmann',
    });
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: texture,
      roughness: 0.82,
      metalness: 0.06,
    });
    this.buildingMaterials.push(material);
    return material;
  }

  private createPrototypeRoofMaterial(): THREE.MeshStandardMaterial {
    const texture = this.createRoofTexture();
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: texture,
      roughness: 0.92,
      metalness: 0.08,
    });
    this.buildingMaterials.push(material);
    return material;
  }

  private createRealisticOsmWallMaterial(seed = 17): THREE.MeshStandardMaterial {
    const texture = this.createFacadeTexture({
      baseColor: 0xcbbda6,
      windowColor: '#d9ebf5',
      accentColor: '#8d6f55',
      shutters: true,
      seed,
    });
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: texture,
      roughness: 0.86,
      metalness: 0.04,
      emissive: new THREE.Color(0x1c2a44),
      emissiveIntensity: CYBERPUNK_ART_DIRECTION.buildings.emissiveIntensity,
    });
    this.buildingMaterials.push(material);
    return material;
  }

  private createRealisticOsmRoofMaterial(): THREE.MeshStandardMaterial {
    const texture = this.createRoofTexture();
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: texture,
      roughness: 0.94,
      metalness: 0.06,
      emissive: new THREE.Color(0x090f18),
      emissiveIntensity: 0.06,
    });
    this.buildingMaterials.push(material);
    return material;
  }

  private createFacadeTexture(options: {
    baseColor: number;
    windowColor: string;
    accentColor: string;
    shutters: boolean;
    seed?: number;
  }): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      const fallback = new THREE.CanvasTexture(canvas);
      this.ownedTextures.push(fallback);
      return fallback;
    }

    ctx.fillStyle = `#${options.baseColor.toString(16).padStart(6, '0')}`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < canvas.height; y += 64) {
      ctx.fillStyle = y % 128 === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
      ctx.fillRect(0, y, canvas.width, 8);
    }

    const seed = options.seed ?? 17;
    const litRatio = CYBERPUNK_ART_DIRECTION.buildings.windowVariation;
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 5; col++) {
        const x = 30 + col * 92;
        const y = 26 + row * 78;
        const lit = this.stableUnit(seed * 97 + row * 13 + col * 19) < litRatio;
        ctx.fillStyle = options.accentColor;
        ctx.fillRect(x - 8, y - 6, 56, 72);
        ctx.fillStyle = lit ? '#fff4c4' : options.windowColor;
        ctx.fillRect(x, y, 40, 56);
        ctx.fillStyle = lit ? 'rgba(255, 236, 170, 0.55)' : 'rgba(0,0,0,0.18)';
        ctx.fillRect(x + 4, y + 4, 32, 22);
        if (options.shutters) {
          ctx.fillStyle = 'rgba(96, 72, 54, 0.55)';
          ctx.fillRect(x - 6, y + 4, 4, 48);
          ctx.fillRect(x + 42, y + 4, 4, 48);
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1.2, 1.2);
    this.ownedTextures.push(texture);
    return texture;
  }

  private createRoofTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      const fallback = new THREE.CanvasTexture(canvas);
      this.ownedTextures.push(fallback);
      return fallback;
    }

    ctx.fillStyle = '#69707a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 2;
    for (let i = 0; i <= canvas.width; i += 24) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let i = 0; i <= canvas.height; i += 24) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1.6, 1.6);
    this.ownedTextures.push(texture);
    return texture;
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

  private addSceneLighting(): void {
    if (!this.root || !this.scene) return;
    const nightEnv = this.createNightEnvironmentMap();
    this.scene.environment = nightEnv;
    this.scene.environmentIntensity = 0.42;
    const moon = new THREE.DirectionalLight(
      CYBERPUNK_ART_DIRECTION.lights.moonColor,
      CYBERPUNK_ART_DIRECTION.lights.moonIntensity
    );
    moon.position.set(-120, 180, 90);
    moon.name = 'marseille-moonlight';
    this.root.add(moon);

    const cyberFill = new THREE.HemisphereLight(
      CYBERPUNK_ART_DIRECTION.lights.hemiSky,
      CYBERPUNK_ART_DIRECTION.lights.hemiGround,
      CYBERPUNK_ART_DIRECTION.lights.hemiIntensity
    );
    cyberFill.name = 'marseille-cyber-fill';
    this.root.add(cyberFill);

    const harborCyan = new THREE.PointLight(
      CYBERPUNK_ART_DIRECTION.lights.harborCyan,
      CYBERPUNK_ART_DIRECTION.lights.harborCyanIntensity,
      120,
      2
    );
    harborCyan.position.set(-22, 9, 22);
    harborCyan.name = 'marseille-harbor-cyan';
    this.root.add(harborCyan);

    const harborMagenta = new THREE.PointLight(
      CYBERPUNK_ART_DIRECTION.lights.harborMagenta,
      CYBERPUNK_ART_DIRECTION.lights.harborMagentaIntensity,
      110,
      2
    );
    harborMagenta.position.set(24, 8, 12);
    harborMagenta.name = 'marseille-harbor-magenta';
    this.root.add(harborMagenta);

    const canebiereDepth = new THREE.PointLight(
      CYBERPUNK_ART_DIRECTION.lights.depthBlue,
      CYBERPUNK_ART_DIRECTION.lights.depthBlueIntensity,
      220,
      2
    );
    canebiereDepth.position.set(0, 16, -150);
    canebiereDepth.name = 'marseille-canebiere-depth';
    this.root.add(canebiereDepth);

    const hazePlane = new THREE.Mesh(
      new THREE.PlaneGeometry(220, 84),
      new THREE.MeshBasicMaterial({
        color: 0x7aa6ff,
        transparent: true,
        opacity: CYBERPUNK_ART_DIRECTION.atmosphere.hazeNearOpacity,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
    hazePlane.name = 'marseille-depth-haze';
    hazePlane.position.set(0, 26, -210);
    this.root.add(hazePlane);

    const hazePlaneFar = new THREE.Mesh(
      new THREE.PlaneGeometry(260, 110),
      new THREE.MeshBasicMaterial({
        color: 0x94b6ff,
        transparent: true,
        opacity: CYBERPUNK_ART_DIRECTION.atmosphere.hazeFarOpacity,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
    hazePlaneFar.name = 'marseille-depth-haze-far';
    hazePlaneFar.position.set(0, 34, -270);
    this.root.add(hazePlaneFar);
  }

  private createNightEnvironmentMap(): THREE.CubeTexture {
    const makeFace = (top: string, bottom: string): HTMLCanvasElement => {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      if (!ctx) return canvas;
      const gradient = ctx.createLinearGradient(0, 0, 0, 64);
      gradient.addColorStop(0, top);
      gradient.addColorStop(1, bottom);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 64, 64);
      return canvas;
    };

    const texture = new THREE.CubeTexture([
      makeFace('#243056', '#3a2148'),
      makeFace('#1c2848', '#2a1838'),
      makeFace('#6f8cff', '#243056'),
      makeFace('#090814', '#090814'),
      makeFace('#2a1848', '#1c2848'),
      makeFace('#143848', '#1c2848'),
    ]);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    this.ownedTextures.push(texture);
    return texture;
  }

  private addSynthwaveFacadeDesigns(visuals: OSMVisualMesh[]): void {
    if (!this.osmRoot || visuals.length === 0) return;
    const ranked = [...visuals].sort((a, b) => a.center.lengthSq() - b.center.lengthSq());
    const keyTargets = ranked.slice(0, 42);
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
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
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
    if (
      x >= CANEBIERE_CORRIDOR.minX &&
      x <= CANEBIERE_CORRIDOR.maxX &&
      z >= CANEBIERE_CORRIDOR.minZ &&
      z <= CANEBIERE_CORRIDOR.maxZ
    ) {
      return true;
    }

    if (Math.abs(x) <= STREET_HALF_WIDTH || Math.abs(z) <= STREET_HALF_WIDTH) {
      return true;
    }

    for (const collider of this.prototypeColliders) {
      const nearestX = THREE.MathUtils.clamp(x, collider.minX, collider.maxX);
      const nearestZ = THREE.MathUtils.clamp(z, collider.minZ, collider.maxZ);
      const dx = x - nearestX;
      const dz = z - nearestZ;
      if (dx * dx + dz * dz < radius * radius) {
        return false;
      }
    }

    return true;
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

  private stableUnit(seed: number): number {
    let x = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b);
    x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
    return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
  }

  private addColliderIfOutsideCanebiere(collider: PrototypeCollider): void {
    const intersectsCanebiere =
      collider.maxX > CANEBIERE_CORRIDOR.minX &&
      collider.minX < CANEBIERE_CORRIDOR.maxX &&
      collider.maxZ > CANEBIERE_CORRIDOR.minZ &&
      collider.minZ < CANEBIERE_CORRIDOR.maxZ;

    if (!intersectsCanebiere) {
      this.prototypeColliders.push(collider);
    }
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
