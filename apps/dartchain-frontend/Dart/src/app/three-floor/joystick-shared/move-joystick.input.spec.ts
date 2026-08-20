import { mapMoveJoystickVector } from './move-joystick.input';

describe('mapMoveJoystickVector', () => {
  it('reste neutre à (0,0)', () => {
    const move = mapMoveJoystickVector({ x: 0, y: 0 });
    expect(move.active).toBe(false);
    expect(move.x).toBe(0);
    expect(move.y).toBe(0);
    expect(move.magnitude).toBe(0);
  });

  it('transmet x/y sans courbe (gait walk/run côté service)', () => {
    const move = mapMoveJoystickVector({ x: 0.4, y: 0 });
    expect(move.active).toBe(true);
    expect(move.x).toBeCloseTo(0.4);
    expect(move.y).toBe(0);
    expect(move.magnitude).toBeCloseTo(0.4);
  });

  it('ne normalise pas la diagonale (le service normalise la velocity)', () => {
    const move = mapMoveJoystickVector({ x: 1, y: 1 });
    expect(move.x).toBeCloseTo(1);
    expect(move.y).toBeCloseTo(1);
    expect(move.magnitude).toBeCloseTo(Math.SQRT2);
  });

  it('clamp les axes à ±1 sans toucher l’autre', () => {
    const move = mapMoveJoystickVector({ x: 1.4, y: -0.2 });
    expect(move.x).toBe(1);
    expect(move.y).toBeCloseTo(-0.2);
  });
});
