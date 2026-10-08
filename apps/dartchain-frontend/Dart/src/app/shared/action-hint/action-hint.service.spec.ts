import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActionHintService } from './action-hint.service';

describe('ActionHintService', () => {
  let service: ActionHintService;
  let button: HTMLButtonElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ActionHintService],
    });
    service = TestBed.inject(ActionHintService);
    service.start();

    button = document.createElement('button');
    button.setAttribute('aria-label', 'Tester le panier');
    document.body.appendChild(button);
  });

  afterEach(() => {
    service.stop();
    button.remove();
    document.getElementById('app-action-hint-tip')?.remove();
  });

  it('shows a tooltip from aria-label on pointerover', () => {
    vi.useFakeTimers();
    button.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' }));
    vi.advanceTimersByTime(300);
    const tip = document.getElementById('app-action-hint-tip');
    expect(tip?.classList.contains('is-visible')).toBe(true);
    expect(tip?.textContent).toBe('Tester le panier');
    vi.useRealTimers();
  });
});
