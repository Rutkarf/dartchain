import { Injectable, signal } from '@angular/core';

/** Relais logo.stl : appel d’âge → fente INSERT R4V3. */
@Injectable({ providedIn: 'root' })
export class AgeIntroHandoffService {
  /** Vol en cours (le flyer est au-dessus de l’intro). */
  readonly flying = signal(false);
  /**
   * false = intro armée en gros plan tranche, horloge traveling gelée
   * (crossfade depuis l’appel). true = dézoom Feed The R4V3 autorisé.
   */
  readonly travelReady = signal(false);
  /** Le jeton a atterri dans la fente — l’intro peut afficher son coin. */
  readonly landed = signal(false);

  beginFlight(): void {
    this.landed.set(false);
    this.travelReady.set(false);
    this.flying.set(true);
    if (typeof document !== 'undefined') {
      document.documentElement.classList.add('intro-handoff');
    }
  }

  /** Autorise le traveling après le crossfade appel → intro. */
  releaseTravel(): void {
    if (!this.flying()) return;
    this.travelReady.set(true);
  }

  markLanded(): void {
    this.landed.set(true);
    this.flying.set(false);
    this.travelReady.set(false);
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('intro-handoff');
    }
  }

  reset(): void {
    this.flying.set(false);
    this.travelReady.set(false);
    this.landed.set(false);
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('intro-handoff');
    }
  }
}
