/**
 * Process commercial Star Conquest — pas le scale visuel.
 *
 * Méthode : mesurer le funnel, poser des portes KPI, n’autoriser
 * le level-up que lorsque les portes tiennent. C’est le levier
 * pour rendre le composant commercialisable plus tard.
 */

import { STAR_CONQUEST_LIVE_LINKS, isStarConquestLiveQuest } from './star-conquest-live';
import type { StarConquestProgressSnapshot } from './star-conquest-progress';

export type StarConquestCommercialStage =
  | 'rd'
  | 'instrumented'
  | 'measurable'
  | 'commercial';

/** Seuils du process. Un seul endroit pour level-up la méthode. */
export const STAR_CONQUEST_COMMERCIAL_THRESHOLDS = {
  minLiveLinks: 4,
  minLiveCoverage: 0.2,
  minViews: 8,
  minCtr: 0.15,
  minClaimRate: 0.1,
  minPanelsForClaimRate: 3,
  minClaimsForLiveShare: 3,
  minLiveShare: 0.25,
} as const;

export interface StarConquestKpis {
  views: number;
  picks: number;
  panels: number;
  claims: number;
  catalogCount: number;
  liveLinkCount: number;
  liveClaimedCount: number;
  previewClaimedCount: number;
  /** picks / views */
  ctr: number;
  /** panels / picks */
  panelRate: number;
  /** claims / panels */
  claimRate: number;
  /** claims / views */
  conversion: number;
  /** live links / catalogue */
  liveCoverage: number;
  /** live conquises / live links */
  liveCompletion: number;
  /** conquêtes live / conquêtes totales */
  liveShare: number;
}

export interface StarConquestCommercialGate {
  id: string;
  label: string;
  ok: boolean;
}

export interface StarConquestCommercialReport {
  stage: StarConquestCommercialStage;
  kpis: StarConquestKpis;
  gates: StarConquestCommercialGate[];
  blockers: string[];
  nextMethod: string;
  canLevelUp: boolean;
}

function ratio(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return numerator / denominator;
}

function liveClaimedCount(snapshot: StarConquestProgressSnapshot): number {
  let n = 0;
  for (const id of Object.keys(snapshot.claimed)) {
    if (isStarConquestLiveQuest(id)) n += 1;
  }
  return n;
}

export function starConquestKpis(
  snapshot: StarConquestProgressSnapshot,
  catalogCount: number,
  liveLinkCount: number = STAR_CONQUEST_LIVE_LINKS.length
): StarConquestKpis {
  const { views, picks, panels, claims } = snapshot.funnel;
  const liveClaimed = liveClaimedCount(snapshot);
  const totalClaimed = Object.keys(snapshot.claimed).length;
  return {
    views,
    picks,
    panels,
    claims,
    catalogCount,
    liveLinkCount,
    liveClaimedCount: liveClaimed,
    previewClaimedCount: Math.max(0, totalClaimed - liveClaimed),
    ctr: ratio(picks, views),
    panelRate: ratio(panels, picks),
    claimRate: ratio(claims, panels),
    conversion: ratio(claims, views),
    liveCoverage: ratio(liveLinkCount, catalogCount),
    liveCompletion: ratio(liveClaimed, liveLinkCount),
    liveShare: ratio(liveClaimed, totalClaimed),
  };
}

