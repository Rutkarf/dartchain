import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { detectAppLocale, LocaleService } from './locale.service';

describe('detectAppLocale', () => {
  it('reste en français quelle que soit la langue du navigateur', () => {
    expect(detectAppLocale(['fr-CH', 'en'], 'fr-CH')).toBe('fr');
    expect(detectAppLocale(['en-US'], 'en-US')).toBe('fr');
    expect(detectAppLocale(['de-DE', 'ja'], 'de-DE')).toBe('fr');
  });
});

describe('LocaleService', () => {
  it('affiche les libellés en français', () => {
    localStorage.setItem('dartchain.locale', 'en');
    const service = TestBed.inject(LocaleService);

    expect(service.t('dock.chain')).toBe('Explorateur de chaîne');
    expect(service.t('dock.wallet')).toBe('Portefeuille');
    service.toggle();
    expect(service.t('dock.faucet')).toBe('Robinet');
    expect(service.locale()).toBe('fr');
  });
});
