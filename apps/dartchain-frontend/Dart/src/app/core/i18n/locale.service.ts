import { Injectable, computed, signal } from '@angular/core';

import { AppLocale, LocaleKey, nextLocale, translate } from './locale.messages';

const STORAGE_KEY = 'dartchain.locale';

@Injectable({ providedIn: 'root' })
export class LocaleService {
  private readonly localeSignal = signal<AppLocale>(this.readStoredLocale());

  readonly locale = this.localeSignal.asReadonly();
  readonly localeLabel = computed(() => (this.locale() === 'fr' ? 'FR' : 'EN'));

  t(key: LocaleKey): string {
    return translate(this.locale(), key);
  }

  toggle(): void {
    const next = nextLocale(this.locale());
    this.localeSignal.set(next);
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next;
  }

  private readStoredLocale(): AppLocale {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'fr') {
      document.documentElement.lang = stored;
      return stored;
    }

    document.documentElement.lang = 'fr';
    return 'fr';
  }
}
