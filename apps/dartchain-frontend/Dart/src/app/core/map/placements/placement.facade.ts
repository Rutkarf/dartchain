import { Injectable, inject, signal } from '@angular/core';

import type { PlacementInquiryRequest } from './inquiry.model';
import type { PlacementBuilding, SponsoredPlacement } from './placement.model';
import type { MerchantProfile, PlacementCampaign, PlacementOffer } from './commercial.model';
import {
  PlacementApiRepository,
  type MapBoundsQuery,
  type PlacementListResult,
} from './placement-api.repository';
import {
  canStartInquiry,
  inquiryDedupeKey,
  lockInquiry,
  unlockInquiry,
  type InquiryLockState,
} from './placement-inquiry.guard';
import { isInquiryCtaEnabled } from './placement-rules';
import { emitPlacementTelemetry } from './placement-telemetry';
import type { PlacementCatalog } from './placement.mapper';

export type PlacementLoadState = 'idle' | 'loading' | 'ready' | 'error';

@Injectable({ providedIn: 'root' })
export class PlacementFacade {
  private readonly repo = inject(PlacementApiRepository);

  readonly loadState = signal<PlacementLoadState>('idle');
  readonly errorMessage = signal<string | null>(null);
  readonly catalog = signal<PlacementCatalog | null>(null);
  readonly selectedPlacementId = signal<string | null>(null);
  readonly inquiryError = signal<string | null>(null);
  readonly inquiryBusy = signal(false);
  readonly inquiryReceived = signal(false);

  private inquiryLock: InquiryLockState = {
    inFlightPlacementId: null,
    lastSubmittedKey: null,
  };

  async load(bounds?: MapBoundsQuery): Promise<PlacementListResult> {
    this.loadState.set('loading');
    this.errorMessage.set(null);
    const result = await this.repo.listPlacements(bounds);
    this.catalog.set(result.catalog);
    if (!result.catalog) {
      this.loadState.set('error');
      this.errorMessage.set(result.error);
    } else {
      this.loadState.set('ready');
    }
    return result;
  }

  select(placementId: string | null): void {
    this.selectedPlacementId.set(placementId);
    this.inquiryError.set(null);
    this.inquiryReceived.set(false);
    if (placementId) {
      emitPlacementTelemetry({ name: 'placement_selected', placementId });
    }
  }

  selectedPlacement(): SponsoredPlacement | null {
    const id = this.selectedPlacementId();
    if (!id) return null;
    return this.catalog()?.placements.find((item) => item.id === id) ?? null;
  }

  selectedBuilding(): PlacementBuilding | null {
    const placement = this.selectedPlacement();
    if (!placement) return null;
    return (
      this.catalog()?.buildings.find((item) => item.id === placement.buildingId) ??
      null
    );
  }

  selectedMerchant(): MerchantProfile | undefined {
    const placement = this.selectedPlacement();
    if (!placement?.merchantId) return undefined;
    return this.catalog()?.merchants.find((item) => item.id === placement.merchantId);
  }

  selectedCampaign(): PlacementCampaign | undefined {
    const placement = this.selectedPlacement();
    if (!placement?.campaignId) return undefined;
    return this.catalog()?.campaigns.find((item) => item.id === placement.campaignId);
  }

  selectedOffer(): PlacementOffer | undefined {
    const placement = this.selectedPlacement();
    if (!placement) return undefined;
    return this.catalog()?.offers.find((item) => item.placementId === placement.id);
  }

  inquiryCtaEnabled(): boolean {
    const building = this.selectedBuilding();
    const placement = this.selectedPlacement();
    if (!building || !placement) return false;
    return isInquiryCtaEnabled(
      building,
      placement,
      this.selectedOffer(),
      this.selectedCampaign()
    );
  }

  inquiryInFlight(): boolean {
    return this.inquiryLock.inFlightPlacementId !== null;
  }

  async submitInquiry(
    input: Omit<PlacementInquiryRequest, 'placementId'>
  ): Promise<boolean> {
    const placement = this.selectedPlacement();
    if (!placement) {
      this.inquiryError.set('Aucun emplacement sélectionné.');
      return false;
    }

    const gate = canStartInquiry(
      this.inquiryLock,
      placement.id,
      this.inquiryCtaEnabled(),
      input.contactEmail
    );
    if (!gate.ok) {
      this.inquiryError.set(
        gate.reason === 'in-flight'
          ? 'Demande déjà en cours.'
          : gate.reason === 'duplicate-key'
            ? 'Demande déjà envoyée pour cet emplacement.'
            : 'Demande indisponible pour cet emplacement.'
      );
      return false;
    }

    this.inquiryLock = lockInquiry(this.inquiryLock, placement.id);
    this.inquiryBusy.set(true);
    this.inquiryError.set(null);
    this.inquiryReceived.set(false);
    try {
      const result = await this.repo.submitInquiry({
        ...input,
        placementId: placement.id,
      });
      if (!result.response) {
        this.inquiryError.set(result.error ?? 'Demande non transmise.');
        emitPlacementTelemetry({ name: 'inquiry_failed', placementId: placement.id });
        return false;
      }
      if (result.response.status !== 'received') {
        this.inquiryError.set(result.response.message ?? 'Demande refusée.');
        emitPlacementTelemetry({ name: 'inquiry_failed', placementId: placement.id });
        return false;
      }
      this.inquiryLock = unlockInquiry(
        this.inquiryLock,
        inquiryDedupeKey(placement.id, input.contactEmail)
      );
      emitPlacementTelemetry({ name: 'inquiry_submitted', placementId: placement.id });
      this.inquiryReceived.set(true);
      return true;
    } finally {
      this.inquiryBusy.set(false);
      if (this.inquiryLock.inFlightPlacementId === placement.id) {
        this.inquiryLock = unlockInquiry(this.inquiryLock);
      }
    }
  }
}
