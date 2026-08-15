/**
 * Zone d’exclusion écran du HorizonJoystick.
 * Calculée depuis le rectangle réel projeté (anneau + halo + marge drag/clic).
 */

export type JoystickExclusionZone = {
  /** Centre écran (px). */
  x: number;
  y: number;
  /** Rayon de sécurité (px) — disque englobant le rect. */
  r: number;
  /** AABB de sécurité (px). */
  left: number;
  top: number;
  right: number;
  bottom: number;
};

/** Marge UI autour du rect joystick (px) — assez pour dégager, OK en 250×550. */
export const JOY_UI_PAD_PX = 8;
export const JOY_PARTICLE_PAD_PX = 4;

/** Hystérésis : garder la position si le score n’est pas nettement meilleur. */
const PLACE_HYSTERESIS = 480;

export function pointInJoystickZone(
  px: number,
  py: number,
  zone: JoystickExclusionZone,
  pad = 0
): boolean {
  const l = zone.left - pad;
  const t = zone.top - pad;
  const r = zone.right + pad;
  const b = zone.bottom + pad;
  return px >= l && px <= r && py >= t && py <= b;
}

export function pushPointOutOfJoystick(
  px: number,
  py: number,
  zone: JoystickExclusionZone,
  pad = JOY_UI_PAD_PX
): { x: number; y: number } {
  if (!pointInJoystickZone(px, py, zone, pad)) return { x: px, y: py };
  const l = zone.left - pad;
  const t = zone.top - pad;
  const r = zone.right + pad;
  const b = zone.bottom + pad;
  const cx = (l + r) * 0.5;
  const dRight = r - px;
  const dLeft = px - l;
  const dTop = py - t;
  const dBottom = b - py;
  const min = Math.min(dRight, dLeft, dTop, dBottom);
  if (min === dRight || (Math.abs(min - dRight) < 0.5 && px >= cx)) {
    return { x: r + 1, y: py };
  }
  if (min === dLeft) return { x: l - 1, y: py };
  if (min === dTop) return { x: px, y: t - 1 };
  return { x: px, y: b + 1 };
}

export function rectOverlapsJoystick(
  left: number,
  top: number,
  w: number,
  h: number,
  zone: JoystickExclusionZone,
  pad = 0
): boolean {
  const jl = zone.left - pad;
  const jt = zone.top - pad;
  const jr = zone.right + pad;
  const jb = zone.bottom + pad;
  return !(left + w <= jl || left >= jr || top + h <= jt || top >= jb);
}

function clampPanel(
  px: number,
  py: number,
  panelW: number,
  panelH: number,
  vw: number,
  vh: number,
  margin: number
): { x: number; y: number } {
  return {
    x: Math.max(margin, Math.min(vw - margin - panelW, px)),
    y: Math.max(margin, Math.min(vh - margin - panelH, py)),
  };
}

function scoreNearParticle(
  px: number,
  py: number,
  panelW: number,
  panelH: number,
  particleX: number,
  particleY: number
): number {
  const cx = px + panelW * 0.5;
  const cy = py + panelH * 0.5;
  const dx = cx - particleX;
  const dy = cy - particleY;
  return dx * dx + dy * dy;
}

/**
 * Placement intelligent d’un panneau Quest près d’une particule,
 * jamais sur la zone joystick. Conserve `preferred` si encore valide (anti-flicker).
 */
