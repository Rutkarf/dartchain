import {
  bindWebGlVisibilityPause,
  shouldAnimateWebGl,
} from './three-animation.util';

describe('three-animation.util', () => {
  afterEach(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: false,
    });
  });

  it('returns false when the document is hidden', () => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: true,
    });

    expect(shouldAnimateWebGl()).toBe(false);
  });

  it('returns false when reduced motion is preferred', () => {
    vi.mocked(window.matchMedia).mockImplementationOnce((query: string) => ({
      matches: query.includes('reduce'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    expect(shouldAnimateWebGl()).toBe(false);
  });

  it('pauses and resumes through visibility bindings', () => {
    const onPause = vi.fn();
    const onResume = vi.fn();

    const binding = bindWebGlVisibilityPause(onPause, onResume);

    expect(onResume).toHaveBeenCalled();

    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(onPause).toHaveBeenCalled();

    binding.unsubscribe();
  });
});
