import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FocusTrapDirective } from '../../core/directives/focus-trap.directive';
import { OSM_ODBL_ATTRIBUTION } from '../../core/map/marseille-twin/osm-attribution';
import { PlacementFacade } from '../../core/map/placements/placement.facade';
import type { PlacementInventoryStatus } from '../../core/map/placements/placement.model';

const STATUS_LABEL: Record<PlacementInventoryStatus, string> = {
  available: 'Disponible',
  reserved: 'Réservé',
  active: 'Campagne active',
  paused: 'En pause',
  expired: 'Expiré',
  unavailable: 'Indisponible',
};

@Component({
  selector: 'app-placement-details-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FocusTrapDirective],
  templateUrl: './placement-details-panel.html',
  styleUrl: './placement-details-panel.css',
})
export class PlacementDetailsPanel {
  readonly facade = inject(PlacementFacade);
  readonly osmAttribution = OSM_ODBL_ATTRIBUTION;

  statusLabel(status: PlacementInventoryStatus): string {
    return STATUS_LABEL[status];
  }

  close(): void {
    this.facade.select(null);
  }

  submit(email: string, message: string): void {
    void this.facade.submitInquiry({
      contactEmail: email.trim() || undefined,
      message: message.trim() || undefined,
      locale: 'fr',
    });
  }
}