export function placeQuestPanelNearParticle(
  particleX: number,
  particleY: number,
  panelW: number,
  panelH: number,
  zone: JoystickExclusionZone | null,
  vw: number,
  vh: number,
  margin = 6,
  pad = JOY_UI_PAD_PX,
  preferred: { x: number; y: number } | null = null
): { x: number; y: number; compact: boolean } {
  const gap = 10;

  const natural = [
    { x: particleX + gap, y: particleY - panelH * 0.25 },
    { x: particleX - panelW - gap, y: particleY - panelH * 0.25 },
    { x: particleX - panelW * 0.5, y: particleY - panelH - gap },
    { x: particleX - panelW * 0.5, y: particleY + gap },
  ];

  const aroundJoy = zone
    ? [
        { x: zone.right + pad + 4, y: zone.y - panelH * 0.5 },
        { x: zone.left - pad - panelW - 4, y: zone.y - panelH * 0.5 },
        { x: zone.x - panelW * 0.5, y: zone.top - pad - panelH - 4 },
        { x: zone.x - panelW * 0.5, y: zone.bottom + pad + 4 },
        { x: vw - margin - panelW, y: zone.top - pad - panelH - 4 },
        { x: margin, y: zone.top - pad - panelH - 4 },
        { x: vw - margin - panelW, y: margin },
      ]
    : [{ x: vw - margin - panelW, y: margin }];

  const candidates = [...natural, ...aroundJoy];

  const resolve = (pw: number, ph: number, useCompact: boolean) => {
    let best: { x: number; y: number; score: number } | null = null;

    for (const c of candidates) {
      const p = clampPanel(c.x, c.y, pw, ph, vw, vh, margin);
      if (zone && rectOverlapsJoystick(p.x, p.y, pw, ph, zone, pad)) continue;
      const score = scoreNearParticle(p.x, p.y, pw, ph, particleX, particleY);
      if (!best || score < best.score) best = { x: p.x, y: p.y, score };
    }

    if (preferred) {
      const p = clampPanel(preferred.x, preferred.y, pw, ph, vw, vh, margin);
      const ok = !zone || !rectOverlapsJoystick(p.x, p.y, pw, ph, zone, pad);
      if (ok) {
        const prefScore = scoreNearParticle(
          p.x,
          p.y,
          pw,
          ph,
          particleX,
          particleY
        );
        if (!best || prefScore <= best.score + PLACE_HYSTERESIS) {
          return { x: p.x, y: p.y, compact: useCompact };
        }
      }
    }

    if (best) return { x: best.x, y: best.y, compact: useCompact };
    return null;
  };

  const full = resolve(panelW, panelH, false);
  if (full) return full;

  const cw = Math.max(118, panelW * 0.85);
  const ch = Math.max(84, panelH * 0.88);
  const small = resolve(cw, ch, true);
  if (small) return small;

  const fallback = clampPanel(
    vw - margin - cw,
    margin,
    cw,
    ch,
    vw,
    vh,
    margin
  );
  return { x: fallback.x, y: fallback.y, compact: true };
}

/** Alias compat — placement sans ancre particule prioritaire. */
export function placePanelClearOfJoystick(
  x: number,
  y: number,
  panelW: number,
  panelH: number,
  zone: JoystickExclusionZone,
  vw: number,
  vh: number,
  margin = 6,
  pad = JOY_UI_PAD_PX
): { x: number; y: number } {
  const placed = placeQuestPanelNearParticle(
    x,
    y,
    panelW,
    panelH,
    zone,
    vw,
    vh,
    margin,
    pad,
    null
  );
  return { x: placed.x, y: placed.y };
}

export function clearLabelsFromJoystick(
  labels: { x: number; y: number }[],
  zone: JoystickExclusionZone,
  pad = JOY_UI_PAD_PX
): void {
  for (const l of labels) {
    if (!pointInJoystickZone(l.x, l.y, zone, pad)) continue;
    const p = pushPointOutOfJoystick(l.x, l.y, zone, pad);
    l.x = p.x;
    l.y = p.y;
  }
}

/** Construit une zone à partir d’un AABB projeté + marge. */
export function exclusionFromRect(
  left: number,
  top: number,
  right: number,
  bottom: number,
  pad: number
): JoystickExclusionZone {
  const l = left - pad;
  const t = top - pad;
  const r = right + pad;
  const b = bottom + pad;
  const x = (l + r) * 0.5;
  const y = (t + b) * 0.5;
  const halfW = (r - l) * 0.5;
  const halfH = (b - t) * 0.5;
  return {
    x,
    y,
    r: Math.hypot(halfW, halfH),
    left: l,
    top: t,
    right: r,
    bottom: b,
  };
}
