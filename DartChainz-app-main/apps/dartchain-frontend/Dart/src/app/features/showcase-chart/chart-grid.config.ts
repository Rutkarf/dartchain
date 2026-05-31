import { ChartRange } from '../../core/models/showcase.model';
import { ChartTimeframeId } from './chart-timeframe.constants';

export type ChartGridProfileKey =
  | '24h'
  | '7d'
  | '30d'
  | '90d'
  | '1y'
  | 'ytd';

export type VerticalTickMode = number | 'max';

/** Stratégie de placement des lignes verticales (au-delà du simple espacement linéaire). */
export type VerticalTickStrategy =
  | 'even'
  | 'hourly'
  | 'year-weeks'
  | 'year-months'
  | 'decade-semiannual'
  | 'ytd-calendar';

export interface ChartGridProfile {
  key: ChartGridProfileKey;
  horizontalTickCount: number;
  /** Nombre exact de lignes verticales, ou `max` = un tick par point de données. */
  verticalTickCount: VerticalTickMode;
  verticalTickStrategy: VerticalTickStrategy;
}

export const HORIZONTAL_GRID_TICK_COUNT = 10;

export const CHART_GRID_PROFILES: Record<ChartGridProfileKey, ChartGridProfile> = {
  '24h': {
    key: '24h',
    horizontalTickCount: HORIZONTAL_GRID_TICK_COUNT,
    verticalTickCount: 24,
    verticalTickStrategy: 'hourly',
  },
  '7d': {
    key: '7d',
    horizontalTickCount: HORIZONTAL_GRID_TICK_COUNT,
    verticalTickCount: 54,
    verticalTickStrategy: 'year-weeks',
  },
  '30d': {
    key: '30d',
    horizontalTickCount: HORIZONTAL_GRID_TICK_COUNT,
    verticalTickCount: 12,
    verticalTickStrategy: 'year-months',
  },
  '90d': {
    key: '90d',
    horizontalTickCount: HORIZONTAL_GRID_TICK_COUNT,
    verticalTickCount: 4,
    verticalTickStrategy: 'even',
  },
  '1y': {
    key: '1y',
    horizontalTickCount: HORIZONTAL_GRID_TICK_COUNT,
    verticalTickCount: 20,
    verticalTickStrategy: 'decade-semiannual',
  },
  ytd: {
    key: 'ytd',
    horizontalTickCount: HORIZONTAL_GRID_TICK_COUNT,
    verticalTickCount: 24,
    verticalTickStrategy: 'ytd-calendar',
  },
};

export function resolveGridProfileKey(
  timeframeId: ChartTimeframeId,
  activeRange: ChartRange
): ChartGridProfileKey {
  switch (timeframeId) {
    case '24h':
      return '24h';
    case '7d':
      return '7d';
    case '30d':
      return '30d';
    case '90d':
      return '90d';
    case '1y':
      return '1y';
    case 'ytd':
      return 'ytd';
    case '1d':
      return '1y';
    default:
      break;
  }

  switch (activeRange) {
    case '7d':
      return '7d';
    case '30d':
      return '30d';
    case '90d':
      return '90d';
    case '365d':
      return '1y';
    default:
      return '24h';
  }
}

export function resolveGridProfile(
  timeframeId: ChartTimeframeId,
  activeRange: ChartRange
): ChartGridProfile {
  return CHART_GRID_PROFILES[resolveGridProfileKey(timeframeId, activeRange)];
}
