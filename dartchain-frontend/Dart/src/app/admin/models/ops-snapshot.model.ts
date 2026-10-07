export interface OpsAlert {
  level: 'warn' | 'error' | string;
  code: string;
  message: string;
}

export interface OpsEvent {
  at: string;
  type: string;
  detail: string;
}

export interface OpsSnapshot {
  collectedAt: string;
  phase: string;
  counters: Record<string, number>;
  gauges: Record<string, number>;
  latency: Record<string, number>;
  metadata: Record<string, unknown>;
  alerts: OpsAlert[];
  recentEvents: OpsEvent[];
}
