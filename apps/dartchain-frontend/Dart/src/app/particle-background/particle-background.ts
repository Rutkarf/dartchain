import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  OnDestroy,
} from '@angular/core';
import * as THREE from 'three';
import { THREE_PARTICLE_STAR, THREE_SCENE_CLEAR_LIGHT } from '../core/constants/palette';
import {
  bindContainerResize,
  type ContainerResizeBinding,
} from '../core/utils/three-container.util';
import {
  bindWebGlVisibilityPause,
  shouldAnimateWebGl,
} from '../core/utils/three-animation.util';
import {
  applyCanvasLayerStyles,
  createWebGlRenderer,
  viewportSize,
} from '../core/utils/three-webgl.util';

@Component({
  selector: 'app-particle-background',
  standalone: true,
  templateUrl: './particle-background.html',
  styleUrl: './particle-background.css'
})
export class ParticleBackgroundComponent implements AfterViewInit, OnDestroy {
  private readonly hostRef = inject(ElementRef<HTMLElement>);

  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private renderer?: THREE.WebGLRenderer;
  private particles?: THREE.Points;
  private starsFar?: THREE.Points;
  private animationId = 0;
  private animating = false;
  private visibilityBinding?: { unsubscribe: () => void };
  private resizeBinding?: ContainerResizeBinding;

  ngAfterViewInit(): void {
    const created = createWebGlRenderer({ alpha: false });
    if (!created) {
      return;
    }

    try {
      this.renderer = created.renderer;
      const { width, height } = viewportSize();

      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 2000);
      this.camera.position.z = 160;

      this.renderer.setSize(width, height, false);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.setClearColor(THREE_SCENE_CLEAR_LIGHT, 1);

      applyCanvasLayerStyles(created.canvas, 'background');
      this.hostRef.nativeElement.appendChild(created.canvas);

      this.createMainParticles();
      this.createFarStars();

      this.resizeBinding = bindContainerResize(
        this.hostRef.nativeElement,
        (nextWidth, nextHeight) => this.applyRendererSize(nextWidth, nextHeight),
        viewportSize()
      );

      this.visibilityBinding = bindWebGlVisibilityPause(
        () => this.pauseAnimation(),
        () => this.resumeAnimation()
      );

      this.renderFrame();
      this.resumeAnimation();
    } catch (error) {
      console.error('[particle-background] Initialisation impossible.', error);
    }
  }

  ngOnDestroy(): void {
    this.visibilityBinding?.unsubscribe();
    this.resizeBinding?.unsubscribe();
    this.pauseAnimation();

    this.particles?.geometry.dispose();
    (this.particles?.material as THREE.Material | undefined)?.dispose();
    this.starsFar?.geometry.dispose();
    (this.starsFar?.material as THREE.Material | undefined)?.dispose();
    this.renderer?.dispose();
  }

  private createMainParticles(): void {
    if (!this.scene) return;

    const count = 1100;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 700;
      positions[i3 + 1] = (Math.random() - 0.5) * 500;
      positions[i3 + 2] = (Math.random() - 0.5) * 700;
      colors[i3] = 1;
      colors[i3 + 1] = 1;
      colors[i3 + 2] = 1;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 1.3,
      transparent: true,
      opacity: 0.72,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  private createFarStars(): void {
    if (!this.scene) return;

    const count = 600;
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 1200;
      positions[i3 + 1] = (Math.random() - 0.5) * 900;
      positions[i3 + 2] = (Math.random() - 0.5) * 1200 - 300;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: THREE_PARTICLE_STAR,
      size: 0.8,
      transparent: true,
      opacity: 0.34,
      depthWrite: false
    });

    this.starsFar = new THREE.Points(geometry, material);
    this.scene.add(this.starsFar);
  }

  private animate = (): void => {
    if (!this.animating || !this.scene || !this.camera || !this.renderer) {
      return;
    }

    this.animationId = requestAnimationFrame(this.animate);

    if (shouldAnimateWebGl()) {
      this.particles!.rotation.y += 0.0007;
      this.particles!.rotation.x += 0.00015;
      this.starsFar!.rotation.y -= 0.0002;
    }

    this.renderFrame();
  };

  private renderFrame(): void {
    if (!this.scene || !this.camera || !this.renderer) {
      return;
    }

    this.renderer.render(this.scene, this.camera);
  }

  private pauseAnimation(): void {
    this.renderFrame();
    this.animating = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = 0;
    }
  }

  private resumeAnimation(): void {
    if (this.animating) {
      return;
    }

    this.animating = true;
    this.animate();
  }

  private applyRendererSize(width: number, height: number): void {
    if (!this.camera || !this.renderer) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderFrame();
  }
}
