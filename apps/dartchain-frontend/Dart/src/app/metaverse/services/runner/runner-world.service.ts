import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { RUNNER_CONFIG } from './runner.config';
import {
  createSeededRng,
  disposeObject3D,
  pathFrameAt,
  type PathFrame,
} from './runner-path.math';
import { addCollisionChecks, isPerfDebugEnabled } from '@core/utils/perf-profiler.util';

/** Collider AABB monde (murs latéraux + bâtiments hors voies). */
export interface RunnerCollider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY: number;
  maxY: number;
}

interface BuildingSpec {
  bucket: number;
  sideX: number;
  progress: number;
  w: number;
  h: number;
  d: number;
  hasAccent: boolean;
}

interface LampSpec {
  sideX: number;
  progress: number;
}

interface ActiveSegment {
  index: number;
  startProgress: number;
  group: THREE.Group;
  colliders: RunnerCollider[];
  buildings: BuildingSpec[];
  lamps: LampSpec[];
}

/**
 * Monde endless runner : segments + bâtiments + pooling.
 * Matériaux partagés, collisions proches, pas de rebuild colliders si segment inchangé.
 */
@Injectable({ providedIn: 'root' })
export class RunnerWorldService {
  private root: THREE.Group | null = null;
  private scene: THREE.Scene | null = null;
  private readonly active = new Map<number, ActiveSegment>();
  private readonly pool: THREE.Group[] = [];
  private colliders: RunnerCollider[] = [];
  private rng = createSeededRng(RUNNER_CONFIG.seed);
  private readonly colors = this.particleColors();
  private readonly tmpFrame: PathFrame = pathFrameAt(0, 0);
  private readonly tmpFrameR: PathFrame = pathFrameAt(0, 0);
  private lastSegmentIdx = Number.NaN;
  /** Marge broadphase XZ (rayon perso + marge). */
  private readonly broadphasePad = 6;

  /** Route douce — invert LCD (clair) pour coller au floor. */
  private readonly roadMat = this.sharedMat(
    new THREE.MeshLambertMaterial({
      color: 0xd8d8d8,
      transparent: false,
      opacity: 1,
      side: THREE.DoubleSide,
    })
  );
  private readonly railMat = this.sharedMat(
    new THREE.MeshLambertMaterial({
      color: 0x1a1a1a,
    })
  );
  private readonly roofMat = this.sharedMat(
    new THREE.MeshLambertMaterial({
      color: 0x465d73,
      transparent: false,
      depthWrite: true,
      depthTest: true,
    })
  );
  private readonly accentMat = this.sharedMat(
    new THREE.MeshLambertMaterial({ color: 0x52e6ed })
  );
  private readonly bulbMat = this.sharedMat(
    new THREE.MeshLambertMaterial({
      color: 0xffe6a8,
      emissive: 0xffc878,
      emissiveIntensity: 0.9,
    })
  );
  private readonly wallMats = new Map<number, THREE.MeshLambertMaterial>();
  private readonly rainbowTextures = new Map<number, THREE.CanvasTexture>();
  /** Boîte unitaire partagée — scale par mesh (moins de géométries GPU). */
  private readonly unitBoxGeo = this.sharedGeo(new THREE.BoxGeometry(1, 1, 1));
  private readonly railBoxGeo = this.sharedGeo(
    new THREE.BoxGeometry(0.12, 0.35, RUNNER_CONFIG.segmentLength * 0.92)
  );
  private readonly poleGeo = this.sharedGeo(new THREE.CylinderGeometry(0.04, 0.05, 1.6, 6));
  private readonly bulbGeo = this.sharedGeo(new THREE.SphereGeometry(0.12, 6, 6));
  private readonly accentGeo = this.sharedGeo(
    new THREE.CylinderGeometry(0.06, 0.06, 1.2, 5)
  );

  private horizonGroup: THREE.Group | null = null;
  /** Couche InstancedMesh partagée (bâtiments / lampes) — 1 draw call / bucket. */
  private instanceLayer: THREE.Group | null = null;
  private readonly bodyInstances: THREE.InstancedMesh[] = [];
  private readonly roofInstances: THREE.InstancedMesh[] = [];
  private accentInstances: THREE.InstancedMesh | null = null;
  private lampPoleInstances: THREE.InstancedMesh | null = null;
  private lampBulbInstances: THREE.InstancedMesh | null = null;
  private readonly instanceDummy = new THREE.Object3D();
  private static readonly MAX_PER_BUCKET = 32;
  private static readonly MAX_ACCENT = 48;
  private static readonly MAX_LAMP = 48;

