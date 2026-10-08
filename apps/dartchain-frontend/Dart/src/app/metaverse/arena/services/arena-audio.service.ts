import { Injectable, signal } from '@angular/core';

type SfxKind = 'fire' | 'hit' | 'kill' | 'hurt' | 'power' | 'earn';

/**
 * Audio Éliminer pour gagner — blips punchy, zéro asset externe.
 */
@Injectable({ providedIn: 'root' })
export class ArenaAudioService {
  private ctx: AudioContext | null = null;
  private readonly mutedSignal = signal(false);
  readonly muted = this.mutedSignal.asReadonly();

  toggleMute(): void {
    this.mutedSignal.update((m) => !m);
  }

  setMuted(value: boolean): void {
    this.mutedSignal.set(value);
  }

  play(kind: SfxKind): void {
    if (this.mutedSignal()) return;
    // Uniquement pendant une interaction gameplay (geste déjà présent).
    const shared = (
      window as unknown as { __DARTCHAIN_AUDIO__?: { unlocked?: boolean } }
    ).__DARTCHAIN_AUDIO__;
    if (shared && !shared.unlocked) return;
    try {
      this.ctx ??= new AudioContext();
      const ctx = this.ctx;
      if (ctx.state === 'suspended') {
        void ctx.resume().catch(() => undefined);
      }
      const t0 = ctx.currentTime;

      const beep = (
        type: OscillatorType,
        f0: number,
        f1: number,
        dur: number,
        vol: number
      ): void => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(f0, t0);
        osc.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t0 + dur);
        gain.gain.setValueAtTime(vol, t0);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
        osc.start(t0);
        osc.stop(t0 + dur + 0.02);
      };

      switch (kind) {
        case 'fire':
          beep('square', 680, 140, 0.09, 0.07);
          beep('sawtooth', 220, 90, 0.06, 0.035);
          break;
        case 'hit':
          beep('triangle', 990, 320, 0.07, 0.08);
          break;
        case 'kill':
          beep('sawtooth', 180, 720, 0.22, 0.09);
          beep('square', 440, 880, 0.16, 0.05);
          break;
        case 'hurt':
          beep('sine', 120, 60, 0.18, 0.08);
          break;
        case 'power':
          beep('sine', 360, 980, 0.14, 0.06);
          break;
        case 'earn':
          beep('triangle', 520, 1040, 0.2, 0.07);
          beep('sine', 780, 1560, 0.15, 0.04);
          break;
      }
    } catch {
      // Audio bloqué — silencieux.
    }
  }
}
