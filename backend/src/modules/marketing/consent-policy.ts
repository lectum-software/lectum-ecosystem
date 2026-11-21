import type { CAMPAIGN_KEYS } from "./acquisition-policy";

export type MarketingConsentPolicy = {
  acquisitionEnabled?: boolean;
  documentVersion: string | null;
  maxAgeMs: number;
  campaigns: Partial<Record<(typeof CAMPAIGN_KEYS)[number], readonly string[]>>;
};

// Policy v2 published 2026-11-21; each visitor still needs a fresh explicit choice.
// Event eligibility, external transmission and campaign catalog remain independent.
export const MARKETING_CONSENT_POLICY: MarketingConsentPolicy = {
  acquisitionEnabled: true,
  documentVersion: "lectum-meta-measurement-2026-11-21-network-context",
  maxAgeMs: 90 * 24 * 60 * 60_000,
  campaigns: {},
};

export class MarketingConsentError extends Error {
  constructor(
    readonly code:
      | "marketing_consent_unavailable"
      | "marketing_consent_conflict"
      | "marketing_consent_invalid",
    readonly status = 409,
  ) {
    super(code);
  }
}