  /** Monte le monde runner (remplace l’ancienne ville fixe). */
  start(scene: THREE.Scene): void {
    this.dispose(scene);
    this.scene = scene;
    this.rng = createSeededRng(RUNNER_CONFIG.seed);
    this.root = new THREE.Group();
    this.root.name = 'runner-world';
    scene.add(this.root);

    this.createHorizonWallAndLadder();
    this.createInstanceLayer();

    for (let i = -RUNNER_CONFIG.segmentsBehind; i <= RUNNER_CONFIG.segmentsAhead; i++) {
      this.spawnSegment(i);
    }
    this.rebuildColliderCache();
    this.syncBuildingInstances();
    this.lastSegmentIdx = 0;
  }

  /**
   * À chaque frame : crée / recycle segments selon la progression joueur.
   */
  update(playerProgress: number): void {
    if (!this.root) return;
    const len = RUNNER_CONFIG.segmentLength;
    const currentIdx = Math.floor(playerProgress / len);
    if (currentIdx === this.lastSegmentIdx) return;
    this.lastSegmentIdx = currentIdx;

    const minIdx = currentIdx - RUNNER_CONFIG.segmentsBehind;
    const maxIdx = currentIdx + RUNNER_CONFIG.segmentsAhead;

    let changed = false;
    for (const [idx, seg] of [...this.active.entries()]) {
      if (idx < minIdx || idx > maxIdx) {
        this.recycleSegment(seg);
        this.active.delete(idx);
        changed = true;
      }
    }
    for (let i = minIdx; i <= maxIdx; i++) {
      if (!this.active.has(i)) {
        this.spawnSegment(i);
        changed = true;
      }
    }
    if (changed) {
      this.rebuildColliderCache();
      this.syncBuildingInstances();
    }
  }

  getWallColliders(): readonly RunnerCollider[] {
    return this.colliders;
  }

  /**
   * Collision cercle XZ vs AABB — broadphase : bâtiments proches uniquement.
   */
  isWalkable(x: number, z: number, radius: number): boolean {
    const pad = radius + this.broadphasePad;
    let checks = 0;
    for (const c of this.colliders) {
      if (x + pad < c.minX || x - pad > c.maxX) continue;
      if (z + pad < c.minZ || z - pad > c.maxZ) continue;
      checks++;
      const nx = THREE.MathUtils.clamp(x, c.minX, c.maxX);
      const nz = THREE.MathUtils.clamp(z, c.minZ, c.maxZ);
      const dx = x - nx;
      const dz = z - nz;
      if (dx * dx + dz * dz < radius * radius) {
        if (isPerfDebugEnabled()) addCollisionChecks(checks);
        return false;
      }
    }
    if (isPerfDebugEnabled()) addCollisionChecks(checks);
    return true;
  }

  dispose(scene?: THREE.Scene): void {
    for (const seg of this.active.values()) {
      this.recycleSegment(seg, false);
    }
    this.active.clear();
    while (this.pool.length) {
      const g = this.pool.pop()!;
      disposeObject3D(g);
    }
    this.disposeInstanceLayer();
    if (this.horizonGroup) {
      this.root?.remove(this.horizonGroup);
      disposeObject3D(this.horizonGroup);
      this.horizonGroup = null;
    }
    if (this.root) {
      (scene ?? this.scene)?.remove(this.root);
      disposeObject3D(this.root);
      this.root = null;
    }
    this.colliders = [];
    this.scene = null;
    this.lastSegmentIdx = Number.NaN;
    // Matériaux / géométries partagés : conservés (service root singleton)
  }

