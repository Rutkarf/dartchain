import {
  createCyberpunkOverlayGroup,
  disposeCyberpunkOverlay,
} from './cyberpunk-overlay.factory';
import { MARSEILLE_CYBERPUNK_OVERLAY } from './cyberpunk-overlay.config';
import { MARSEILLE_OVERLAY_LAYER } from './overlay-layer';
import { shopsEastNeonSignageZones } from './neon-signage-zones';
import type { Intersection, Raycaster } from 'three';

describe('cyberpunk-overlay.factory (ITER-012/025/032/038)', () => {
  it('crée un groupe vide si l overlay est off', () => {
    const built = createCyberpunkOverlayGroup(false);
    expect(built.group.name).toBe(MARSEILLE_CYBERPUNK_OVERLAY.layerName);
    expect(built.group.children.length).toBe(0);
    expect(built.registry.counts.geometries).toBe(0);
    expect(built.group.layers.isEnabled(MARSEILLE_OVERLAY_LAYER)).toBe(true);
    disposeCyberpunkOverlay(built);
  });

  it('place les hologrammes sur les baies OSM et ignore le raycast', () => {
    const built = createCyberpunkOverlayGroup(true);
    const zones = shopsEastNeonSignageZones();
    expect(built.group.children.length).toBe(zones.length);
    expect(built.group.getObjectByName('marseille-cyberpunk-hologram-neon-bay-1')).toBeTruthy();
    const first = built.group.children[0];
    expect(first).toBeTruthy();
    expect(first!.layers.isEnabled(MARSEILLE_OVERLAY_LAYER)).toBe(true);
    expect(first!.renderOrder).toBe(4);
    const hits: Intersection[] = [];
    first!.raycast({} as Raycaster, hits);
    expect(hits).toHaveLength(0);
    disposeCyberpunkOverlay(built);
    expect(built.registry.counts.geometries).toBe(0);
  });

  it('ne crée pas d hologrammes quand le flag runtime est off', () => {
    const built = createCyberpunkOverlayGroup(false);
    expect(built.group.children.length).toBe(0);
    expect(built.group.userData['pick'].pickable).toBe(false);
    disposeCyberpunkOverlay(built);
  });
});
