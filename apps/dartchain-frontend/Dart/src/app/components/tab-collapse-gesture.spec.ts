import { TabCollapseGesture } from './tab-collapse-gesture';

describe('TabCollapseGesture', () => {
  it('expands a collapsed panel even if the first click already expanded it', () => {
    const gesture = new TabCollapseGesture();
    gesture.notePointerDown(true);
    gesture.notePointerDown(false);
    expect(gesture.resolveDoubleClick(false)).toBe(false);
  });

  it('collapses an expanded panel on double-click', () => {
    const gesture = new TabCollapseGesture();
    gesture.notePointerDown(false);
    gesture.notePointerDown(false);
    expect(gesture.resolveDoubleClick(false)).toBe(true);
  });

  it('starts a fresh gesture after the previous double-click', () => {
    const gesture = new TabCollapseGesture();
    gesture.notePointerDown(false);
    expect(gesture.resolveDoubleClick(false)).toBe(true);
    gesture.notePointerDown(true);
    expect(gesture.resolveDoubleClick(false)).toBe(false);
  });

  it('toggles from the first pointerdown state only', () => {
    const gesture = new TabCollapseGesture();
    gesture.notePointerDown(true);
    expect(gesture.resolveDoubleClick(true)).toBe(false);
    gesture.notePointerDown(false);
    expect(gesture.resolveDoubleClick(true)).toBe(true);
  });
});
