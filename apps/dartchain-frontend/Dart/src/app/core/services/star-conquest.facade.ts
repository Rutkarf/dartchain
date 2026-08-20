import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

import type { StarConquestUniverseId } from '../../particle-background/star-conquest/star-conquest-universe.types';

export interface StarConquestHoverEvent {
  questId: string | null;
  from?: string;
}

/**
 * Pont scène WebGL ↔ overlays HTML.
 * Contrat interne : pas d’événements `window`, pas d’API publique.
 */
@Injectable({ providedIn: 'root' })
export class StarConquestFacade {
  readonly select$ = new Subject<string>();
  readonly hover$ = new Subject<StarConquestHoverEvent>();
  readonly dismiss$ = new Subject<void>();
  readonly progress$ = new Subject<string | undefined>();
  readonly universeChange$ = new Subject<StarConquestUniverseId>();
  /** Additif : recentre la vue monde sans changer la sélection. */
  readonly resetView$ = new Subject<void>();

  selectQuest(questId: string): void {
    this.select$.next(questId);
  }

  hoverQuest(questId: string | null, from?: string): void {
    this.hover$.next({ questId, from });
  }

  dismiss(): void {
    this.dismiss$.next();
  }

  notifyProgress(questId?: string): void {
    this.progress$.next(questId);
  }

  notifyUniverseChange(universeId: StarConquestUniverseId): void {
    this.universeChange$.next(universeId);
  }

  resetView(): void {
    this.resetView$.next();
  }
}
