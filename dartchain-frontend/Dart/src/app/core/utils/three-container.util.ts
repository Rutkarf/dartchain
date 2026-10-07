/** Mesure fiable du conteneur WebGL (évite canvas 32×32 quand le layout n'est pas prêt). */
export function readContainerSize(
  element: HTMLElement,
  fallback?: { width?: number; height?: number }
): { width: number; height: number } {
  const rect = element.getBoundingClientRect();
  let width = Math.round(rect.width);
  let height = Math.round(rect.height);

  if (width <= 0) {
    width = Math.round(element.clientWidth);
  }
  if (height <= 0) {
    height = Math.round(element.clientHeight);
  }

  if (width <= 0 && fallback?.width) {
    width = Math.round(fallback.width);
  }
  if (height <= 0 && fallback?.height) {
    height = Math.round(fallback.height);
  }

  if (width <= 0 && typeof window !== 'undefined') {
    width = window.innerWidth;
  }
  if (height <= 0 && typeof window !== 'undefined') {
    height = fallback?.height ?? 120;
  }

  return {
    width: Math.max(width, 32),
    height: Math.max(height, 32),
  };
}

export interface ContainerResizeBinding {
  unsubscribe: () => void;
}

export function bindContainerResize(
  element: HTMLElement,
  onResize: (width: number, height: number) => void,
  fallback?: { width?: number; height?: number }
): ContainerResizeBinding {
  const emit = (): void => {
    const { width, height } = readContainerSize(element, fallback);
    onResize(width, height);
  };

  const observer =
    typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => emit()) : null;
  observer?.observe(element);

  window.addEventListener('resize', emit, { passive: true });

  requestAnimationFrame(() => {
    requestAnimationFrame(emit);
  });

  return {
    unsubscribe: () => {
      observer?.disconnect();
      window.removeEventListener('resize', emit);
    },
  };
}

/** Attend que le conteneur ait des dimensions non nulles avant d'initialiser WebGL. */
export function whenContainerReady(
  element: HTMLElement,
  callback: () => void,
  maxAttempts = 20
): void {
  let attempts = 0;

  const tryReady = (): void => {
    const rect = element.getBoundingClientRect();
    const hasSize =
      rect.width > 0 ||
      rect.height > 0 ||
      element.clientWidth > 0 ||
      element.clientHeight > 0;

    if (hasSize || attempts >= maxAttempts) {
      callback();
      return;
    }

    attempts += 1;
    requestAnimationFrame(tryReady);
  };

  requestAnimationFrame(tryReady);
}
