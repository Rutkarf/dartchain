import { LANDMARK_HEIGHT_QUALITY, ARCADES_WEST_PROVENANCE } from './landmark-height-quality';
import { VIEUX_PORT_VIEW_TARGET } from './vieux-port-view-target';
import { districtTileId } from './district-tile-id';
import { overlayPickIsIsolated } from './overlay-pick-guard';
import { spawnFacadeDualMeshStatus, SPAWN_FACADE_DUAL_MESH } from './spawn-facade-dual-mesh';
import { SPAWN_LOOK_DIRECTION } from './spawn-look-direction';
import { osmAttributionLine } from './hud-osm-attribution';
import { MARSEILLE_OVERLAY_LAYER } from './overlay-layer';
import { captureCalibrationSnapshot } from './calibration-diagnostics';
import { SPAWN_FACADE_OSM_ALIGN } from './spawn-facade-align.config';

describe('height quality, arcades, view, tiles (ITER-028/034/035/031)', () => {
  it('classe les hauteurs héros comme APPROXIMATE', () => {
    expect(LANDMARK_HEIGHT_QUALITY['harbor-east-building']).toBe('APPROXIMATE');
  });

  it('documente les arcades spawn comme estimated', () => {
    expect(ARCADES_WEST_PROVENANCE.sourceQuality).toBe('APPROXIMATE');
  });

  it('place l eau du Vieux-Port derrière le heading 0', () => {
    expect(VIEUX_PORT_VIEW_TARGET.waterDirection.z).toBe(1);
    expect(VIEUX_PORT_VIEW_TARGET.documentedHeadingRadians).toBe(0);
  });

  it('identifie une tuile cœur au spawn', () => {
    expect(districtTileId('vieux-port-core', -6.2, -2.4)).toContain('vieux-port-core:');
  });
});

describe('overlay isolation, dual mesh, look, HUD (ITER-033/036/037/026/039/040)', () => {
  it('isole le pick overlay des placements RDC', () => {
    expect(overlayPickIsIsolated()).toBe(true);
  });

  it('refuse de shrink l AABB shopsEast malgré le double mesh', () => {
    expect(SPAWN_FACADE_DUAL_MESH.resolveByShrinkingAabb).toBe(false);
    expect(SPAWN_FACADE_OSM_ALIGN.enabled).toBe(false);
    const status = spawnFacadeDualMeshStatus();
    expect(status.alignEnabled).toBe(false);
    expect(status.centroidDeltaMeters).toBeGreaterThan(0.2);
    expect(status.centroidDeltaMeters).toBeLessThan(15);
  });

  it('documente yaw caméra π sans muter CameraControlService', () => {
    expect(SPAWN_LOOK_DIRECTION.applyAtRuntime).toBe(false);
    expect(SPAWN_LOOK_DIRECTION.cameraYawRadians).toBe(Math.PI);
    expect(SPAWN_LOOK_DIRECTION.waterIsBehindAvatarWhenHeading0).toBe(true);
  });

  it('fournit une ligne ODbL pour le panneau placements', () => {
    expect(osmAttributionLine()).toContain('OpenStreetMap');
    expect(osmAttributionLine()).toContain('ODbL');
  });

  it('expose les deltas Ombrière pour F11 sans activer un nouveau HUD', () => {
    const snap = captureCalibrationSnapshot();
    expect(snap.spawnApplyAtRuntime).toBe(false);
    expect(snap.ombriereLengthDeltaMeters).toBeLessThan(0);
    expect(MARSEILLE_OVERLAY_LAYER).toBe(1);
  });
});
