import { Injectable } from '@angular/core';

/**
 * Retour discret (son + haptique) à l'arrivée de nouvelles actualités.
 * Respecte prefers-reduced-motion et la politique autoplay du navigateur.
 */
@Injectable({ providedIn: 'root' })
export class NewsArrivalFeedbackService {
  private audioContext: AudioContext | null = null;
  private audioUnlocked = false;
  private lastPlayedAt = 0;

  private static readonly MIN_GAP_MS = 2_500;

  constructor() {
    if (typeof document === 'undefined') {
      return;
    }

    const unlock = (): void => {
      this.audioUnlocked = true;
      void this.getAudioContext()?.resume();
    };

    document.addEventListener('pointerdown', unlock, { once: true, passive: true });
    document.addEventListener('keydown', unlock, { once: true, passive: true });
  }

  notifyNewItems(): void {
    if (typeof window === 'undefined') {
      return;
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const now = Date.now();
    if (now - this.lastPlayedAt < NewsArrivalFeedbackService.MIN_GAP_MS) {
      return;
    }
    this.lastPlayedAt = now;

    this.triggerHaptic();
    this.playTone();
  }

  private triggerHaptic(): void {
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
      return;
    }

    try {
      navigator.vibrate(12);
    } catch {
      // Permissions ou appareil sans vibreur.
    }
  }

  private playTone(): void {
    if (!this.audioUnlocked) {
      return;
    }

    try {
      const ctx = this.getAudioContext();
      if (!ctx) {
        return;
      }

      void ctx.resume();

      const start = ctx.currentTime;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(784, start);
      oscillator.frequency.exponentialRampToValueAtTime(588, start + 0.09);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.045, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.11);

      oscillator.connect(gain);
      gain.connect(ctx.destination);

      oscillator.start(start);
      oscillator.stop(start + 0.12);

      oscillator.onended = () => {
        void ctx.close();
        this.audioContext = null;
      };
    } catch {
      // Autoplay bloqué ou Web Audio indisponible.
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') {
      return null;
    }

    if (this.audioContext) {
      return this.audioContext;
    }

    const Ctx =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!Ctx) {
      return null;
    }

    this.audioContext = new Ctx();
    return this.audioContext;
  }
}
