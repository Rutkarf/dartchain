export type MerchantVerifiedStatus =
  | 'unverified'
  | 'pending'
  | 'verified'
  | 'suspended';

export interface MerchantPublicProfile {
  shortDescription?: string;
  categoryLabel?: string;
  websiteUrl?: string;
}

export interface MerchantProfile {
  id: string;
  displayName: string;
  category?: string;
  verifiedStatus: MerchantVerifiedStatus;
  publicProfile?: MerchantPublicProfile;
}

export type PlacementCampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'active'
  | 'paused'
  | 'expired'
  | 'rejected';

export interface CampaignCreative {
  headline: string;
  body?: string;
  /** Jamais une URL de paiement. Asset public ou vide. */
  assetKey?: string;
}

export type CampaignCtaKind = 'inquiry' | 'quote' | 'reservation' | 'checkout';

export interface CampaignCta {
  kind: CampaignCtaKind;
  label: string;
}

export interface PlacementCampaign {
  id: string;
  placementId: string;
  merchantId: string;
  title: string;
  creative: CampaignCreative;
  cta: CampaignCta;
  startAt: string;
  endAt: string;
  status: PlacementCampaignStatus;
}

export interface Money {
  amount: string;
  currency: string;
}

export type PlacementCommercialModel =
  | 'inquiry'
  | 'quote'
  | 'reservation'
  | 'checkout';

export interface PlacementAvailability {
  startAt?: string;
  endAt?: string;
  remainingSlots?: number;
}

export interface PlacementOffer {
  id: string;
  placementId: string;
  commercialModel: PlacementCommercialModel;
  price?: Money;
  availability: PlacementAvailability;
  termsUrl?: string;
}
