/** Profondeur d'une carte. Un décalage positif rapproche l'élément (premier plan, à gauche). */
export function itemDepth(
  index: number,
  count: number,
  offset: number,
  spacing: number,
  loop: boolean,
): number {
  if (count <= 0 || spacing === 0) {
    return 0;
  }

  if (!loop) {
    const hero = heroDepthFor(count, spacing, false);
    const focus = offset / spacing;
    return hero - Math.abs(index - focus) * spacing;
  }

  const raw = offset - index * spacing;

  const span = count * spacing;
  const half = span / 2;
  return ((raw % span) + span) % span - half;
}

/** Profondeur où l'élément actif est mis en avant, sans sortir de la boucle. */
export function heroDepthFor(count: number, spacing: number, loop: boolean): number {
  if (count <= 1 || spacing <= 0) {
    return 0;
  }

  const half = (count * spacing) / 2;
  const desired = spacing * (loop ? 1.15 : 0.85);
  return Math.min(desired, half * 0.72);
}

export function offsetForIndex(
  index: number,
  spacing: number,
  heroDepth: number,
  loop = true,
): number {
  if (!loop) {
    return index * spacing;
  }
  return heroDepth + index * spacing;
}

export function itemScale(
  depth: number,
  heroDepth: number,
  spacing: number,
  count: number,
  scaleMin: number,
  scaleMax: number,
): number {
  const span = Math.max(spacing * Math.max(count - 1, 1), 1);
  const t = (depth - (heroDepth - span)) / (span * 1.15);
  const clamped = Math.min(1, Math.max(0, t));
  return scaleMin + clamped * (scaleMax - scaleMin);
}

export function nearestIndex(
  count: number,
  offset: number,
  spacing: number,
  loop: boolean,
  heroDepth: number,
): number {
  if (count <= 0) {
    return 0;
  }

  let best = 0;
  let bestDist = Number.POSITIVE_INFINITY;
  for (let index = 0; index < count; index += 1) {
    const dist = Math.abs(itemDepth(index, count, offset, spacing, loop) - heroDepth);
    if (dist < bestDist) {
      bestDist = dist;
      best = index;
    }
  }
  return best;
}

export function stepSpring(
  current: number,
  velocity: number,
  target: number,
  stiffness: number,
  damping: number,
  dt: number,
): { current: number; velocity: number } {
  const accel = stiffness * (target - current) - damping * velocity;
  const nextVelocity = velocity + accel * dt;
  return {
    current: current + nextVelocity * dt,
    velocity: nextVelocity,
  };
}

export function tiltKick(velocity: number, maxKick: number): number {
  if (maxKick <= 0) {
    return 0;
  }
  return Math.max(-maxKick, Math.min(maxKick, velocity / 220));
}
