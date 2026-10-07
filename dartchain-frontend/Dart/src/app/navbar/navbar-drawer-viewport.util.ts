export interface NavbarDrawerViewportOptions {
  pad?: number;
  maxWidth?: number;
  align?: 'anchor-left' | 'anchor-right';
  topGap?: number;
  /** Réduit la largeur du shell au contenu réel (scrollWidth). */
  fitContent?: boolean;
  /** Cible de mesure pour fitContent (évite de mélanger LIVE et Node Sync). */
  contentKind?: 'generic' | 'network' | 'market';
}

const DEFAULTS: Required<Omit<NavbarDrawerViewportOptions, 'fitContent' | 'contentKind'>> & {
  fitContent: boolean;
  contentKind: 'generic' | 'network' | 'market';
} = {
  pad: 8,
  maxWidth: 280,
  align: 'anchor-right',
  topGap: 4,
  fitContent: false,
  contentKind: 'generic',
};

function unlockDrawerContentSizing(element: HTMLElement | null | undefined): void {
  if (!element) {
    return;
  }

  element.style.setProperty('width', 'max-content');
  element.style.setProperty('max-width', 'none');
  element.style.setProperty('min-width', 'max-content');
  element.style.setProperty('overflow', 'visible');
}

function horizontalPadding(element: HTMLElement): number {
  const style = getComputedStyle(element);
  return parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
}

function measureStructuredDrawerWidth(
  drawer: HTMLElement,
  maxAllowed: number,
  shellSelector: string,
  metricsSelector: string
): number {
  unlockDrawerContentSizing(drawer);
  unlockDrawerContentSizing(drawer.querySelector(shellSelector) as HTMLElement | null);
  unlockDrawerContentSizing(drawer.querySelector(metricsSelector) as HTMLElement | null);

  const metrics = drawer.querySelector(metricsSelector);
  const toolbarActions = drawer.querySelector('.status-drawer__toolbar .status-drawer__actions');
  const shell = drawer.querySelector(shellSelector);

  let contentWidth = 0;

  if (metrics instanceof HTMLElement) {
    contentWidth = Math.ceil(metrics.scrollWidth || metrics.getBoundingClientRect().width);
  }

  if (toolbarActions instanceof HTMLElement) {
    contentWidth = Math.max(
      contentWidth,
      Math.ceil(toolbarActions.getBoundingClientRect().width)
    );
  }

  if (shell instanceof HTMLElement) {
    contentWidth += horizontalPadding(shell);
  }

  contentWidth += horizontalPadding(drawer) + 2;

  const measured =
    contentWidth ||
    Math.ceil(drawer.scrollWidth || drawer.getBoundingClientRect().width);

  return Math.max(0, Math.min(measured, maxAllowed));
}

function measureDrawerContentWidth(
  drawer: HTMLElement,
  maxAllowed: number,
  contentKind: NavbarDrawerViewportOptions['contentKind'] = 'generic'
): number {
  if (contentKind === 'market') {
    return measureStructuredDrawerWidth(
      drawer,
      maxAllowed,
      '.status-drawer--market',
      '.status-drawer__metrics--market'
    );
  }

  if (contentKind === 'network') {
    return measureStructuredDrawerWidth(
      drawer,
      maxAllowed,
      '.status-drawer--network',
      '.status-drawer__metrics--network'
    );
  }

  drawer.style.setProperty('width', 'max-content');
  drawer.style.setProperty('max-width', `${maxAllowed}px`);
  drawer.style.setProperty('min-width', '0');

  const measured = Math.ceil(drawer.scrollWidth || drawer.getBoundingClientRect().width);
  return Math.max(0, Math.min(measured, maxAllowed));
}

function verifyMarketDrawerWidth(
  drawer: HTMLElement,
  width: number,
  left: number,
  maxAllowed: number,
  pad: number,
  viewportW: number,
  align: 'anchor-left' | 'anchor-right',
  anchorRect: DOMRect
): { width: number; left: number } {
  const metrics = drawer.querySelector('.status-drawer__metrics--market');
  const shell = drawer.querySelector('.status-drawer--market');
  if (!(metrics instanceof HTMLElement && shell instanceof HTMLElement)) {
    return { width, left };
  }

  const needed = Math.ceil(
    metrics.scrollWidth + horizontalPadding(shell) + horizontalPadding(drawer) + 2
  );
  const toolbarActions = drawer.querySelector(
    '.status-drawer__toolbar .status-drawer__actions'
  );
  const toolbarNeed =
    toolbarActions instanceof HTMLElement
      ? Math.ceil(toolbarActions.getBoundingClientRect().width) +
        horizontalPadding(shell) +
        horizontalPadding(drawer) +
        2
      : 0;
  const target = Math.max(needed, toolbarNeed);

  if (target <= width || target > maxAllowed) {
    return { width, left };
  }

  let nextWidth = target;
  let nextLeft = align === 'anchor-right' ? anchorRect.right - nextWidth : anchorRect.left;

  if (nextLeft < pad) {
    nextLeft = pad;
  }

  if (nextLeft + nextWidth > viewportW - pad) {
    nextWidth = Math.max(0, viewportW - pad - nextLeft);
  }

  return { width: nextWidth, left: nextLeft };
}