  private createInstanceLayer(): void {
    if (!this.root) return;
    const layer = new THREE.Group();
    layer.name = 'runner-building-instances';
    this.bodyInstances.length = 0;
    this.roofInstances.length = 0;

    for (let b = 0; b < 12; b++) {
      const body = new THREE.InstancedMesh(
        this.unitBoxGeo,
        this.rainbowWallMat(b),
        RunnerWorldService.MAX_PER_BUCKET
      );
      body.name = `runner-body-${b}`;
      body.count = 0;
      body.frustumCulled = true;
      body.castShadow = false;
      body.receiveShadow = false;
      layer.add(body);
      this.bodyInstances.push(body);

      const roof = new THREE.InstancedMesh(
        this.unitBoxGeo,
        this.rainbowRoofMat(b),
        RunnerWorldService.MAX_PER_BUCKET
      );
      roof.name = `runner-roof-${b}`;
      roof.count = 0;
      roof.frustumCulled = true;
      roof.castShadow = false;
      roof.receiveShadow = false;
      layer.add(roof);
      this.roofInstances.push(roof);
    }

    this.accentInstances = new THREE.InstancedMesh(
      this.accentGeo,
      this.accentMat,
      RunnerWorldService.MAX_ACCENT
    );
    this.accentInstances.name = 'runner-accents';
    this.accentInstances.count = 0;
    this.accentInstances.frustumCulled = true;
    layer.add(this.accentInstances);

    this.lampPoleInstances = new THREE.InstancedMesh(
      this.poleGeo,
      this.railMat,
      RunnerWorldService.MAX_LAMP
    );
    this.lampPoleInstances.name = 'runner-lamp-poles';
    this.lampPoleInstances.count = 0;
    this.lampPoleInstances.frustumCulled = true;
    layer.add(this.lampPoleInstances);

    this.lampBulbInstances = new THREE.InstancedMesh(
      this.bulbGeo,
      this.bulbMat,
      RunnerWorldService.MAX_LAMP
    );
    this.lampBulbInstances.name = 'runner-lamp-bulbs';
    this.lampBulbInstances.count = 0;
    this.lampBulbInstances.frustumCulled = true;
    layer.add(this.lampBulbInstances);

    this.root.add(layer);
    this.instanceLayer = layer;
  }

  private disposeInstanceLayer(): void {
    if (!this.instanceLayer) return;
    this.root?.remove(this.instanceLayer);
    // Géos/mats partagés : ne pas dispose — juste retirer du graphe
    this.instanceLayer.clear();
    this.instanceLayer = null;
    this.bodyInstances.length = 0;
    this.roofInstances.length = 0;
    this.accentInstances = null;
    this.lampPoleInstances = null;
    this.lampBulbInstances = null;
  }

  /** Reconstruit les matrices InstancedMesh depuis les specs des segments actifs. */
  private syncBuildingInstances(): void {
    if (!this.instanceLayer) return;
    const bodyCounts = new Array(12).fill(0) as number[];
    const roofCounts = new Array(12).fill(0) as number[];
    let accentCount = 0;
    let lampCount = 0;
    const dummy = this.instanceDummy;

    for (const seg of this.active.values()) {
      for (const b of seg.buildings) {
        const bucket = ((b.bucket % 12) + 12) % 12;
        const bi = bodyCounts[bucket];
        if (bi < RunnerWorldService.MAX_PER_BUCKET) {
          dummy.position.set(b.sideX, 0.02 + b.h * 0.5, -b.progress);
          dummy.quaternion.identity();
          dummy.scale.set(b.w, b.h, b.d);
          dummy.updateMatrix();
          this.bodyInstances[bucket].setMatrixAt(bi, dummy.matrix);
          bodyCounts[bucket] = bi + 1;
        }
        const ri = roofCounts[bucket];
        if (ri < RunnerWorldService.MAX_PER_BUCKET) {
          dummy.position.set(b.sideX, 0.02 + b.h + 0.09, -b.progress);
          dummy.quaternion.identity();
          dummy.scale.set(b.w * 1.02, 0.18, b.d * 1.02);
          dummy.updateMatrix();
          this.roofInstances[bucket].setMatrixAt(ri, dummy.matrix);
          roofCounts[bucket] = ri + 1;
        }
        if (b.hasAccent && this.accentInstances && accentCount < RunnerWorldService.MAX_ACCENT) {
          dummy.position.set(b.sideX, 0.02 + b.h + 0.85, -b.progress);
          dummy.quaternion.identity();
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          this.accentInstances.setMatrixAt(accentCount, dummy.matrix);
          accentCount++;
        }
      }
      for (const lamp of seg.lamps) {
        if (
          !this.lampPoleInstances ||
          !this.lampBulbInstances ||
          lampCount >= RunnerWorldService.MAX_LAMP
        ) {
          break;
        }
        dummy.position.set(lamp.sideX, 0.02 + 0.8, -lamp.progress);
        dummy.quaternion.identity();
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        this.lampPoleInstances.setMatrixAt(lampCount, dummy.matrix);

        dummy.position.set(lamp.sideX, 0.02 + 1.65, -lamp.progress);
        dummy.updateMatrix();
        this.lampBulbInstances.setMatrixAt(lampCount, dummy.matrix);
        lampCount++;
      }
    }

    for (let i = 0; i < 12; i++) {
      this.bodyInstances[i].count = bodyCounts[i];
      this.bodyInstances[i].instanceMatrix.needsUpdate = true;
      this.roofInstances[i].count = roofCounts[i];
      this.roofInstances[i].instanceMatrix.needsUpdate = true;
    }
    if (this.accentInstances) {
      this.accentInstances.count = accentCount;
      this.accentInstances.instanceMatrix.needsUpdate = true;
    }
    if (this.lampPoleInstances && this.lampBulbInstances) {
      this.lampPoleInstances.count = lampCount;
      this.lampPoleInstances.instanceMatrix.needsUpdate = true;
      this.lampBulbInstances.count = lampCount;
      this.lampBulbInstances.instanceMatrix.needsUpdate = true;
    }
  }

