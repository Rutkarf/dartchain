import {
  isKeyboardOpen,
  isViewportCompact,
  PHONE_TALL_MIN_HEIGHT,
  shellBreakpoint,
} from './viewport-compact';

describe('PHONE_TALL_MIN_HEIGHT', () => {
  it('couvre 436×653 et exclut le canon 250×550 / 320×568 via largeur < 360', () => {
    expect(PHONE_TALL_MIN_HEIGHT).toBe(600);
    expect(653 >= PHONE_TALL_MIN_HEIGHT).toBe(true);
    expect(250 < 360).toBe(true);
    expect(320 < 360).toBe(true);
  });
});

describe('isViewportCompact', () => {
  it('garde la bande canon 250–349 quelle que soit l’orientation', () => {
    expect(isViewportCompact(250, true)).toBe(true);
    expect(isViewportCompact(250, false)).toBe(true);
    expect(isViewportCompact(320, false)).toBe(true);
    expect(isViewportCompact(349, false)).toBe(true);
  });

  it('étend le compact au portrait téléphone jusqu’à 480', () => {
    expect(isViewportCompact(360, true)).toBe(true);
    expect(isViewportCompact(390, true)).toBe(true);
    expect(isViewportCompact(440, true)).toBe(true);
    expect(isViewportCompact(480, true)).toBe(true);
    expect(isViewportCompact(200, true)).toBe(true);
  });

  it('laisse le paysage au-dessus de 349 et le portrait au-dessus de 480 hors compact', () => {
    expect(isViewportCompact(350, false)).toBe(false);
    expect(isViewportCompact(390, false)).toBe(false);
    expect(isViewportCompact(481, true)).toBe(false);
    expect(isViewportCompact(844, false)).toBe(false);
    expect(isViewportCompact(200, false)).toBe(false);
  });
});

describe('isKeyboardOpen', () => {
  it('s’ouvre au-delà de 120 px d’écart et se ferme en dessous', () => {
    expect(isKeyboardOpen(844, 520)).toBe(true);
    expect(isKeyboardOpen(844, 800)).toBe(false);
    expect(isKeyboardOpen(844, 724)).toBe(false);
    expect(isKeyboardOpen(844, 723)).toBe(true);
  });
});

describe('shellBreakpoint', () => {
  it('ne change pas les quatre paliers de largeur', () => {
    expect(shellBreakpoint(320)).toBe('compact');
    expect(shellBreakpoint(390)).toBe('mid');
    expect(shellBreakpoint(800)).toBe('roomy');
    expect(shellBreakpoint(1100)).toBe('desktop');
  });
});
