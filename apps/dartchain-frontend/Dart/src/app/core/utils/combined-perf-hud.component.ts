import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { CombinedPerfHudService } from './combined-perf-hud.service';

/** Phase 22 — overlay dev (?perfDebug=1 / PERF_DEBUG=1). */
@Component({
  selector: 'app-combined-perf-hud',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (hud.snapshot(); as s) {
      <div class="combined-perf-hud" aria-hidden="true">
        <div>{{ s.fps }} fps · {{ s.combinedFrameMs }} ms{{ s.overBudget ? ' ⚠' : '' }}</div>
        <div>floor DC {{ s.floorDrawCalls }} · SC DC {{ s.scDrawCalls }}</div>
        <div>LOD {{ s.lodQueried }}/{{ s.lodTotal }} · dual {{ s.dualActive ? 'Y' : 'N' }} · osm {{ s.osmBatch ? 'Y' : 'N' }}</div>
        <div>rAF loops {{ s.rafLoops }}</div>
      </div>
    }
  `,
  styles: [
    `
      .combined-perf-hud {
        position: fixed;
        left: 4px;
        bottom: 4px;
        z-index: 99999;
        font: 10px/1.35 monospace;
        color: #a8ffb0;
        background: rgba(0, 0, 0, 0.72);
        padding: 4px 6px;
        pointer-events: none;
        border-radius: 3px;
      }
    `,
  ],
})
export class CombinedPerfHudComponent {
  readonly hud = inject(CombinedPerfHudService);
}
