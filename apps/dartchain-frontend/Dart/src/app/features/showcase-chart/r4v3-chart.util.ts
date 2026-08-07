import { LaunchProject } from '../../core/models/showcase.model';
import { MarketRecentTrade } from '../market-panel/market-panel.model';

export type R4v3ChartView = 'auto' | 'flow' | 'pulse' | 'fuel' | 'health';

export interface R4v3ChartContext {
  pointCount: number;
  volumes: number[];
  timestamps: number[];
  panelPoints: number[];
  recentTrades: MarketRecentTrade[];
  swapNewsCount: number;
  launchProjects: LaunchProject[];
  liquidityProxy: number;
}

export interface R4v3HeatmapCell {
  id: string;
  x: number;
  w: number;
  intensity: number;
}

export interface R4v3WaterfallBar {
  id: string;
  x: number;
  w: number;
  y: number;
  h: number;
  positive: boolean;
}

export interface R4v3TimelinePin {
  id: string;
  x: number;
  y: number;
  label: string;
}

export interface R4v3DepthBar {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  side: 'bid' | 'ask';
}

export interface R4v3PulseSpike {
  id: string;
  x: number;
  yTop: number;
  yBase: number;
}

export interface R4v3FlowStats {
  netLabel: string;
  buys: number;
  sells: number;
  swaps: number;
}

const NEUTRAL = 50;
const MIN_Y = 3;
const MAX_Y = 97;

