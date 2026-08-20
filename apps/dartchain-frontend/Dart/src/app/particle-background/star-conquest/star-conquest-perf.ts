/** Snapshot perf local — pas de mesure inventée ; champs optionnels. */

export interface StarConquestPerfSnapshot {
  rendererCount: 1;
  canvasFlag: 'data-star-conquest';
  dprCap: number;
  idleSimHz: number;
  overlayMaxW: number;
  overlayMaxH: number;
}

export function describeStarConquestPerfBudget(
  dprCap: number,
  overlayMaxW: number,
  overlayMaxH: number
): StarConquestPerfSnapshot {
  return {
    rendererCount: 1,
    canvasFlag: 'data-star-conquest',
    dprCap,
    idleSimHz: 30,
    overlayMaxW,
    overlayMaxH,
  };
}
