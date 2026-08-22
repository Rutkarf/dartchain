export type PlacementInquiryStatus = 'received' | 'rejected';

export interface PlacementInquiryRequest {
  placementId: string;
  message?: string;
  contactEmail?: string;
  locale?: string;
  userId?: string;
}

export interface PlacementInquiryResponse {
  inquiryId: string;
  status: PlacementInquiryStatus;
  message?: string;
}

/** `received` n’implique jamais qu’un emplacement est acquis ou réservé. */
export function inquiryImpliesReservation(
  _response: PlacementInquiryResponse
): boolean {
  return false;
}
