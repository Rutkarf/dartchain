import { emitPlacementTelemetry } from './placement-telemetry';

describe('placement-telemetry', () => {
  it('accepte des événements sans PII et ne throw pas', () => {
    expect(() =>
      emitPlacementTelemetry({ name: 'placement_selected', placementId: 'dev-placement-01' })
    ).not.toThrow();
  });
});
