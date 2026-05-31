import { Injectable, signal } from '@angular/core';

export interface ChartPriceAlert {
  symbol: string;
  above: number | null;
  below: number | null;
}

const STORAGE_KEY = 'dart_chart_price_alerts';

@Injectable({ providedIn: 'root' })
export class ChartAlertsService {
  private readonly alertsState = signal<ChartPriceAlert[]>(this.load());

  readonly alerts = this.alertsState.asReadonly();
  readonly lastTrigger = signal<string | null>(null);

  setAlert(symbol: string, above: number | null, below: number | null): void {
    const normalized = symbol.trim().toUpperCase();
    const next = this.alertsState().filter((entry) => entry.symbol !== normalized);
    next.push({ symbol: normalized, above, below });
    this.persist(next);
  }

  clearAlert(symbol: string): void {
    const normalized = symbol.trim().toUpperCase();
    const next = this.alertsState().filter((entry) => entry.symbol !== normalized);
    this.persist(next);
    this.lastTrigger.set(null);
  }

  alertFor(symbol: string): ChartPriceAlert | undefined {
    const normalized = symbol.trim().toUpperCase();
    return this.alertsState().find((entry) => entry.symbol === normalized);
  }

  evaluate(symbol: string, currentPrice: number): string | null {
    const alert = this.alertFor(symbol);
    if (!alert || currentPrice <= 0) {
      return null;
    }

    if (alert.above !== null && currentPrice >= alert.above) {
      const message = `${symbol} ≥ seuil haut (${alert.above})`;
      this.lastTrigger.set(message);
      return message;
    }

    if (alert.below !== null && currentPrice <= alert.below) {
      const message = `${symbol} ≤ seuil bas (${alert.below})`;
      this.lastTrigger.set(message);
      return message;
    }

    return null;
  }

  private persist(alerts: ChartPriceAlert[]): void {
    this.alertsState.set(alerts);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
  }

  private load(): ChartPriceAlert[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return [];
      }
      return JSON.parse(raw) as ChartPriceAlert[];
    } catch {
      return [];
    }
  }
}
