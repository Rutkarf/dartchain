/** Phase 15 — gouverneur CPU simulation (aucun impact visuel direct). */

export function shouldRunSimTick(
  frameIndex: number,
  skip: number,
  idleSkip: number,
  isIdle: boolean
): boolean {
  const effectiveSkip = isIdle ? Math.max(skip, idleSkip) : skip;
  return effectiveSkip <= 0 || frameIndex % (effectiveSkip + 1) === 0;
}

export function cameraMovedEnough(
  lastX: number,
  lastZ: number,
  x: number,
  z: number,
  thresholdM: number
): boolean {
  if (thresholdM <= 0) return true;
  return Math.hypot(x - lastX, z - lastZ) >= thresholdM;
}

export function isSimIdle(lastX: number, lastZ: number, x: number, z: number, epsilonM = 0.04): boolean {
  return Math.hypot(x - lastX, z - lastZ) < epsilonM;
}
