import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { describe, expect, it } from 'vitest';

import { FocusTrapDirective } from './focus-trap.directive';

@Component({
  standalone: true,
  imports: [FocusTrapDirective],
  template: `
    <div [appFocusTrap]="open()">
      <button type="button" id="first">First</button>
      <button type="button" id="last">Last</button>
    </div>
    <button type="button" id="outside">Outside</button>
  `,
})
class HostComponent {
  readonly open = signal(false);
}

describe('FocusTrapDirective', () => {
  it('focuses the first element when activated', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    await Promise.resolve();

    expect(document.activeElement?.id).toBe('first');
  });
});
