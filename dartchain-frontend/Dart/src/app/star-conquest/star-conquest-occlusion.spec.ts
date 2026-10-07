/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';

import {
  collectUiOccluderRects,
  isPointInRects,
  isQuestFullyOccluded,
} from './star-conquest-occlusion';

function rect(left: number, top: number, width: number, height: number): DOMRect {
  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
    x: left,
    y: top,
    toJSON: () => ({}),
  } as DOMRect;
}

describe('star-conquest-occlusion Phase 18', () => {
  it('sans rects UI → jamais occlus', () => {
    expect(isQuestFullyOccluded(50, 50, [], 10)).toBe(false);
  });

  it('occlus si tous les échantillons touchent un rect', () => {
    const rects = [rect(40, 40, 30, 30)];
    expect(isQuestFullyOccluded(50, 50, rects, 4)).toBe(true);
    expect(isQuestFullyOccluded(10, 10, rects, 4)).toBe(false);
  });

  it('isPointInRects détecte l’intérieur', () => {
    const r = rect(0, 0, 100, 100);
    expect(isPointInRects(50, 50, [r])).toBe(true);
    expect(isPointInRects(150, 50, [r])).toBe(false);
  });

  it('collectUiOccluderRects tolère jsdom sans panneaux', () => {
    expect(collectUiOccluderRects()).toEqual([]);
  });
});
