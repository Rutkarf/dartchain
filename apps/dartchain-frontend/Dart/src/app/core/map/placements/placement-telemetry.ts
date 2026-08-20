export type PlacementTelemetryEvent =
  | { name: 'placement_selected'; placementId: string }
  | { name: 'inquiry_submitted'; placementId: string }
  | { name: 'inquiry_failed'; placementId: string };

/** Adaptateur no-op — pas de PII (email, message) dans les événements. */
export function emitPlacementTelemetry(_event: PlacementTelemetryEvent): void {}
