import {
  mapViewJoystickVector,
  VIEW_JOYSTICK_INPUT_CONFIG,
  ViewJoystickSmoother,
} from './view-joystick.input';

describe('mapViewJoystickVector', () => {
  it('neutralise le jitter sous la zone morte', () => {
    const view = mapViewJoystickVector({ x: 0.07, y: 0 });
    expect(view.active).toBe(false);
    expect(view.yaw).toBe(0);
    expect(view.pitch).toBe(0);
    expect(view.magnitude).toBe(0);
  });

  it('laisse le yaw au bord à magnitude 1 (vitesse max inchangée)', () => {
    const view = mapViewJoystickVector({ x: 1, y: 0 });
    expect(view.active).toBe(true);
    expect(view.magnitude).toBeCloseTo(1);
    expect(view.yaw).toBeCloseTo(1);
    expect(view.pitch).toBeCloseTo(0);
  });

  it('adoucit le pitch au bord sans changer le yaw max', () => {
    const yaw = mapViewJoystickVector({ x: 1, y: 0 });
    const pitch = mapViewJoystickVector({ x: 0, y: 1 });
    expect(yaw.yaw).toBeCloseTo(1);
    expect(pitch.pitch).toBeCloseTo(0.85);
  });

  it('ralentit le centre par rapport à une réponse linéaire', () => {
    const input = { x: 0.4, y: 0 };
    const view = mapViewJoystickVector(input);
    expect(view.active).toBe(true);
    expect(Math.abs(view.yaw)).toBeLessThan(Math.abs(input.x));
    expect(view.pitch).toBe(0);
  });

  it('normalise la diagonale (pas plus rapide que l’axe)', () => {
    const axis = mapViewJoystickVector({ x: 1, y: 0 });
    const diag = mapViewJoystickVector({ x: 1, y: 1 });
    expect(diag.magnitude).toBeCloseTo(axis.magnitude);
    expect(diag.magnitude).toBeLessThanOrEqual(1);
  });

  it('préserve le sens vertical si invertY est false', () => {
    const view = mapViewJoystickVector({ x: 0, y: 1 });
    expect(view.pitch).toBeGreaterThan(0);
  });

  it('inverse le pitch si invertY est true', () => {
    const view = mapViewJoystickVector(
      { x: 0, y: 1 },
      { ...VIEW_JOYSTICK_INPUT_CONFIG, invertY: true }
    );
    expect(view.pitch).toBeLessThan(0);
  });

  it('réduit le yaw si yawSensitivity < 1 sans changer le pitch', () => {
    const view = mapViewJoystickVector(
      { x: 1, y: 0 },
      { ...VIEW_JOYSTICK_INPUT_CONFIG, yawSensitivity: 0.5 }
    );
    expect(view.yaw).toBeCloseTo(0.5);
    expect(view.pitch).toBeCloseTo(0);
  });

  it('plafonne la magnitude si maxMagnitude < 1', () => {
    const view = mapViewJoystickVector(
      { x: 1, y: 0 },
      { ...VIEW_JOYSTICK_INPUT_CONFIG, maxMagnitude: 0.6 }
    );
    expect(view.magnitude).toBeCloseTo(0.6);
    expect(view.yaw).toBeCloseTo(0.6);
  });
});

describe('ViewJoystickSmoother', () => {
  const edge = mapViewJoystickVector({ x: 1, y: 0 });
  const config = VIEW_JOYSTICK_INPUT_CONFIG;

  it('applique le premier échantillon sans délai', () => {
    const smoother = new ViewJoystickSmoother();
    const view = smoother.push(edge, 0, config);
    expect(view.yaw).toBeCloseTo(edge.yaw);
    expect(view.active).toBe(true);
  });

  it('approche la cible sans la dépasser après un pas court', () => {
    const smoother = new ViewJoystickSmoother();
    smoother.push(mapViewJoystickVector({ x: 0.4, y: 0 }), 0, config);
    const later = smoother.push(edge, 16, config);
    expect(later.yaw).toBeGreaterThan(0);
    expect(later.yaw).toBeLessThan(edge.yaw);
  });

  it('revient à zéro immédiatement au release / zone morte', () => {
    const smoother = new ViewJoystickSmoother();
    smoother.push(edge, 0, config);
    const released = smoother.push(mapViewJoystickVector({ x: 0, y: 0 }), 16, config);
    expect(released.active).toBe(false);
    expect(released.yaw).toBe(0);
    expect(released.pitch).toBe(0);
  });

  it('ignore le lissage si smoothingHz est 0', () => {
    const smoother = new ViewJoystickSmoother();
    const off = { ...config, smoothingHz: 0 };
    smoother.push(mapViewJoystickVector({ x: 0.4, y: 0 }), 0, off);
    const later = smoother.push(edge, 16, off);
    expect(later.yaw).toBeCloseTo(edge.yaw);
  });
});
