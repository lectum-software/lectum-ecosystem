import { AttributionRepository } from "@/modules/marketing/attribution-repository";
import { MarketingConsentRepository } from "@/modules/marketing/consent-repository";
import type { ConsentDTO } from "../DTOs";

export const status = (d: ConsentDTO) => new MarketingConsentRepository().status(d.auth.id);
export const grant = (d: ConsentDTO) => new MarketingConsentRepository().grant(d.auth.id, d.b);
export const revoke = (d: ConsentDTO) => new MarketingConsentRepository().revoke(d.auth.id);
export const touch = async (d: ConsentDTO) => {
  await new AttributionRepository().touchUser(d.auth.id, {
    expected_revision: d.b.expected_revision,
    campaigns: d.b.campaigns ?? {},
  });
  return new MarketingConsentRepository().status(d.auth.id);
};