function clamp(value: number, min = MIN_Y, max = MAX_Y): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeSeries(values: number[]): number[] {
  if (!values.length) {
    return [NEUTRAL];
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  let span = max - min;

  if (span === 0) {
    return values.map((_, index) => {
      const phase = (index / Math.max(values.length - 1, 1)) * Math.PI * 2;
      return NEUTRAL + Math.sin(phase) * 10;
    });
  }

  const pad = span * 0.07;
  const domainMin = min - pad;
  const domainMax = max + pad;
  const domainSpan = Math.max(domainMax - domainMin, 1e-12);

  return values.map(
    (value) => MIN_Y + ((value - domainMin) / domainSpan) * (MAX_Y - MIN_Y)
  );
}

function smoothSeries(values: number[], window = 3): number[] {
  if (values.length <= 2) {
    return [...values];
  }

  const radius = Math.max(1, Math.floor(window / 2));
  return values.map((_, index) => {
    const start = Math.max(0, index - radius);
    const end = Math.min(values.length - 1, index + radius);
    let sum = 0;
    let count = 0;
    for (let i = start; i <= end; i++) {
      sum += values[i];
      count++;
    }
    return sum / count;
  });
}

function fallbackCount(ctx: R4v3ChartContext): number {
  return Math.max(ctx.pointCount, ctx.volumes.length, ctx.panelPoints.length, 24);
}

function volumeSeries(ctx: R4v3ChartContext): number[] {
  const count = fallbackCount(ctx);
  if (ctx.volumes.length >= count) {
    return ctx.volumes.slice(0, count);
  }

  if (ctx.volumes.length > 1) {
    return resampleActivitySeries(ctx.volumes, count);
  }

  if (ctx.panelPoints.length > 1) {
    return resampleActivitySeries(ctx.panelPoints, count);
  }

  return Array.from({ length: count }, (_, index) => NEUTRAL + Math.sin(index / 3) * 4);
}

export function resampleActivitySeries(values: number[], targetCount: number): number[] {
  if (!values.length) {
    return Array.from({ length: targetCount }, () => NEUTRAL);
  }

  if (values.length === targetCount) {
    return [...values];
  }

  const last = values.length - 1;
  return Array.from({ length: targetCount }, (_, index) => {
    const position = (index / Math.max(targetCount - 1, 1)) * last;
    const lower = Math.floor(position);
    const upper = Math.min(last, lower + 1);
    const ratio = position - lower;
    return values[lower] * (1 - ratio) + values[upper] * ratio;
  });
}

function tradeSignedAmount(trade: MarketRecentTrade): number {
  const from = trade.fromToken.trim().toUpperCase();
  const to = trade.toToken.trim().toUpperCase();
  if (to === 'R4V3') {
    return trade.amountOut || trade.amountIn || 1;
  }
  if (from === 'R4V3') {
    return -(trade.amountIn || trade.amountOut || 1);
  }
  return trade.amountIn || 1;
}

function mapTradeIndices(trades: MarketRecentTrade[], timestamps: number[], count: number): Map<number, number> {
  const map = new Map<number, number>();
  if (!trades.length || !timestamps.length) {
    return map;
  }

  const start = timestamps[0];
  const end = timestamps[timestamps.length - 1] ?? start;
  const span = Math.max(end - start, 1);

  trades.forEach((trade) => {
    const ratio = Math.max(0, Math.min(1, (trade.at - start) / span));
    const index = Math.round(ratio * Math.max(count - 1, 0));
    map.set(index, (map.get(index) ?? 0) + tradeSignedAmount(trade));
  });

  return map;
}

export function buildR4v3FlowSeries(ctx: R4v3ChartContext): number[] {
  const volumes = volumeSeries(ctx);
  const count = volumes.length;
  const tradeMap = mapTradeIndices(ctx.recentTrades, ctx.timestamps, count);
  const series: number[] = [];
  let cumulative = 0;

  for (let index = 0; index < count; index++) {
    const delta =
      index === 0
        ? 0
        : (volumes[index] - volumes[index - 1]) * 0.35 + (tradeMap.get(index) ?? 0) * 0.08;
    cumulative += delta;
    series.push(NEUTRAL + cumulative);
  }

  return normalizeSeries(smoothSeries(series, 4));
}

export function buildR4v3PulseSeries(ctx: R4v3ChartContext): number[] {
  const count = fallbackCount(ctx);
  const base = Array.from({ length: count }, (_, index) => NEUTRAL + Math.sin(index / 2.8) * 1.5);
  const tradeMap = mapTradeIndices(ctx.recentTrades, ctx.timestamps, count);

  tradeMap.forEach((amount, index) => {
    const spike = Math.min(28, Math.abs(amount) * 2.5 + 6);
    base[index] += amount >= 0 ? spike : -spike;
    if (index > 0) {
      base[index - 1] += (amount >= 0 ? spike : -spike) * 0.35;
    }
    if (index < count - 1) {
      base[index + 1] += (amount >= 0 ? spike : -spike) * 0.2;
    }
  });

  const eventBoost = Math.min(ctx.swapNewsCount * 0.8, 12);
  if (count > 0) {
    base[count - 1] += eventBoost;
  }

  return normalizeSeries(smoothSeries(base.map((value) => clamp(value)), 2));
}

export function buildR4v3FuelSeries(ctx: R4v3ChartContext): number[] {
  const count = fallbackCount(ctx);
  const raisedTotal = ctx.launchProjects.reduce((sum, project) => {
    const raw = Number.parseFloat((project.raised ?? '0').replace(/[^\d.-]/g, ''));
    return sum + (Number.isFinite(raw) ? raw : 0);
  }, 0);

  const liveWeight = ctx.launchProjects.filter((project) => project.status === 'LIVE').length;
  const target = Math.max(raisedTotal, liveWeight * 1200, 2400);

  return Array.from({ length: count }, (_, index) => {
    const progress = (index + 1) / count;
    const curve = Math.pow(progress, 0.82);
    const jitter = Math.sin(index / 4) * 2;
    return MIN_Y + curve * (MAX_Y - MIN_Y) * (raisedTotal / target) + jitter;
  }).map((value) => clamp(value));
}

export function buildR4v3HealthSeries(ctx: R4v3ChartContext): number[] {
  const count = fallbackCount(ctx);
  const volumes = volumeSeries(ctx);
  const volNorm = normalizeSeries(volumes);
  const flow = buildR4v3FlowSeries(ctx);
  const pulse = buildR4v3PulseSeries(ctx);
  const fuel = buildR4v3FuelSeries(ctx);

  return Array.from({ length: count }, (_, index) => {
    const score =
      (volNorm[index] ?? NEUTRAL) * 0.28 +
      (flow[index] ?? NEUTRAL) * 0.24 +
      (pulse[index] ?? NEUTRAL) * 0.2 +
      (fuel[index] ?? NEUTRAL) * 0.18 +
      ctx.liquidityProxy * 0.1;
    return clamp(score);
  });
}

export function buildR4v3PegActivitySeries(ctx: R4v3ChartContext): number[] {
  const count = fallbackCount(ctx);
  if (ctx.panelPoints.length > 1) {
    return normalizeSeries(resampleActivitySeries(ctx.panelPoints, count));
  }
  return normalizeSeries(volumeSeries(ctx));
}

export function resolveR4v3AutoView(ctx: R4v3ChartContext): Exclude<R4v3ChartView, 'auto'> {
  const volumes = volumeSeries(ctx);
  const variance =
    volumes.length > 1
      ? Math.max(...volumes) - Math.min(...volumes)
      : 0;

  if (ctx.recentTrades.length >= 2 || ctx.swapNewsCount >= 3 || variance >= 14) {
    return 'flow';
  }

  if (ctx.launchProjects.some((project) => project.status === 'LIVE')) {
    return 'fuel';
  }

  if (ctx.swapNewsCount > 0 || ctx.recentTrades.length > 0) {
    return 'pulse';
  }

  return 'health';
}

export function buildR4v3Series(ctx: R4v3ChartContext, view: R4v3ChartView): number[] {
  const resolved = view === 'auto' ? resolveR4v3AutoView(ctx) : view;

  switch (resolved) {
    case 'flow':
      return buildR4v3FlowSeries(ctx);
    case 'pulse':
      return buildR4v3PulseSeries(ctx);
    case 'fuel':
      return buildR4v3FuelSeries(ctx);
    case 'health':
      return buildR4v3HealthSeries(ctx);
    default:
      return buildR4v3PegActivitySeries(ctx);
  }
}

export function buildR4v3Heatmap(
  ctx: R4v3ChartContext,
  width: number,
  inset: number
): R4v3HeatmapCell[] {
  const volumes = volumeSeries(ctx);
  const plotWidth = width - inset;
  const cellCount = Math.min(Math.max(volumes.length, 12), 36);
  const max = Math.max(...volumes, 1);

  return Array.from({ length: cellCount }, (_, index) => {
    const sourceIndex = Math.round((index / Math.max(cellCount - 1, 1)) * (volumes.length - 1));
    const intensity = (volumes[sourceIndex] ?? NEUTRAL) / max;
    const w = plotWidth / cellCount;
    return {
      id: `heat-${index}`,
      x: inset + index * w,
      w: Math.max(w - 0.15, 0.4),
      intensity: clamp(intensity * 100, 4, 100),
    };
  });
}

export function buildR4v3Waterfall(
  ctx: R4v3ChartContext,
  width: number,
  height: number,
  inset: number
): R4v3WaterfallBar[] {
  const volumes = volumeSeries(ctx);
  const count = Math.min(volumes.length, 28);
  const plotWidth = width - inset;
  const barWidth = plotWidth / Math.max(count, 1);
  const baseline = height * 0.58;
  const tradeMap = mapTradeIndices(ctx.recentTrades, ctx.timestamps, count);

  return Array.from({ length: count }, (_, index) => {
    const delta =
      index === 0
        ? 0
        : (volumes[index] - volumes[index - 1]) * 0.22 + (tradeMap.get(index) ?? 0) * 0.04;
    const positive = delta >= 0;
    const h = clamp(Math.abs(delta) * 1.4 + 1.2, 1.2, height * 0.35);
    return {
      id: `wf-${index}`,
      x: inset + index * barWidth + barWidth * 0.12,
      w: Math.max(barWidth * 0.76, 0.35),
      y: positive ? baseline - h : baseline,
      h,
      positive,
    };
  });
}

export function buildR4v3TimelinePins(
  points: number[],
  ctx: R4v3ChartContext,
  width: number,
  inset: number
): R4v3TimelinePin[] {
  if (!points.length) {
    return [];
  }

  const plotWidth = width - inset;
  const last = Math.max(points.length - 1, 1);
  const pins: R4v3TimelinePin[] = [];

  ctx.recentTrades.slice(0, 4).forEach((trade, index) => {
    const ratio = 1 - index / Math.max(ctx.recentTrades.length, 4);
    const pointIndex = Math.round(ratio * last);
    const x = inset + (pointIndex / last) * plotWidth;
    const y = chartYFromPoint(points[pointIndex] ?? NEUTRAL, 64);
    pins.push({
      id: `trade-${trade.id}`,
      x,
      y,
      label: `${trade.fromToken}→${trade.toToken}`,
    });
  });

  if (ctx.swapNewsCount > 0) {
    const pointIndex = last;
    pins.push({
      id: 'swap-news',
      x: inset + plotWidth,
      y: chartYFromPoint(points[pointIndex] ?? NEUTRAL, 64),
      label: `${ctx.swapNewsCount} swaps`,
    });
  }

  return pins;
}

export function buildR4v3PulseSpikes(
  points: number[],
  ctx: R4v3ChartContext,
  width: number,
  height: number,
  inset: number
): R4v3PulseSpike[] {
  if (!points.length) {
    return [];
  }

  const plotWidth = width - inset;
  const last = Math.max(points.length - 1, 1);
  const tradeMap = mapTradeIndices(ctx.recentTrades, ctx.timestamps, points.length);
  const baseline = height * 0.55;

  return [...tradeMap.entries()].slice(0, 6).map(([index, amount]) => {
    const x = inset + (index / last) * plotWidth;
    const amplitude = clamp(Math.abs(amount) * 2.2 + 8, 8, height * 0.42);
    return {
      id: `spike-${index}`,
      x,
      yTop: baseline - amplitude,
      yBase: baseline,
    };
  });
}

export function buildR4v3DepthBars(
  width: number,
  height: number,
  inset: number,
  liquidityProxy: number
): R4v3DepthBar[] {
  const plotWidth = width - inset;
  const center = inset + plotWidth / 2;
  const depth = clamp(liquidityProxy, 20, 100);
  const barCount = 5;
  const bars: R4v3DepthBar[] = [];

  for (let index = 0; index < barCount; index++) {
    const factor = 1 - index / (barCount + 1);
    const h = (height * 0.16) * factor * (depth / 100);
    const offset = (index + 1) * (plotWidth * 0.07);
    bars.push({
      id: `bid-${index}`,
      x: center - offset,
      y: height - h,
      w: plotWidth * 0.045,
      h,
      side: 'bid',
    });
    bars.push({
      id: `ask-${index}`,
      x: center + offset - plotWidth * 0.045,
      y: height - h,
      w: plotWidth * 0.045,
      h,
      side: 'ask',
    });
  }

  return bars;
}

export function computeR4v3FlowStats(ctx: R4v3ChartContext): R4v3FlowStats {
  let buys = 0;
  let sells = 0;

  ctx.recentTrades.forEach((trade) => {
    const signed = tradeSignedAmount(trade);
    if (signed >= 0) {
      buys += Math.abs(signed);
    } else {
      sells += Math.abs(signed);
    }
  });

  const net = buys - sells;
  const swaps = ctx.recentTrades.length + ctx.swapNewsCount;
  const netLabel =
    net === 0 ? 'Neutre' : net > 0 ? `+${formatCompact(net)}` : `-${formatCompact(Math.abs(net))}`;

  return { netLabel, buys, sells, swaps };
}

export function computeR4v3HealthScore(ctx: R4v3ChartContext): number {
  const flow = computeR4v3FlowStats(ctx);
  const liveLaunches = ctx.launchProjects.filter((project) => project.status === 'LIVE').length;
  const volumes = volumeSeries(ctx);
  const variance =
    volumes.length > 1 ? Math.max(...volumes) - Math.min(...volumes) : 0;

  const score =
    42 +
    Math.min(flow.swaps * 4, 24) +
    Math.min(liveLaunches * 8, 24) +
    Math.min(variance * 0.35, 10) +
    ctx.liquidityProxy * 0.08;

  return Math.round(Math.max(35, Math.min(99, score)));
}

function formatCompact(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return value.toFixed(value >= 10 ? 0 : 1);
}

function chartYFromPoint(point: number, height: number): number {
  return height - (point / 100) * height;
}

export function r4v3ViewLabel(view: R4v3ChartView): string {
  switch (view) {
    case 'auto':
      return 'Auto';
    case 'flow':
      return 'Flux';
    case 'pulse':
      return 'Pulse';
    case 'fuel':
      return 'Fuel';
    case 'health':
      return 'Santé';
    default:
      return view;
  }
}

/** Description courte affichée au survol des modes du graphique R4V3. */
export function r4v3ViewHint(view: R4v3ChartView): string {
  switch (view) {
    case 'auto':
      return 'Choisit automatiquement le mode le plus adapté à l’activité du réseau.';
    case 'flow':
      return 'Vue Flux — pression nette des achats et ventes R4V3 sur la période.';
    case 'pulse':
      return 'Pulse — swaps récents et événements on-chain du réseau.';
    case 'fuel':
      return 'Fuel LaunchLab — volume et momentum des projets listés.';
    case 'health':
      return 'Santé — niveau d’activité global quand le réseau est calme.';
    default:
      return '';
  }
}

export function r4v3ResolvedViewLabel(view: R4v3ChartView, ctx: R4v3ChartContext): string {
  if (view !== 'auto') {
    return r4v3ViewLabel(view);
  }
  return `Auto · ${r4v3ViewLabel(resolveR4v3AutoView(ctx))}`;
}

export function r4v3AxisHint(view: R4v3ChartView, ctx: R4v3ChartContext): string {
  const resolved = view === 'auto' ? resolveR4v3AutoView(ctx) : view;
  switch (resolved) {
    case 'flow':
      return 'Pression nette';
    case 'pulse':
      return 'Activité réseau';
    case 'fuel':
      return 'R4V3 LaunchLab';
    case 'health':
      return 'Indice santé';
    default:
      return 'Activité';
  }
}
