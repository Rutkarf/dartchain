import { Injectable, signal } from '@angular/core';
import { ONBOARDING_STORAGE_KEY } from '../onboarding-tour/onboarding-tour.model';
import { environment } from '../../../environments/environment';

/** Ancienne clé — purgée au boot pour ne plus bloquer un hard refresh. */
const LEGACY_STORAGE_KEY = 'dartchain.age.ok.v1';

/** Âge minimum : 21 ans et 3 mois. */
export const MIN_AGE_YEARS = 21;
export const MIN_AGE_MONTHS = 3;

/**
 * Vérif d’âge en mémoire uniquement : un rechargement (Ctrl+Shift+R / F5)
 * remet l’appel pré-intro + le tutoriel hub (parcours première visite).
 * Purge localStorage/sessionStorage pour rester un invité « lambda ».
 */
@Injectable({ providedIn: 'root' })
export class AgeGateService {
  readonly passed = signal(false);
  readonly active = signal(false);

  constructor() {
    this.clearFirstVisitPersistence();
    if (environment.skipBootAnimations) {
      // Dev : pas d’appel @R4V3army — hub accessible tout de suite.
      this.passed.set(true);
      return;
    }
    // Masque le hub dès le bootstrap — pas d’aperçu blockchain avant l’appel.
    if (this.shouldAsk()) {
      this.begin();
    }
  }

  shouldAsk(): boolean {
    if (typeof window === 'undefined') return false;
    return !this.passed();
  }

  begin(): void {
    if (this.active()) {
      document.documentElement.classList.add('age-gate-active');
      document.body.style.overflow = 'hidden';
      return;
    }
    this.active.set(true);
    document.documentElement.classList.add('age-gate-active');
    document.body.style.overflow = 'hidden';
  }

  markPassed(): void {
    this.passed.set(true);
    this.active.set(false);
    // garde age-gate-active jusqu’à intro.begin() pour éviter un flash du hub
  }

  end(): void {
    this.active.set(false);
    document.documentElement.classList.remove('age-gate-active');
    if (!document.documentElement.classList.contains('intro-active')) {
      document.body.style.overflow = '';
    }
  }

  /** Naissance + 21 ans + 3 mois ≤ aujourd’hui. */
  isOldEnough(birthIso: string, now = new Date()): boolean {
    if (!birthIso) return false;
    const birth = new Date(`${birthIso}T12:00:00`);
    if (Number.isNaN(birth.getTime())) return false;
    const unlock = new Date(birth.getTime());
    unlock.setFullYear(unlock.getFullYear() + MIN_AGE_YEARS);
    unlock.setMonth(unlock.getMonth() + MIN_AGE_MONTHS);
    return unlock.getTime() <= now.getTime();
  }

  /**
   * Dev / localhost : chaque chargement = nouvel utilisateur lambda
   * (âge → intro → tutoriel Live → Inscription → Connexion…, sans session auth).
   * Prod : purge seulement les clés âge / tutoriel (pas la session).
   */
  private clearFirstVisitPersistence(): void {
    if (typeof window === 'undefined') return;
    try {
      const host = window.location.hostname;
      const localDev = host === 'localhost' || host === '127.0.0.1';
      if (localDev) {
        window.localStorage.clear();
        window.sessionStorage.clear();
      }
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
      window.localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
}
