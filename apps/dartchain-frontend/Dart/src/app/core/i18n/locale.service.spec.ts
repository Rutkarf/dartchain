import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { LocaleService } from './locale.service';

describe('LocaleService', () => {
  it('translates dock labels in both locales', () => {
    const service = TestBed.inject(LocaleService);

    expect(service.t('dock.chain')).toBe('Explorateur de chaîne');
    service.toggle();
    expect(service.t('dock.chain')).toBe('Chain explorer');
  });
});
