import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild
} from '@angular/core';
import * as THREE from 'three';
import {
  THREE_AMBIENT_DARK,
  THREE_FLOOR_GLOW,
  THREE_FLOOR_LIGHT,
} from '../core/constants/palette';

@Component({
  selector: 'app-three-floor',
  standalone: true,
  templateUrl: './three-floor.html',
  styleUrl: './three-floor.css'
})
export class ThreeFloor implements AfterViewInit, OnDestroy {

  @ViewChild('floorCanvas', { static: true }) floorCanvas!: ElementRef<HTMLCanvasElement>;

  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private renderer?: THREE.WebGLRenderer;
  private animationId?: number;

  private gridMesh?: THREE.Mesh;

  ngAfterViewInit(): void {
    this.initThree();
    this.createNeonFloor();
    this.animate();
    window.addEventListener('resize', this.onResize);
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.onResize);
    if (this.animationId != null) {
      cancelAnimationFrame(this.animationId);
    }
    this.renderer?.dispose();
  }

  private initThree(): void {
    const canvas = this.floorCanvas.nativeElement;

    this.scene = new THREE.Scene();
    this.scene.background = null;

    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || 120;

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.camera.position.set(0, 3.5, 5);
    this.camera.lookAt(0, 0, 0);

    const ambient = new THREE.AmbientLight(THREE_AMBIENT_DARK, 0.8);
    this.scene.add(ambient);

    const topLight = new THREE.DirectionalLight(THREE_FLOOR_LIGHT, 1.2);
    topLight.position.set(0, 5, 5);
    this.scene.add(topLight);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setSize(width, height, false);
    this.renderer.setClearColor(0x000000, 0);
  }

  private createNeonFloor(): void {
    if (!this.scene) return;

    const size = 40;
    const divisions = 40;

    const gridGeo = new THREE.PlaneGeometry(size, size, divisions, divisions);

    const pos = gridGeo.attributes['position'] as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const color = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const t = (y + size / 2) / size;
      color.setHSL(0.88 - t * 0.38, 0.72, 0.42 + t * 0.08);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    gridGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const gridMat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.4,
      wireframe: true
    });

    const grid = new THREE.Mesh(gridGeo, gridMat);
    grid.rotation.x = -Math.PI / 2;
    grid.position.y = -0.5;
    this.gridMesh = grid;
    this.scene.add(grid);

    const glowMat = new THREE.MeshBasicMaterial({
      color: THREE_FLOOR_GLOW,
      transparent: true,
      opacity: 0.07,
      side: THREE.BackSide
    });
    const glowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(size * 1.1, size * 1.1),
      glowMat
    );
    glowPlane.rotation.x = -Math.PI / 2;
    glowPlane.position.y = -0.52;
    this.scene.add(glowPlane);
  }

  private animate = (): void => {
    if (!this.scene || !this.camera || !this.renderer) return;

    const t = performance.now() * 0.001;

    if (this.gridMesh) {
      this.gridMesh.position.z = (t * 2) % 2;
    }

    this.renderer.render(this.scene, this.camera);
    this.animationId = requestAnimationFrame(this.animate);
  };

  private onResize = (): void => {
    if (!this.camera || !this.renderer || !this.floorCanvas) return;
    const canvas = this.floorCanvas.nativeElement;

    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || 120;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  };
}