  private sharedMat<T extends THREE.Material>(mat: T): T {
    mat.userData['shared'] = true;
    return mat;
  }

  private sharedGeo<T extends THREE.BufferGeometry>(geo: T): T {
    geo.userData['shared'] = true;
    return geo;
  }

  private wallMatFor(color: number): THREE.MeshLambertMaterial {
    // Legacy — redirige vers arc-en-ciel
    return this.rainbowWallMat(Math.abs(color) % 12);
  }

  /**
   * Matériau mur : dégradé arc-en-ciel flash (12 variantes hue, textures partagées).
   */
  private rainbowWallMat(bucket: number): THREE.MeshLambertMaterial {
    const key = ((bucket % 12) + 12) % 12;
    let mat = this.wallMats.get(key);
    if (!mat) {
      const map = this.rainbowTexture(key);
      mat = this.sharedMat(
        new THREE.MeshLambertMaterial({
          map,
          color: 0xffffff,
          emissive: new THREE.Color().setHSL(key / 12, 1, 0.22),
          emissiveMap: map,
          emissiveIntensity: 0.55,
          transparent: false,
          opacity: 1,
          depthWrite: true,
          depthTest: true,
          side: THREE.FrontSide,
        })
      );
      this.wallMats.set(key, mat);
    }
    return mat;
  }

  private rainbowRoofMat(bucket: number): THREE.MeshLambertMaterial {
    // Toit : même famille rainbow, teinte décalée
    return this.rainbowWallMat((bucket + 4) % 12);
  }

  private rainbowTexture(bucket: number): THREE.CanvasTexture {
    let tex = this.rainbowTextures.get(bucket);
    if (tex) return tex;

    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const hue0 = bucket * 30;

    // Dégradé diagonal flash (arc-en-ciel saturé)
    const g = ctx.createLinearGradient(0, 0, size, size);
    const stops = 10;
    for (let i = 0; i <= stops; i++) {
      const t = i / stops;
      const h = (hue0 + t * 360) % 360;
      g.addColorStop(t, `hsl(${h}, 100%, ${48 + Math.sin(t * Math.PI) * 12}%)`);
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);

    // Bandes horizontales néon pour effet « flash »
    const gFlash = ctx.createLinearGradient(0, 0, 0, size);
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      const h = (hue0 + 60 + t * 300) % 360;
      gFlash.addColorStop(
        t,
        `hsla(${h}, 100%, 65%, ${i % 2 === 0 ? 0.55 : 0.15})`
      );
    }
    ctx.fillStyle = gFlash;
    ctx.fillRect(0, 0, size, size);

    // Spec highlight
    const shine = ctx.createLinearGradient(0, 0, size, 0);
    shine.addColorStop(0, 'rgba(255,255,255,0)');
    shine.addColorStop(0.45, 'rgba(255,255,255,0.45)');
    shine.addColorStop(0.55, 'rgba(255,255,255,0.15)');
    shine.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = shine;
    ctx.fillRect(0, 0, size, size);

    tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    tex.anisotropy = 1;
    tex.userData['shared'] = true;
    this.rainbowTextures.set(bucket, tex);
    return tex;
  }

  /**
   * Mur + échelle à Z = ladderZ — Lambert + géométries fusionnées (même look, moins de draw calls).
   */
  private createHorizonWallAndLadder(): void {
    if (!this.root) return;

    const ladderZ = RUNNER_CONFIG.ladderZ;
    const group = new THREE.Group();
    group.name = 'horizon-wall-ladder';
    group.position.set(0, 0, ladderZ);

    const wallMat = this.sharedMat(
      new THREE.MeshLambertMaterial({
        color: 0x1a2840,
        emissive: 0x001133,
        emissiveIntensity: 0.35,
        side: THREE.DoubleSide,
      })
    );
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(22, 16, 1, 1), wallMat);
    wall.position.set(0, 8, 0);
    wall.receiveShadow = false;
    wall.castShadow = false;
    group.add(wall);

    const skirtingMat = this.sharedMat(
      new THREE.MeshLambertMaterial({
        color: 0x00ffff,
        emissive: 0x0088ff,
        emissiveIntensity: 0.6,
      })
    );
    const skirting = new THREE.Mesh(new THREE.BoxGeometry(22, 0.35, 0.4), skirtingMat);
    skirting.position.set(0, 0.2, 0.15);
    group.add(skirting);

    const metal = this.sharedMat(
      new THREE.MeshLambertMaterial({
        color: 0x00ffff,
        emissive: 0x0088ff,
        emissiveIntensity: 0.55,
      })
    );

    // Poteaux + barreaux → InstancedMesh (1 draw call, même rendu)
    const rungCount = 11;
    const ladderParts = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.95, 6),
      metal,
      rungCount + 2
    );
    ladderParts.name = 'ladder-instanced';
    ladderParts.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    ladderParts.frustumCulled = true;
    const dummy = new THREE.Object3D();

    // Poteaux (cylindre vertical — scale Y pour hauteur 12 / geo 0.95)
    const poleScaleY = 12 / 0.95;
    const poleRadiusScale = 0.07 / 0.05;
    dummy.position.set(-0.45, 6.2, 0.12);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(poleRadiusScale, poleScaleY, poleRadiusScale);
    dummy.updateMatrix();
    ladderParts.setMatrixAt(0, dummy.matrix);

    dummy.position.set(0.45, 6.2, 0.12);
    dummy.updateMatrix();
    ladderParts.setMatrixAt(1, dummy.matrix);

    for (let i = 0; i < rungCount; i++) {
      dummy.position.set(0, 1.2 + i * 1.05, 0.12);
      dummy.rotation.set(0, 0, Math.PI / 2);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      ladderParts.setMatrixAt(2 + i, dummy.matrix);
    }
    ladderParts.instanceMatrix.needsUpdate = true;
    group.add(ladderParts);

    this.root.add(group);
    this.horizonGroup = group;

    const stopMarker = new THREE.Mesh(
      new THREE.RingGeometry(0.8, 1.0, 16),
      new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    stopMarker.name = 'ladder-stop-marker';
    stopMarker.rotation.x = -Math.PI / 2;
    stopMarker.position.set(0, 0.05, RUNNER_CONFIG.ladderStopZ);
    stopMarker.frustumCulled = true;
    this.root.add(stopMarker);
  }

  private spawnSegment(index: number): void {
    if (!this.root) return;
    const start = index * RUNNER_CONFIG.segmentLength;
    const group = this.pool.pop() ?? new THREE.Group();
    group.clear();
    group.name = `runner-seg-${index}`;

    const colliders: RunnerCollider[] = [];
    const buildings: BuildingSpec[] = [];
    const lamps: LampSpec[] = [];
    this.buildRoad(group, start, colliders);
    this.buildSideBuildings(group, start, index, colliders, buildings, lamps);

    this.root.add(group);
    this.active.set(index, { index, startProgress: start, group, colliders, buildings, lamps });
  }

  private recycleSegment(seg: ActiveSegment, keepPool = true): void {
    this.root?.remove(seg.group);
    while (seg.group.children.length) {
      const child = seg.group.children[0];
      seg.group.remove(child);
      disposeObject3D(child);
    }
    if (keepPool && this.pool.length < 12) {
      this.pool.push(seg.group);
    } else {
      disposeObject3D(seg.group);
    }
  }

  private rebuildColliderCache(): void {
    this.colliders = [];
    for (const seg of this.active.values()) {
      this.colliders.push(...seg.colliders);
    }
  }

  /** Bande de route courbée (échantillonnée le long de l’arc). */
  private buildRoad(
    group: THREE.Group,
    start: number,
    _colliders: RunnerCollider[]
  ): void {
    const len = RUNNER_CONFIG.segmentLength;
    const halfW = (RUNNER_CONFIG.laneWidth * 3) / 2 + 0.15;
    const steps = 8;
    const positions: number[] = [];
    const normals: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const p = start + t * len;
      pathFrameAt(p, -halfW, this.tmpFrame);
      const Lx = this.tmpFrame.position.x;
      const Ly = this.tmpFrame.position.y;
      const Lz = this.tmpFrame.position.z;
      const Nx = this.tmpFrame.up.x;
      const Ny = this.tmpFrame.up.y;
      const Nz = this.tmpFrame.up.z;
      pathFrameAt(p, halfW, this.tmpFrameR);
      positions.push(Lx, Ly, Lz, this.tmpFrameR.position.x, this.tmpFrameR.position.y, this.tmpFrameR.position.z);
      normals.push(Nx, Ny, Nz, Nx, Ny, Nz);
      if (i > 0) {
        const a = (i - 1) * 2;
        const b = a + 1;
        const c = i * 2;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setIndex(indices);
    const road = new THREE.Mesh(geo, this.roadMat);
    road.name = 'runner-road';
    group.add(road);

    const railOffset = halfW + 0.25;
    this.addRail(group, start, len, -railOffset);
    this.addRail(group, start, len, railOffset);
  }

  private addRail(
    group: THREE.Group,
    start: number,
    len: number,
    sideX: number
  ): void {
    pathFrameAt(start + len * 0.5, sideX, this.tmpFrame);
    const mid = this.tmpFrame;
    const rail = new THREE.Mesh(this.railBoxGeo, this.railMat);
    rail.position.copy(mid.position).addScaledVector(mid.up, 0.18);
    rail.quaternion.copy(mid.quaternion);
    rail.frustumCulled = true;
    group.add(rail);
  }

  private buildSideBuildings(
    _group: THREE.Group,
    start: number,
    index: number,
    colliders: RunnerCollider[],
    buildings: BuildingSpec[],
    lamps: LampSpec[]
  ): void {
    const localRng = createSeededRng(RUNNER_CONFIG.seed + index * 9973);
    const pattern = index % 5;
    const color = this.colors[Math.abs(index) % this.colors.length];
    const midP = start + RUNNER_CONFIG.segmentLength * 0.5;
    const side = RUNNER_CONFIG.buildingSideGap + RUNNER_CONFIG.laneWidth;

    let placeLeft =
      (pattern === 2 || pattern === 0 || pattern === 3 || pattern === 4) &&
      localRng() < RUNNER_CONFIG.buildingChance;
    let placeRight =
      (pattern === 1 || pattern === 0 || pattern === 3 || pattern === 4) &&
      localRng() < RUNNER_CONFIG.buildingChance;

    if (!placeLeft && !placeRight) {
      placeLeft = pattern % 2 === 0;
      placeRight = !placeLeft;
    }

    if (placeLeft) {
      this.placeBuilding(midP, -side, color, index, colliders, buildings, localRng);
    }
    if (placeRight) {
      this.placeBuilding(midP, side, color, index + 1, colliders, buildings, localRng);
    }

    if (localRng() > 0.55) {
      this.placeLamp(
        start + lenFrac(localRng) * RUNNER_CONFIG.segmentLength,
        -side * 0.72,
        lamps
      );
    }
    if (localRng() > 0.55) {
      this.placeLamp(
        start + lenFrac(localRng) * RUNNER_CONFIG.segmentLength,
        side * 0.72,
        lamps
      );
    }
  }

  private placeBuilding(
    progress: number,
    sideX: number,
    _color: number,
    variant: number,
    colliders: RunnerCollider[],
    buildings: BuildingSpec[],
    rng: () => number
  ): void {
    const w = 2.8 + rng() * 2.4;
    const d = 2.4 + rng() * 2.0;
    const h = 16 + rng() * 20; // ×2 vs 8–18

    // Chaque bâtiment : variante arc-en-ciel (hue shift déterministe)
    const rainbowBucket = Math.abs(variant * 3 + Math.floor(rng() * 12)) % 12;

    buildings.push({
      bucket: rainbowBucket,
      sideX,
      progress,
      w,
      h,
      d,
      hasAccent: variant % 3 === 0,
    });

    // Collider AABB précalculé (pas de setFromObject chaque frame)
    const halfW = w * 0.5;
    const halfD = d * 0.5;
    colliders.push({
      minX: sideX - halfW,
      maxX: sideX + halfW,
      minZ: -progress - halfD,
      maxZ: -progress + halfD,
      minY: 0.02,
      maxY: 0.02 + h + 0.18,
    });
  }

  private placeLamp(progress: number, sideX: number, lamps: LampSpec[]): void {
    lamps.push({ sideX, progress });
  }

  private particleColors(): number[] {
    return [0x1a2840, 0x2a1a40, 0x122038, 0x241838];
  }
}

function lenFrac(rng: () => number): number {
  return 0.15 + rng() * 0.7;
}
