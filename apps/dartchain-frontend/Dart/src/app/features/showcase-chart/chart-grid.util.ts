import { ChartAxisTick, formatAxisLabel } from './chart-axis.util';
import { ChartGridProfile, ChartGridProfileKey } from './chart-grid.config';
import { CoingeckoGranularity } from './chart-timeframe.constants';
import { priceToSvgYGrid } from './chart-display.util';

const MS_HOUR = 60 * 60_000;
const MS_DAY = 24 * MS_HOUR;

export interface PriceGridLevel {
  price: number;
  y: number;
  label: string;
}

export interface VerticalGridLine {
  id: string;
  x: number;
}

export interface HorizontalGridLine {
  id: string;
  y: number;
}

/** Positions X (0–100) des lignes verticales du cadrillage. */
export function buildVerticalGridPositions(
  timestamps: number[],
  profile: ChartGridProfile
): number[] {
  if (!timestamps.length) {
    return [];
  }

  const start = timestamps[0];
  const end = timestamps[timestamps.length - 1];

  if (start === end) {
    return [0];
  }

  let tickTimes = buildVerticalTickTimestamps(start, end, timestamps, profile);
  const targetCount = profile.verticalTickCount;

  if (typeof targetCount === 'number' && targetCount > 1 && tickTimes.length !== targetCount) {
    tickTimes = buildEvenTickTimestamps(start, end, targetCount);
  }

  return tickTimes.map((ts) => timestampToPercent(ts, start, end));
}

/** Marge gauche (%) : pas de ligne sur le bord gauche (chevauche les prix). */
const VERTICAL_GRID_LEFT_INSET = 2;

export function buildVerticalGridLines(
  timestamps: number[],
  profile: ChartGridProfile
): VerticalGridLine[] {
  const positions = buildVerticalGridPositions(timestamps, profile);

  return positions
    .filter((x) => x > 0.8)
    .map((x, index) => ({
      id: `v-${profile.key}-${index}`,
      x: clampVerticalGridX(x),
    }));
}

export function buildHorizontalGridLines(
  levels: PriceGridLevel[],
  profileKey: ChartGridProfileKey
): HorizontalGridLine[] {
  return levels.map((level, index) => ({
    id: `h-${profileKey}-${index}`,
    y: clampGridCoord(level.y),
  }));
}

/** Évite le clipping SVG sur les bords (0 / 100). */
function clampGridCoord(value: number): number {
  return Math.min(99.98, Math.max(0.02, value));
}

function clampVerticalGridX(value: number): number {
  return Math.min(99.98, Math.max(VERTICAL_GRID_LEFT_INSET, value));
}

export function buildPriceGridLevels(
  low: number,
  high: number,
  tickCount: number,
  chartHeight: number,
  formatPrice: (value: number) => string
): PriceGridLevel[] {
  if (tickCount < 1) {
    return [];
  }

  if (tickCount === 1) {
    return [
      {
        price: high,
        y: priceToSvgYGrid(high, low, high, chartHeight),
        label: formatPrice(high),
      },
    ];
  }

  return Array.from({ length: tickCount }, (_, index) => {
    const ratio = index / (tickCount - 1);
    const price = high - (high - low) * ratio;
    return {
      price,
      y: priceToSvgYGrid(price, low, high, chartHeight),
      label: formatPrice(price),
    };
  });
}

export function buildHorizontalAxisTicks(
  timestamps: number[],
  profile: ChartGridProfile,
  granularity: CoingeckoGranularity
): ChartAxisTick[] {
  if (!timestamps.length) {
    return [];
  }

  const start = timestamps[0];
  const end = timestamps[timestamps.length - 1];
  const spanMs = Math.max(1, end - start);
  const tickTimes = buildVerticalTickTimestamps(start, end, timestamps, profile);

  return tickTimes.map((ts, index) => ({
    id: `x-${profile.key}-${index}`,
    index,
    position: timestampToPercent(ts, start, end),
    label: formatGridAxisLabel(ts, profile.key, granularity, start, spanMs),
    showLabel: true,
  }));
}

