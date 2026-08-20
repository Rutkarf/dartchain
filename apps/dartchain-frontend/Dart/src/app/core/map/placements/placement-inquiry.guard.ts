export interface InquiryLockState {
  inFlightPlacementId: string | null;
  lastSubmittedKey: string | null;
}

export type InquiryBlockReason = 'in-flight' | 'duplicate-key' | 'cta-disabled';

export function inquiryDedupeKey(
  placementId: string,
  contactEmail?: string
): string {
  const email = (contactEmail ?? '').trim().toLowerCase();
  return `${placementId}:${email}`;
}

export function canStartInquiry(
  state: InquiryLockState,
  placementId: string,
  ctaEnabled: boolean,
  contactEmail?: string
): { ok: true } | { ok: false; reason: InquiryBlockReason } {
  if (!ctaEnabled) return { ok: false, reason: 'cta-disabled' };
  if (state.inFlightPlacementId) return { ok: false, reason: 'in-flight' };
  const key = inquiryDedupeKey(placementId, contactEmail);
  if (state.lastSubmittedKey === key) return { ok: false, reason: 'duplicate-key' };
  return { ok: true };
}

export function lockInquiry(
  state: InquiryLockState,
  placementId: string
): InquiryLockState {
  return { ...state, inFlightPlacementId: placementId };
}

export function unlockInquiry(
  state: InquiryLockState,
  submittedKey?: string
): InquiryLockState {
  return {
    inFlightPlacementId: null,
    lastSubmittedKey: submittedKey ?? state.lastSubmittedKey,
  };
}
