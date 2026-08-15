import { Injectable } from '@angular/core';
import * as THREE from 'three';
import {
  STAR_QUEST_FAMILIES,
  STAR_QUEST_FAMILY_ORDER,
} from '../../particle-background/star-conquest/star-conquest-families';

export const FLOOR_Y = -0.5;

/** AABB XZ monde pour collision murs (portes = pas de box). */
export interface CityWallCollider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

interface BuildingDims {
  width: number;
  depth: number;
  height: number;
  doorWidth: number;
  doorHeight: number;
  wallT: number;
}

/**
 * Ville entrable ×2 vs itération précédente.
 * Colliders murs enregistrés — ouvertures de porte libres.
 */
@Injectable({ providedIn: 'root' })
export class CitySceneService {
  private cityGroup: THREE.Group | null = null;
  private lights: THREE.PointLight[] = [];
  private colliders: CityWallCollider[] = [];

  createCity(scene: THREE.Scene, particleColors: number[]): THREE.Group {
    this.dispose(scene);

    const colors =
      particleColors.length >= 5
        ? particleColors.slice(0, 5)
        : this.defaultParticleColors();

    const group = new THREE.Group();
    group.name = 'starconquest-city';
    this.colliders = [];

    colors.forEach((color, index) => {
      const building = this.createEnterableBuilding(color, index);
      group.add(building);

      const light = new THREE.PointLight(color, 0.75, 22, 2);
      light.position.copy(building.position);
      light.position.y = FLOOR_Y + 3.5;
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(building.quaternion);
      light.position.addScaledVector(forward, 1.2);
      group.add(light);
      this.lights.push(light);
    });

    scene.add(group);
    this.cityGroup = group;
    return group;
  }

  defaultParticleColors(): number[] {
    return STAR_QUEST_FAMILY_ORDER.map((id) => {
      const hex = STAR_QUEST_FAMILIES[id].hex.replace('#', '');
      return Number.parseInt(hex, 16);
    });
  }

  getCityGroup(): THREE.Group | null {
    return this.cityGroup;
  }

  getWallColliders(): readonly CityWallCollider[] {
    return this.colliders;
  }

  /**
   * Collision cercle (perso) vs AABB XZ des murs.
   * @returns true si la position est libre
   */
  isWalkable(x: number, z: number, radius: number): boolean {
    for (const c of this.colliders) {
      const nearestX = THREE.MathUtils.clamp(x, c.minX, c.maxX);
      const nearestZ = THREE.MathUtils.clamp(z, c.minZ, c.maxZ);
      const dx = x - nearestX;
      const dz = z - nearestZ;
      if (dx * dx + dz * dz < radius * radius) {
        return false;
      }
    }
    return true;
  }

