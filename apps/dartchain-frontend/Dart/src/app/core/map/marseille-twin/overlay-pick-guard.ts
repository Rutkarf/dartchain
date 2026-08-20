import {
  DEFAULT_OVERLAY_PICK,
  overlayShouldBlockPlacementRaycast,
} from './building-pick.metadata';

/** Overlay isolé des picks RDC — ne jamais inverser sans QA raycast. */
export function overlayPickIsIsolated(): boolean {
  return (
    DEFAULT_OVERLAY_PICK.pickable === false &&
    overlayShouldBlockPlacementRaycast(DEFAULT_OVERLAY_PICK) === false
  );
}
