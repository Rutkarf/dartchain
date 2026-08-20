import { Injectable, NgZone, inject } from '@angular/core';
import * as THREE from 'three';

import { ThreeSceneService } from '../../services/three-scene.service';
import { isPlacementVisible } from './placement-rules';
import {
  PLACEMENTS_LAYER_CONFIG,
  PLACEMENT_STATUS_COLOR,
} from './placement-layer.config';
import { PlacementFacade } from './placement.facade';
import type { PlacementCatalog } from './placement.mapper';
import { isClickNotDrag, placementIdFromIntersections } from './placement-pick.util';

/**
 * Hit-volumes RDC distincts du décor OSM / storefronts hardcodés.
 * Clic sans drag → sélection. OrbitControls conserve les drags.
 */
@Injectable({ providedIn: 'root' })
export class PlacementAnchorLayer {
  private readonly facade = inject(PlacementFacade);
  private readonly threeScene = inject(ThreeSceneService);
  private readonly zone = inject(NgZone);

  private root: THREE.Group | null = null;
  private scene: THREE.Scene | null = null;
  private readonly ownedGeometries: THREE.BufferGeometry[] = [];
  private readonly ownedMaterials: THREE.Material[] = [];
  private readonly ndc = new THREE.Vector2();
  private readonly raycaster = new THREE.Raycaster();
  private pointerDown: { x: number; y: number } | null = null;
  private canvas: HTMLCanvasElement | null = null;

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    this.pointerDown = { x: event.clientX, y: event.clientY };
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    const start = this.pointerDown;
    this.pointerDown = null;
    if (!start || !isClickNotDrag(start, { x: event.clientX, y: event.clientY })) {
      return;
    }
    const id = this.pickPlacementId(event);
    this.zone.run(() => this.facade.select(id));
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') return;
    if (!this.facade.selectedPlacementId()) return;
    this.zone.run(() => this.facade.select(null));
  };

  async attach(scene: THREE.Scene): Promise<void> {
    if (!PLACEMENTS_LAYER_CONFIG.enabled || this.root) return;
    this.scene = scene;
    this.root = new THREE.Group();
    this.root.name = 'metaverse-placement-layer';
    scene.add(this.root);
    this.bindCanvas();
    const result = await this.facade.load();
    if (result.catalog) this.rebuild(result.catalog);
  }

  update(): void {
    const selectedId = this.facade.selectedPlacementId();
    if (!this.root) return;
    for (const child of this.root.children) {
      const mesh = child as THREE.Mesh;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      if (!mat?.isMaterial) continue;
      const selected = mesh.userData['placementId'] === selectedId;
      mat.opacity = selected ? 0.55 : 0.22;
      mesh.scale.setScalar(selected ? 1.08 : 1);
      mesh.renderOrder = selected ? 2 : 1;
    }
  }

  dispose(): void {
    this.unbindCanvas();
    if (this.root && this.scene) this.scene.remove(this.root);
    for (const geometry of this.ownedGeometries) geometry.dispose();
    for (const material of this.ownedMaterials) material.dispose();
    this.ownedGeometries.length = 0;
    this.ownedMaterials.length = 0;
    this.root = null;
    this.scene = null;
    this.pointerDown = null;
  }

  private rebuild(catalog: PlacementCatalog): void {
    if (!this.root) return;
    this.root.clear();
    for (const geometry of this.ownedGeometries) geometry.dispose();
    for (const material of this.ownedMaterials) material.dispose();
    this.ownedGeometries.length = 0;
    this.ownedMaterials.length = 0;

    const buildingById = new Map(catalog.buildings.map((item) => [item.id, item]));
    for (const placement of catalog.placements) {
      const building = buildingById.get(placement.buildingId);
      if (!building || !isPlacementVisible(building, placement)) continue;

      const geometry = new THREE.BoxGeometry(
        PLACEMENTS_LAYER_CONFIG.hitWidth,
        PLACEMENTS_LAYER_CONFIG.hitHeight,
        PLACEMENTS_LAYER_CONFIG.hitDepth
      );
      this.ownedGeometries.push(geometry);
      const color = PLACEMENT_STATUS_COLOR[placement.status] ?? 0x8f9bb3;
      const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      });
      this.ownedMaterials.push(material);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = `placement-hit-${placement.id}`;
      mesh.userData['placementId'] = placement.id;
      mesh.position.set(
        placement.anchorWorld.x,
        placement.anchorWorld.y + PLACEMENTS_LAYER_CONFIG.hitHeight * 0.35,
        placement.anchorWorld.z
      );
      if (placement.facing) mesh.rotation.y = placement.facing.facingRad;
      this.root.add(mesh);
    }
  }

  private bindCanvas(): void {
    const canvas = this.threeScene.getRenderer()?.domElement ?? null;
    this.canvas = canvas;
    if (!canvas) return;
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('keydown', this.onKeyDown);
  }

  private unbindCanvas(): void {
    this.canvas?.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas?.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('keydown', this.onKeyDown);
    this.canvas = null;
  }

  private pickPlacementId(event: PointerEvent): string | null {
    const camera = this.threeScene.getCamera();
    const canvas = this.canvas;
    if (!camera || !canvas || !this.root) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    this.ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.ndc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.ndc, camera);
    const hits = this.raycaster.intersectObject(this.root, true);
    return placementIdFromIntersections(hits);
  }
}
