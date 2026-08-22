import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import {
  WEBGL_FRAME_BUDGET_MS,
  WebGlAnimationSchedulerService,
} from './web-gl-animation-scheduler.service';
import { DualContextGovernorService } from './dual-context-governor.service';
import { CombinedPerfHudService } from './combined-perf-hud.service';

function stubWebGlDom(): void {
  vi.stubGlobal('document', {
    hidden: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  vi.stubGlobal('window', {
    matchMedia: vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
}

describe('WebGlAnimationSchedulerService Phase 19', () => {
  let scheduler: WebGlAnimationSchedulerService;

  beforeEach(() => {
    stubWebGlDom();
    scheduler = new WebGlAnimationSchedulerService(
      new DualContextGovernorService(),
      new CombinedPerfHudService()
    );
    vi.stubGlobal('performance', { now: vi.fn(() => 0) });
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 42));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('expose un budget frame combiné', () => {
    expect(WEBGL_FRAME_BUDGET_MS).toBe(18);
  });

  it('enregistre et désenregistre des subscribers', () => {
    const onFrame = vi.fn();
    const unregister = scheduler.register({ id: 'test', order: 10, onFrame });
    scheduler.resumeSubscriber('test');
    expect(requestAnimationFrame).toHaveBeenCalled();
    unregister();
  });

  it('appelle onFrame dans l’ordre order croissant', () => {
    const order: string[] = [];
    scheduler.register({
      id: 'floor',
      order: 20,
      onFrame: () => order.push('floor'),
    });
    scheduler.register({
      id: 'sc',
      order: 10,
      onFrame: () => order.push('sc'),
    });
    scheduler.resumeSubscriber('floor');
    scheduler.resumeSubscriber('sc');

    const raf = (requestAnimationFrame as ReturnType<typeof vi.fn>).mock.calls[0]![0] as () => void;
    (performance.now as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(16)
      .mockReturnValueOnce(32);
    raf();

    expect(order).toEqual(['sc', 'floor']);
  });
});