  dispose(scene?: THREE.Scene): void {
    if (this.cityGroup) {
      scene?.remove(this.cityGroup);
      this.cityGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          const mat = child.material;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else mat?.dispose();
        }
        if (child instanceof THREE.Light) {
          child.dispose?.();
        }
      });
      this.cityGroup = null;
    }
    this.lights = [];
    this.colliders = [];
  }

  private createEnterableBuilding(color: number, index: number): THREE.Group {
    const root = new THREE.Group();
    root.name = `city-building-${index}`;

    const dims = this.dimsForIndex(index);
    const { width: w, depth: d, height: h, doorWidth, doorHeight, wallT } = dims;

    const wallMat = new THREE.MeshPhysicalMaterial({
      color,
      metalness: 0.12,
      roughness: 0.14,
      transmission: 0.55,
      transparent: true,
      opacity: 0.78,
      thickness: 0.45,
      emissive: new THREE.Color(color),
      emissiveIntensity: 0.2,
      side: THREE.DoubleSide,
    });

    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x1a222c,
      metalness: 0.25,
      roughness: 0.75,
      emissive: color,
      emissiveIntensity: 0.06,
    });

    const accentMat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.7,
      metalness: 0.45,
      roughness: 0.28,
    });

    const floor = new THREE.Mesh(new THREE.BoxGeometry(w - wallT, 0.08, d - wallT), floorMat);
    floor.position.set(0, FLOOR_Y + 0.04, 0);
    root.add(floor);

    const ceiling = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, d), wallMat);
    ceiling.position.set(0, FLOOR_Y + h, 0);
    root.add(ceiling);

    // Murs + colliders locaux (transformés en monde après placement)
    const localBoxes: Array<{ x: number; z: number; hw: number; hd: number }> = [];

    const addWall = (
      ww: number,
      wh: number,
      wd: number,
      x: number,
      y: number,
      z: number,
      solid: boolean
    ): void => {
      root.add(this.wall(wallMat, ww, wh, wd, x, y, z));
      if (solid) {
        localBoxes.push({ x, z, hw: ww / 2, hd: wd / 2 });
      }
    };

    addWall(w, h, wallT, 0, FLOOR_Y + h / 2, -d / 2 + wallT / 2, true);
    addWall(wallT, h, d, -w / 2 + wallT / 2, FLOOR_Y + h / 2, 0, true);
    addWall(wallT, h, d, w / 2 - wallT / 2, FLOOR_Y + h / 2, 0, true);

    const sideW = (w - doorWidth) / 2;
    const lintelH = Math.max(0.25, h - doorHeight);
    const zFront = d / 2 - wallT / 2;

    addWall(sideW, h, wallT, -doorWidth / 2 - sideW / 2, FLOOR_Y + h / 2, zFront, true);
    addWall(sideW, h, wallT, doorWidth / 2 + sideW / 2, FLOOR_Y + h / 2, zFront, true);
    // Linteau : pas de collider pieds (au-dessus de la tête)
    addWall(doorWidth, lintelH, wallT, 0, FLOOR_Y + doorHeight + lintelH / 2, zFront, false);

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(doorWidth + 0.2, 0.1, 0.1),
      accentMat
    );
    frame.position.set(0, FLOOR_Y + doorHeight + 0.03, zFront + wallT * 0.35);
    root.add(frame);

    this.addRoofAccent(root, index, accentMat, w, d, h);

    const t = index / 4;
    const angle = -Math.PI / 3 + t * ((2 * Math.PI) / 3);
    const radius = 16; // arc élargi pour bâtiments ×2
    root.position.set(
      Math.sin(angle) * radius,
      0,
      -Math.cos(angle) * radius - 1.5
    );
    root.rotation.y = angle + Math.PI;
    root.updateMatrixWorld(true);

    // Colliders monde depuis boîtes locales
    for (const b of localBoxes) {
      const corners = [
        new THREE.Vector3(b.x - b.hw, 0, b.z - b.hd),
        new THREE.Vector3(b.x + b.hw, 0, b.z - b.hd),
        new THREE.Vector3(b.x - b.hw, 0, b.z + b.hd),
        new THREE.Vector3(b.x + b.hw, 0, b.z + b.hd),
      ];
      let minX = Infinity;
      let maxX = -Infinity;
      let minZ = Infinity;
      let maxZ = -Infinity;
      for (const c of corners) {
        root.localToWorld(c);
        minX = Math.min(minX, c.x);
        maxX = Math.max(maxX, c.x);
        minZ = Math.min(minZ, c.z);
        maxZ = Math.max(maxZ, c.z);
      }
      this.colliders.push({ minX, maxX, minZ, maxZ });
    }

    return root;
  }

  /** Dimensions doublées (personnage demi-échelle → portes encore larges). */
  private dimsForIndex(index: number): BuildingDims {
    const variants: BuildingDims[] = [
      { width: 8.4, depth: 8.0, height: 11.0, doorWidth: 2.8, doorHeight: 3.2, wallT: 0.28 },
      { width: 11.0, depth: 9.0, height: 6.8, doorWidth: 3.2, doorHeight: 3.0, wallT: 0.32 },
      { width: 7.2, depth: 7.2, height: 9.6, doorWidth: 2.7, doorHeight: 3.1, wallT: 0.26 },
      { width: 9.6, depth: 10.4, height: 8.4, doorWidth: 3.0, doorHeight: 3.2, wallT: 0.28 },
      { width: 10.0, depth: 7.6, height: 12.0, doorWidth: 3.1, doorHeight: 3.3, wallT: 0.32 },
    ];
    return variants[index % variants.length];
  }

  private wall(
    material: THREE.Material,
    width: number,
    height: number,
    depth: number,
    x: number,
    y: number,
    z: number
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    return mesh;
  }

  private addRoofAccent(
    root: THREE.Group,
    index: number,
    accent: THREE.Material,
    w: number,
    d: number,
    h: number
  ): void {
    switch (index % 5) {
      case 0: {
        const cap = new THREE.Mesh(new THREE.ConeGeometry(w * 0.22, 1.2, 4), accent);
        cap.position.set(0, FLOOR_Y + h + 0.7, 0);
        root.add(cap);
        break;
      }
      case 1: {
        const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.2, d + 0.5), accent);
        roof.position.set(0, FLOOR_Y + h + 0.15, 0);
        root.add(roof);
        break;
      }
      case 2: {
        const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.4, 6), accent);
        mast.position.set(0, FLOOR_Y + h + 1.2, 0);
        root.add(mast);
        break;
      }
      case 3: {
        const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.12, 12), accent);
        dish.position.set(w * 0.2, FLOOR_Y + h + 0.2, -d * 0.15);
        root.add(dish);
        break;
      }
      default: {
        const a = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.0, 0.4), accent);
        a.position.set(-0.7, FLOOR_Y + h + 1.0, 0);
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.5, 0.4), accent);
        b.position.set(0.7, FLOOR_Y + h + 0.75, 0);
        root.add(a, b);
        break;
      }
    }
  }
}
