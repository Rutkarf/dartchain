import * as THREE from 'three';

/** Registre GPU pour overlays metaverseBB — dispose groupé, hors rAF. */
export class OverlayResourceRegistry {
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly materials: THREE.Material[] = [];
  private readonly textures: THREE.Texture[] = [];

  trackGeometry(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
    this.geometries.push(geometry);
    return geometry;
  }

  trackMaterial(material: THREE.Material): THREE.Material {
    this.materials.push(material);
    return material;
  }

  trackTexture(texture: THREE.Texture): THREE.Texture {
    this.textures.push(texture);
    return texture;
  }

  get counts(): { geometries: number; materials: number; textures: number } {
    return {
      geometries: this.geometries.length,
      materials: this.materials.length,
      textures: this.textures.length,
    };
  }

  dispose(): void {
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
    for (const texture of this.textures) texture.dispose();
    this.geometries.length = 0;
    this.materials.length = 0;
    this.textures.length = 0;
  }
}