function buildVerticalTickTimestamps(
  start: number,
  end: number,
  timestamps: number[],
  profile: ChartGridProfile
): number[] {
  const mode = profile.verticalTickCount;

  if (mode === 'max') {
    return [...timestamps];
  }

  const count = Math.max(1, mode);

  switch (profile.verticalTickStrategy) {
    case 'hourly':
      return buildEvenTickTimestamps(start, end, count);
    case 'year-weeks':
      return buildYearWeekTickTimestamps(start, end, count);
    case 'year-months':
      return buildYearMonthTickTimestamps(start, end, count);
    case 'decade-semiannual':
      return buildDecadeSemiannualTickTimestamps(start, end, count);
    case 'ytd-calendar':
      return buildYtdCalendarTickTimestamps(start, end, count);
    case 'even':
    default:
      break;
  }

  return buildEvenTickTimestamps(start, end, count);
}

/** 24 h : une ligne par heure sur la fenêtre affichée. */
function buildHourlyTickTimestamps(start: number, end: number, count: number): number[] {
  if (end <= start) {
    return [start];
  }

  if (count <= 1) {
    return [start];
  }

  const step = MS_HOUR;
  const alignedStart = Math.ceil(start / step) * step;
  const ticks: number[] = [];

  for (let t = alignedStart; t <= end && ticks.length < count; t += step) {
    if (t <= start) {
      continue;
    }
    ticks.push(t);
  }

  if (ticks.length >= count) {
    return ticks.slice(0, count);
  }

  return buildEvenTickTimestamps(start, end, count);
}

/** 7 j : 54 repères (une « semaine » sur 54 dans l’année), répartis sur la fenêtre visible. */
function buildYearWeekTickTimestamps(dataStart: number, dataEnd: number, weekCount: number): number[] {
  return buildEvenTickTimestamps(dataStart, dataEnd, weekCount);
}

/** 1 mois : 12 repères mensuels répartis sur la fenêtre visible. */
function buildYearMonthTickTimestamps(dataStart: number, dataEnd: number, monthCount: number): number[] {
  return buildEvenTickTimestamps(dataStart, dataEnd, monthCount);
}

function buildEvenTickTimestamps(start: number, end: number, count: number): number[] {
  if (count <= 1 || end <= start) {
    return [start + (end - start) / 2];
  }

  return Array.from(
    { length: count },
    (_, index) => start + ((index + 1) / (count + 1)) * (end - start)
  );
}

/** 1 an : 20 lignes, une tous les 6 mois sur 10 ans (repli linéaire sur la fenêtre visible). */
function buildDecadeSemiannualTickTimestamps(
  dataStart: number,
  dataEnd: number,
  count: number
): number[] {
  if (count <= 1) {
    return [dataEnd];
  }

  const decadeMs = 10 * 365.25 * MS_DAY;
  const anchorEnd = dataEnd;
  const decadeStart = anchorEnd - decadeMs;
  const ticks = Array.from(
    { length: count },
    (_, index) => decadeStart + (index / (count - 1)) * decadeMs
  );
  return buildEvenTickTimestamps(dataStart, dataEnd, count);
}

/** YTD : 24 lignes du 1er janvier à aujourd’hui, réparties sur la fenêtre visible. */
function buildYtdCalendarTickTimestamps(dataStart: number, dataEnd: number, count: number): number[] {
  const now = Date.now();
  const yearStart = new Date(new Date(now).getFullYear(), 0, 1).getTime();
  const rangeStart = Math.max(dataStart, yearStart);
  const rangeEnd = Math.min(now, dataEnd);

  if (count <= 1 || rangeEnd <= rangeStart) {
    return buildEvenTickTimestamps(dataStart, dataEnd, count);
  }

  return buildEvenTickTimestamps(rangeStart, rangeEnd, count);
}

function timestampToPercent(ts: number, start: number, end: number): number {
  if (end <= start) {
    return 0;
  }
  return ((ts - start) / (end - start)) * 100;
}

function formatGridAxisLabel(
  ts: number,
  profileKey: ChartGridProfileKey,
  granularity: CoingeckoGranularity,
  rangeStart: number,
  spanMs: number
): string {
  const date = new Date(ts);

  switch (profileKey) {
    case '24h':
      return date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    case '7d':
      if (spanMs <= 2 * MS_DAY) {
        return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false });
      }
      return date.toLocaleDateString('fr-FR', { weekday: 'short', hour: '2-digit', hour12: false });
    case '30d':
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    case '90d':
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    case '1y':
    case 'ytd':
      return date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' });
    default:
      return formatAxisLabel(ts, granularity, rangeStart, spanMs);
  }
}
