import {
  GROUND_FLOOR_ANCHOR_HEIGHT_METERS,
  groundFloorAnchorFromWorldRing,
  projectGeoToMarseilleWorld,
  projectMarseilleWorldToGeo,
} from './ground-floor-anchor.util';
import { PLACEMENTS_LAYER_CONFIG } from './placement-layer.config';

describe('ground-floor-anchor.util (GEO-FACADE-1)', () => {
  const offset = PLACEMENTS_LAYER_CONFIG.hitDepth * 0.5;

  it('place l ancre au milieu de la façade est d un rectangle à l est de l origine', () => {
    const ring = [
      { x: 40, z: -8 },
      { x: 60, z: -8 },
      { x: 60, z: 8 },
      { x: 40, z: 8 },
      { x: 40, z: -8 },
    ];
    const anchor = groundFloorAnchorFromWorldRing(ring);
    expect(anchor).not.toBeNull();
    expect(anchor!.world.x).toBeCloseTo(60 + offset, 4);
    expect(anchor!.world.z).toBeCloseTo(0, 4);
    expect(anchor!.world.y).toBe(GROUND_FLOOR_ANCHOR_HEIGHT_METERS);
    expect(anchor!.facingRad).toBeCloseTo(-Math.PI / 2, 5);
    expect(anchor!.edgeLengthMeters).toBeCloseTo(16, 4);
  });

  it('place l ancre au milieu de la façade ouest d un rectangle à l ouest', () => {
    const ring = [
      { x: -60, z: -8 },
      { x: -40, z: -8 },
      { x: -40, z: 8 },
      { x: -60, z: 8 },
    ];
    const anchor = groundFloorAnchorFromWorldRing(ring);
    expect(anchor).not.toBeNull();
    expect(anchor!.world.x).toBeCloseTo(-60 - offset, 4);
    expect(anchor!.world.z).toBeCloseTo(0, 4);
    expect(anchor!.facingRad).toBeCloseTo(Math.PI / 2, 5);
  });

  it('retourne null si l empreinte est trop courte', () => {
    expect(groundFloorAnchorFromWorldRing([{ x: 0, z: 0 }, { x: 1, z: 0 }])).toBeNull();
  });

  it('aligne projectGeoToMarseilleWorld sur l origine Ombrière', () => {
    const origin = projectGeoToMarseilleWorld(43.2945995, 5.3741227, 0);
    expect(origin.x).toBeCloseTo(0, 6);
    expect(origin.z).toBeCloseTo(0, 6);
    const back = projectMarseilleWorldToGeo(10, 1.2, -5);
    const again = projectGeoToMarseilleWorld(back.latitude, back.longitude, back.altitude);
    expect(again.x).toBeCloseTo(10, 6);
    expect(again.y).toBeCloseTo(1.2, 6);
    expect(again.z).toBeCloseTo(-5, 6);
  });
});
