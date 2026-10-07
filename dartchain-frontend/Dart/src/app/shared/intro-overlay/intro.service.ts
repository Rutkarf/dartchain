import { Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * Intro plein écran type AMIX, après la pré-vérification d’âge.
 */
@Injectable({ providedIn: 'root' })
export class IntroService {
  readonly playing = signal(false);
  readonly finished = signal(false);

  shouldPlay(_url: string): boolean {
    if (typeof window === 'undefined') return false;
    if (environment.skipBootAnimations) return false;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    return true;
  }

  begin(): void {
    this.finished.set(false);
    this.playing.set(true);
    document.documentElement.classList.remove('age-gate-active', 'intro-done', 'intro-reveal');
    document.documentElement.classList.add('intro-active');
    document.body.style.overflow = 'hidden';
  }

  /** Laisse voir le hero (titre) pendant que le token recule. */
  revealPage(): void {
    document.documentElement.classList.add('intro-reveal');
  }

  /** Header visible pour l’atterrissage haut-gauche. */
  revealHeader(): void {
    document.documentElement.classList.add('intro-fly');
  }

  complete(): void {
    if (this.finished()) return;
    this.playing.set(false);
    this.finished.set(true);
    document.documentElement.classList.remove(
      'age-gate-active',
      'intro-active',
      'intro-reveal',
      'intro-fly',
    );
    document.documentElement.classList.add('intro-done');
    document.body.style.overflow = '';
  }

  skipMark(): void {
    this.finished.set(true);
    document.documentElement.classList.remove(
      'age-gate-active',
      'intro-active',
      'intro-reveal',
      'intro-fly',
    );
    document.documentElement.classList.add('intro-done');
    document.body.style.overflow = '';
  }
}
