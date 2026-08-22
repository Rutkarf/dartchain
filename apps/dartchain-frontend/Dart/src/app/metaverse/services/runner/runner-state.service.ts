import { Injectable } from '@angular/core';

/**
 * État partagé endless runner (évite la dépendance circulaire control ↔ camera).
 */
@Injectable({ providedIn: 'root' })
export class RunnerStateService {
  progress = 0;
  lane = 0;

  reset(): void {
    this.progress = 0;
    this.lane = 0;
  }
}