export function starConquestCommercialGates(
  kpis: StarConquestKpis
): StarConquestCommercialGate[] {
  const t = STAR_CONQUEST_COMMERCIAL_THRESHOLDS;
  const sampled = kpis.views >= t.minViews;
  const claimSample = kpis.panels >= t.minPanelsForClaimRate;
  const shareSample = kpis.claims >= t.minClaimsForLiveShare;
  return [
    {
      id: 'live-links',
      label: `Pont Dock ≥ ${t.minLiveLinks} étoiles live`,
      ok: kpis.liveLinkCount >= t.minLiveLinks,
    },
    {
      id: 'live-coverage',
      label: `Couverture live ≥ ${Math.round(t.minLiveCoverage * 100)}% du catalogue`,
      ok: kpis.liveCoverage + 1e-9 >= t.minLiveCoverage,
    },
    {
      id: 'sample',
      label: `Volume ≥ ${t.minViews} vues pour mesurer`,
      ok: sampled,
    },
    {
      id: 'ctr',
      label: `CTR vue→pick ≥ ${Math.round(t.minCtr * 100)}%`,
      ok: !sampled || kpis.ctr + 1e-9 >= t.minCtr,
    },
    {
      id: 'claim-rate',
      label: `Taux panneau→conquête ≥ ${Math.round(t.minClaimRate * 100)}%`,
      ok: !claimSample || kpis.claimRate + 1e-9 >= t.minClaimRate,
    },
    {
      id: 'live-share',
      label: `Part live des conquêtes ≥ ${Math.round(t.minLiveShare * 100)}%`,
      ok: !shareSample || kpis.liveShare + 1e-9 >= t.minLiveShare,
    },
  ];
}

function stageFromGates(
  gates: readonly StarConquestCommercialGate[]
): StarConquestCommercialStage {
  const byId = new Map(gates.map((gate) => [gate.id, gate.ok]));
  const processOk = Boolean(byId.get('live-links') && byId.get('live-coverage'));
  if (!byId.get('live-links')) return 'rd';
  if (!processOk || !byId.get('sample')) return 'instrumented';
  const sessionOk = Boolean(byId.get('ctr') && byId.get('claim-rate') && byId.get('live-share'));
  if (!sessionOk) return 'measurable';
  return 'commercial';
}

function nextMethodFromGates(gates: readonly StarConquestCommercialGate[]): string {
  const first = gates.find((gate) => !gate.ok);
  if (!first) {
    return 'KPI tenus — level-up commercial autorisé (pas le palier visuel company).';
  }
  switch (first.id) {
    case 'live-links':
      return 'Ajouter des ponts Dock dans STAR_CONQUEST_LIVE_LINKS (table, pas du code graphe).';
    case 'live-coverage':
      return 'Monter la couverture live : une ligne de mapping Dock par étoile produit, sans nouveau système.';
    case 'sample':
      return 'Le funnel est branché — accumuler des vues session (voir / pick / panneau).';
    case 'ctr':
      return 'Hausser le CTR : pick trop faible vs vues — lisibilité / hit-test, pas plus de quêtes.';
    case 'claim-rate':
      return 'Hausser le taux de conquête : CTA live vers une action Dock réelle.';
    case 'live-share':
      return 'Réduire les conquêtes preview : plus d’étoiles live, moins de clic magique.';
    default:
      return first.label;
  }
}

export function evaluateStarConquestCommercial(
  snapshot: StarConquestProgressSnapshot,
  catalogCount: number,
  liveLinkCount: number = STAR_CONQUEST_LIVE_LINKS.length
): StarConquestCommercialReport {
  const kpis = starConquestKpis(snapshot, catalogCount, liveLinkCount);
  const gates = starConquestCommercialGates(kpis);
  const stage = stageFromGates(gates);
  const blockers = gates.filter((gate) => !gate.ok).map((gate) => gate.id);
  return {
    stage,
    kpis,
    gates,
    blockers,
    nextMethod: nextMethodFromGates(gates),
    canLevelUp: stage === 'commercial',
  };
}

export function formatStarConquestKpiLine(report: StarConquestCommercialReport): string {
  const pct = (value: number) => `${Math.round(value * 100)}%`;
  const { kpis, stage, canLevelUp } = report;
  const live = `${pct(kpis.liveCoverage)} live`;
  if (kpis.views <= 0) {
    return `${live} · ${stage}${canLevelUp ? ' · UP' : ''}`;
  }
  return `CTR ${pct(kpis.ctr)} · CVR ${pct(kpis.conversion)} · ${live} · ${stage}`;
}
