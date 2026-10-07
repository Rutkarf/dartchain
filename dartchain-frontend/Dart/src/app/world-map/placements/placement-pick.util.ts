export const PLACEMENT_CLICK_DRAG_PX = 6;

export interface PointerPx {
  x: number;
  y: number;
}

export function pointerDeltaPx(start: PointerPx, end: PointerPx): number {
  return Math.hypot(end.x - start.x, end.y - start.y);
}

export function isClickNotDrag(
  start: PointerPx,
  end: PointerPx,
  thresholdPx = PLACEMENT_CLICK_DRAG_PX
): boolean {
  return pointerDeltaPx(start, end) <= thresholdPx;
}

export interface PlacementPickHit {
  object: {
    userData?: { placementId?: string };
    parent?: PlacementPickHit['object'] | null;
  };
}

export function placementIdFromIntersections(
  hits: readonly PlacementPickHit[]
): string | null {
  for (const hit of hits) {
    let current: PlacementPickHit['object'] | null | undefined = hit.object;
    while (current) {
      const id = current.userData?.placementId;
      if (typeof id === 'string' && id.length > 0) return id;
      current = current.parent;
    }
  }
  return null;
}