/**
 * Ancre le drawer en position fixed dans le viewport pour éviter tout débordement
 * horizontal (overflow des parents, largeur par défaut 280px, timing @if Angular).
 */
export function pinNavbarDrawerToViewport(
  drawer: HTMLElement,
  anchor: HTMLElement,
  options?: NavbarDrawerViewportOptions
): void {
  const { pad, maxWidth, align, topGap, fitContent, contentKind } = {
    ...DEFAULTS,
    ...options,
  };
  const viewportW = document.documentElement.clientWidth;
  const anchorRect = anchor.getBoundingClientRect();
  const maxAllowed = Math.min(maxWidth, Math.max(0, viewportW - pad * 2));

  drawer.style.setProperty('position', 'fixed');
  drawer.style.setProperty('top', `${anchorRect.bottom + topGap}px`);
  drawer.style.setProperty('right', 'auto');
  drawer.style.setProperty('margin-left', '0');

  let width = fitContent
    ? measureDrawerContentWidth(drawer, maxAllowed, contentKind)
    : maxAllowed;

  if (width <= 0) {
    width = maxAllowed;
  }

  let left = align === 'anchor-right' ? anchorRect.right - width : anchorRect.left;

  if (left < pad) {
    left = pad;
    width = Math.min(width, Math.max(0, viewportW - pad - left));
  }

  if (left + width > viewportW - pad) {
    width = Math.max(0, viewportW - pad - left);
    if (align === 'anchor-right') {
      left = Math.max(pad, anchorRect.right - width);
    }
  }

  if (fitContent && contentKind === 'market') {
    ({ width, left } = verifyMarketDrawerWidth(
      drawer,
      width,
      left,
      maxAllowed,
      pad,
      viewportW,
      align,
      anchorRect
    ));
  }

  drawer.style.setProperty('left', `${left}px`);
  drawer.style.setProperty('width', `${width}px`);
  drawer.style.setProperty('max-width', `${width}px`);
  drawer.style.setProperty('min-width', contentKind === 'market' ? `${width}px` : '0');
  drawer.style.setProperty(
    'z-index',
    'var(--nv-layer-ticker-drawer-overlay, 200)'
  );
  drawer.style.setProperty('--nv-drawer-max-w', `${width}px`);
  drawer.style.setProperty('--nv-drawer-shift-x', '0');

  if (align === 'anchor-left') {
    const ledCenterX = anchorRect.left + anchorRect.width / 2;
    const caretX = Math.max(8, Math.min(width - 8, ledCenterX - left - 4));
    drawer.style.setProperty('--nv-drawer-caret-x', `${caretX}px`);
  } else {
    drawer.style.removeProperty('--nv-drawer-caret-x');
  }
}

export function unpinNavbarDrawer(drawer: HTMLElement): void {
  drawer.style.removeProperty('position');
  drawer.style.removeProperty('top');
  drawer.style.removeProperty('left');
  drawer.style.removeProperty('right');
  drawer.style.removeProperty('width');
  drawer.style.removeProperty('max-width');
  drawer.style.removeProperty('min-width');
  drawer.style.removeProperty('margin-left');
  drawer.style.removeProperty('z-index');
  drawer.style.removeProperty('--nv-drawer-max-w');
  drawer.style.removeProperty('--nv-drawer-shift-x');
  drawer.style.removeProperty('--nv-drawer-caret-x');
}

export function scheduleNavbarDrawerPin(
  getNodes: () => { drawer: HTMLElement | null; anchor: HTMLElement | null },
  options?: NavbarDrawerViewportOptions
): void {
  const attempt = (remaining: number): void => {
    const { drawer, anchor } = getNodes();
    if (drawer && anchor) {
      pinNavbarDrawerToViewport(drawer, anchor, options);
      if (options?.fitContent) {
        requestAnimationFrame(() => pinNavbarDrawerToViewport(drawer, anchor, options));
        if (options.contentKind === 'market') {
          requestAnimationFrame(() => pinNavbarDrawerToViewport(drawer, anchor, options));
        }
      }
      return;
    }
    if (remaining <= 0) {
      return;
    }
    requestAnimationFrame(() => attempt(remaining - 1));
  };

  queueMicrotask(() => attempt(8));
}
