import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ShellFeedbackService {
  readonly bannerError = signal<string | null>(null);
  readonly statusPanelOpen = signal(false);
  readonly r4v3SceneVisible = signal(false);

  setBannerError(message: string | null): void {
    this.bannerError.set(message);
  }

  toggleStatusPanel(): void {
    this.statusPanelOpen.update((open) => !open);
  }

  toggleR4v3Scene(): void {
    this.r4v3SceneVisible.update((visible) => !visible);
  }
}
