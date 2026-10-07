import * as THREE from 'three';

export interface WebGlRendererResult {
  renderer: THREE.WebGLRenderer;
  canvas: HTMLCanvasElement;
}

/** Crée un renderer WebGL optimisé mobile basse config. */
export function createWebGlRenderer(
  parameters: THREE.WebGLRendererParameters = {}
): WebGlRendererResult | null {
  if (typeof document === 'undefined') {
    return null;
  }

  try {
    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true,
      depth: true,
      stencil: false,
      powerPreference: 'low-power',
      preserveDrawingBuffer: false,
      failIfMajorPerformanceCaveat: false,
      ...parameters,
    });
    renderer.setPixelRatio(1);
    renderer.shadowMap.enabled = false;

    return { renderer, canvas: renderer.domElement };
  } catch (error) {
    console.warn('[three-webgl] Impossible de créer le renderer.', error);
    return null;
  }
}

export function applyCanvasLayerStyles(
  canvas: HTMLCanvasElement,
  layer: 'background' | 'floor' | 'logo'
): void {
  canvas.style.display = 'block';
  canvas.style.touchAction = layer === 'logo' ? 'none' : 'auto';

  if (layer === 'background') {
    canvas.style.position = 'fixed';
    canvas.style.inset = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.zIndex = '0';
    canvas.style.pointerEvents = 'none';
    return;
  }

  if (layer === 'floor') {
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    return;
  }

  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.background = 'transparent';
}

export function viewportSize(): { width: number; height: number } {
  return {
    width: Math.max(window.innerWidth, 32),
    height: Math.max(window.innerHeight, 32),
  };
}
