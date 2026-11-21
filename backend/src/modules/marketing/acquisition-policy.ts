export const CAMPAIGN_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;
type CampaignKey = (typeof CAMPAIGN_KEYS)[number];
export type CampaignAttribution = Partial<Record<CampaignKey, string>>;
export type AdvertisingConsent = {
  purpose: "meta_ads_measurement";
  documentVersion: string;
  grantedAt: number;
  expiresAt: number;
  revokedAt: number | null;
};

export function hasAdvertisingConsent(consent: AdvertisingConsent | null, now: number) {
  return Boolean(
    consent &&
      consent.purpose === "meta_ads_measurement" &&
      consent.documentVersion.trim() &&
      consent.revokedAt === null &&
      Number.isFinite(now) &&
      Number.isFinite(consent.grantedAt) &&
      Number.isFinite(consent.expiresAt) &&
      consent.grantedAt <= now &&
      consent.expiresAt > now,
  );
}

// A regex cannot establish whether a campaign name reveals a health condition.
// Values must also belong to a server-controlled, compliance-reviewed catalog.
export function permittedCampaignAttribution(
  input: Record<string, unknown>,
  approvedValues: Partial<Record<CampaignKey, readonly string[]>>,
  consent: AdvertisingConsent | null,
  now: number,
): CampaignAttribution {
  if (!hasAdvertisingConsent(consent, now)) return {};
  const result: CampaignAttribution = {};
  for (const key of CAMPAIGN_KEYS) {
    const value = input[key];
    if (
      typeof value === "string" &&
      /^[A-Za-z0-9_-]{1,128}$/.test(value) &&
      approvedValues[key]?.includes(value)
    )
      result[key] = value;
  }
  return result;
}

// Identifier collection requires independent approval; UTMs or consent alone do
// not make fbclid eligible. No cookie/storage is created by this function.
export function permittedFacebookClickId(
  value: unknown,
  identifierApproved: boolean,
  consent: AdvertisingConsent | null,
  now: number,
) {
  return identifierApproved &&
    hasAdvertisingConsent(consent, now) &&
    typeof value === "string" &&
    /^[A-Za-z0-9_-]{1,512}$/.test(value)
    ? value
    : null;
}
