import { Injectable } from '@angular/core';
import { BehaviorSubject, type Observable } from 'rxjs';
import * as THREE from 'three';

export type ThreeSceneUpdateFn = (deltaSeconds: number) => void;

/**
 * Point d’accès central à la scène Three.js du floor (personnage, ville, caméra).
 * Le composant `app-three-floor` enregistre scene/camera/renderer après init.
 */
@Injectable({ providedIn: 'root' })
export class ThreeSceneService {
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private readonly updateFns = new Set<ThreeSceneUpdateFn>();
  private readonly readySubject = new BehaviorSubject<boolean>(false);

  /** Observable true une fois la scène floor enregistrée. */
  readonly ready$: Observable<boolean> = this.readySubject.asObservable();

  /**
   * Enregistre les objets Three.js créés par le host (three-floor).
   * Remplace un enregistrement précédent si nécessaire.
   */
  register(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer
  ): void {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.readySubject.next(true);
  }

  /** Détache la scène (ngOnDestroy du floor). */
  unregister(): void {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.readySubject.next(false);
  }

  isReady(): boolean {
    return this.readySubject.value;
  }

  getScene(): THREE.Scene | null {
    return this.scene;
  }

  getCamera(): THREE.PerspectiveCamera | null {
    return this.camera;
  }

  getRenderer(): THREE.WebGLRenderer | null {
    return this.renderer;
  }

  /** Ajoute un mesh/groupe à la scène floor si disponible. */
  addMesh(object: THREE.Object3D): void {
    this.scene?.add(object);
  }

  removeMesh(object: THREE.Object3D): void {
    this.scene?.remove(object);
  }

  /**
   * Callback appelé chaque frame depuis la boucle requestAnimationFrame du floor.
   * @returns fonction de désinscription
   */
  registerUpdate(fn: ThreeSceneUpdateFn): () => void {
    this.updateFns.add(fn);
    return () => this.updateFns.delete(fn);
  }

  /** Appelé par three-floor dans sa boucle d’animation. */
  tick(deltaSeconds: number): void {
    for (const fn of this.updateFns) {
      fn(deltaSeconds);
    }
  }
}
