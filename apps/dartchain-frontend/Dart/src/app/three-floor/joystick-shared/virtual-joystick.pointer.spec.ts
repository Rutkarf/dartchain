import {
  isJoystickPointerStart,
  JoystickEmitCoalescer,
  latestPointerSample,
} from './virtual-joystick.pointer';

describe('isJoystickPointerStart', () => {
  it('accepte le premier contact souris bouton gauche', () => {
    expect(
      isJoystickPointerStart({ pointerType: 'mouse', button: 0 }, null)
    ).toBe(true);
  });

  it('ignore clic droit / milieu', () => {
    expect(
      isJoystickPointerStart({ pointerType: 'mouse', button: 2 }, null)
    ).toBe(false);
    expect(
      isJoystickPointerStart({ pointerType: 'mouse', button: 1 }, null)
    ).toBe(false);
  });

  it('accepte le tactile même si un autre stick a déjà un pouce (pas isPrimary)', () => {
    expect(
      isJoystickPointerStart({ pointerType: 'touch', button: 0 }, null)
    ).toBe(true);
  });

  it('refuse un second pointer sur le même stick', () => {
    expect(
      isJoystickPointerStart({ pointerType: 'touch', button: 0 }, 7)
    ).toBe(false);
  });
});

describe('latestPointerSample', () => {
  it('renvoie l’event s’il n’y a pas d’échantillons coalescés', () => {
    const event = { getCoalescedEvents: () => [] } as unknown as PointerEvent;
    expect(latestPointerSample(event)).toBe(event);
  });

  it('prend le dernier échantillon coalescé', () => {
    const last = { pointerId: 2 } as PointerEvent;
    const event = {
      pointerId: 1,
      getCoalescedEvents: () => [{ pointerId: 9 } as PointerEvent, last],
    } as unknown as PointerEvent;
    expect(latestPointerSample(event)).toBe(last);
  });
});

describe('JoystickEmitCoalescer', () => {
  it('dispatch immédiat avec now()', () => {
    const seen: Array<[number, number]> = [];
    const coalescer = new JoystickEmitCoalescer(
      (x, y) => seen.push([x, y]),
      () => 1,
      () => undefined
    );
    coalescer.now(0.5, 0.2);
    expect(seen).toEqual([[0.5, 0.2]]);
  });

  it('retarde later() jusqu’à la frame', () => {
    const seen: Array<[number, number]> = [];
    const scheduled: Array<() => void> = [];
    const coalescer = new JoystickEmitCoalescer(
      (x, y) => seen.push([x, y]),
      (cb) => {
        scheduled.push(cb);
        return scheduled.length;
      },
      () => undefined
    );
    coalescer.later(1, 0);
    coalescer.later(0.4, 0.3);
    expect(seen).toEqual([]);
    expect(scheduled).toHaveLength(1);
    scheduled[0]();
    expect(seen).toEqual([[0.4, 0.3]]);
  });

  it('now() après later() annule le pending (release sans rotation/mouvement fantôme)', () => {
    const seen: Array<[number, number]> = [];
    const scheduled: Array<() => void> = [];
    const coalescer = new JoystickEmitCoalescer(
      (x, y) => seen.push([x, y]),
      (cb) => {
        scheduled.push(cb);
        return 11;
      },
      () => {
        scheduled.length = 0;
      }
    );
    coalescer.later(1, 1);
    coalescer.now(0, 0);
    expect(seen).toEqual([[0, 0]]);
    expect(scheduled).toHaveLength(0);
  });

  it('n’émet pas deux fois le même vecteur (reset idle)', () => {
    const seen: Array<[number, number]> = [];
    const coalescer = new JoystickEmitCoalescer(
      (x, y) => seen.push([x, y]),
      () => 1,
      () => undefined
    );
    coalescer.now(0, 0);
    coalescer.now(0, 0);
    expect(seen).toEqual([[0, 0]]);
  });

  it('ignore later() identique au dernier dispatch', () => {
    const seen: Array<[number, number]> = [];
    const scheduled: Array<() => void> = [];
    const coalescer = new JoystickEmitCoalescer(
      (x, y) => seen.push([x, y]),
      (cb) => {
        scheduled.push(cb);
        return scheduled.length;
      },
      () => undefined
    );
    coalescer.now(0.5, 0);
    coalescer.later(0.5, 0);
    expect(scheduled).toHaveLength(0);
    expect(seen).toEqual([[0.5, 0]]);
  });
});
